/**
 * Admin activity log: a line for each change made in the panel to hotels, vendors (panel
 * accounts), website users, blogs and settings, plus new guest sign-ups. Super admins read it from
 * the bell in the panel's top bar (`GET /api/panel/activity`).
 *
 * Entries live in the Firestore collection `activity_logs` (documented in lib/db/schema.ts) and are
 * written and read with firebase-admin directly: the data layer sorts in memory, and a log only
 * ever needs "the newest N", which Firestore answers with orderBy + limit on one indexed field.
 *
 * `logActivity` never throws and never slows the action down: the write runs after the response
 * (next/server `after`), and a failure is only logged.
 */
import { randomUUID } from 'node:crypto'
import { after } from 'next/server'
import { adminFirestore } from '../firebase/admin'
import { createClient } from '../db/server'
import { getAdminRole } from '../utils/roles'
import { serverLog } from '../utils/server-log'
import { formatPhone } from '../utils/phone'

const COLLECTION = 'activity_logs'
const KEEP_DAYS = 180
/** On about 1 write in 20, entries older than KEEP_DAYS are cleared (at most 200 a time) */
const PRUNE_CHANCE = 0.05
/** At most this many changed fields per entry, each value at most MAX_VALUE characters */
const MAX_CHANGES = 30
const MAX_VALUE = 220

export type ActivityEntity = 'hotel' | 'vendor' | 'user' | 'blog' | 'settings'
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'status'
  | 'featured'
  | 'unfeatured'
  | 'disabled'
  | 'enabled'
  | 'signed_up'

export interface ActivityEntry {
  id: string
  created_at: string
  actor_id: string | null
  actor_name: string
  actor_role: string | null
  entity_type: ActivityEntity
  entity_id: string | null
  entity_label: string | null
  action: ActivityAction
  /** One line, e.g. "Updated Ocean Pearl: description, photos" */
  summary: string
  /** Panel path under ADMIN_PATH ("/hotels/<id>"), or null */
  href: string | null
  /** What changed, field by field (updates); empty for entries without details */
  changes: ActivityChange[]
}

/** One changed field: its label and the values before and after, as display text (null = empty) */
export interface ActivityChange {
  field: string
  from: string | null
  to: string | null
}

interface Actor {
  id: string | null
  name: string
  role: string | null
}

export interface LogActivityInput {
  entity: ActivityEntity
  action: ActivityAction
  summary: string
  entityId?: string | null
  label?: string | null
  href?: string | null
  /** Field-by-field details (see diffChanges) */
  changes?: ActivityChange[]
  /** Who did it; by default the signed-in user (pass it for a sign-up, before any session exists) */
  actor?: Actor
}

/** The signed-in user as the log names them: their name, else mobile number, else email */
async function currentActor(): Promise<Actor> {
  try {
    const db = await createClient()
    const {
      data: { user },
    } = await db.auth.getUser()
    if (!user) return { id: null, name: 'System', role: null }
    const meta = user.user_metadata ?? {}
    const name =
      meta.full_name ||
      [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
      (meta.phone ? formatPhone(meta.phone) : '') ||
      user.email ||
      'Unknown'
    return { id: user.id, name, role: getAdminRole(user) ?? 'guest' }
  } catch {
    return { id: null, name: 'System', role: null }
  }
}

async function pruneOldEntries() {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const old = await adminFirestore().collection(COLLECTION).where('created_at', '<', cutoff).limit(200).get()
  if (old.empty) return
  const batch = adminFirestore().batch()
  old.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
}

/** Records one change. Safe to call from any server action: it never throws */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const actor = input.actor ?? (await currentActor())
    const entry: ActivityEntry = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      entity_type: input.entity,
      entity_id: input.entityId ?? null,
      entity_label: input.label?.trim() || null,
      action: input.action,
      summary: input.summary.trim().slice(0, 300),
      href: input.href ?? null,
      changes: (input.changes ?? []).slice(0, MAX_CHANGES),
    }

    const write = async () => {
      try {
        // NULL columns aren't stored (as in the data layer)
        const doc = Object.fromEntries(
          Object.entries(entry).filter(([, v]) => v !== null && !(Array.isArray(v) && v.length === 0))
        )
        await adminFirestore().collection(COLLECTION).doc(entry.id).set(doc)
        if (Math.random() < PRUNE_CHANCE) await pruneOldEntries()
      } catch (error) {
        serverLog.warn('Activity log write failed:', error)
      }
    }

    try {
      after(write)
    } catch {
      // Outside a request (scripts): write now
      await write()
    }
  } catch (error) {
    serverLog.warn('Activity log skipped:', error)
  }
}

/** The newest entries, newest first; `before` (an entry's created_at) pages back */
export async function listActivity({ limit = 40, before }: { limit?: number; before?: string } = {}): Promise<ActivityEntry[]> {
  let query = adminFirestore().collection(COLLECTION).orderBy('created_at', 'desc')
  if (before) query = query.startAfter(before)
  const snapshot = await query.limit(Math.min(Math.max(limit, 1), 100)).get()
  return snapshot.docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      created_at: d.created_at,
      actor_id: d.actor_id ?? null,
      actor_name: d.actor_name ?? 'Unknown',
      actor_role: d.actor_role ?? null,
      entity_type: d.entity_type,
      entity_id: d.entity_id ?? null,
      entity_label: d.entity_label ?? null,
      action: d.action,
      summary: d.summary ?? '',
      href: d.href ?? null,
      changes: Array.isArray(d.changes) ? d.changes : [],
    } as ActivityEntry
  })
}

/** Column → label shown in the activity log ("Address line 1", "Cancellation policy") */
const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  short_description: 'Short description',
  star_rating: 'Star rating',
  property_type: 'Stay type',
  chain_brand: 'Brand',
  address_line_1: 'Address line 1',
  address_line_2: 'Address line 2',
  postal_code: 'PIN code',
  latitude: 'Latitude',
  longitude: 'Longitude',
  location_rating: 'Location rating',
  check_in_from_time: 'Check-in from',
  check_in_to_time: 'Check-in until',
  check_out_time: 'Check-out time',
  advance_notice_required: 'Advance notice required',
  minimum_age_check_in: 'Minimum check-in age',
  cancellation_policy_text: 'Cancellation policy',
  child_policy_text: 'Child policy',
  extra_bed_policy_text: 'Extra bed policy',
  pet_policy_text: 'Pet policy',
  nearby_places: 'Nearby places',
  is_featured: 'Featured on homepage',
  featured_image: 'Cover photo',
  meta_title: 'SEO title',
  meta_description: 'SEO description',
  published_at: 'Publish date',
  owner_id: 'Owner',
}

const IGNORED_FIELDS = new Set(['id', 'updated_at', 'created_at', 'slug'])

export function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  const words = key.replace(/_/g, ' ').replace(/id/i, 'ID').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** A value as comparable text: empty → null, times without :00 seconds, objects as JSON */
function comparable(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return null
    return /^\d{2}:\d{2}:00$/.test(text) ? text.slice(0, 5) : text
  }
  if (Array.isArray(value) && value.length === 0) return null
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** A value as short display text for the log (HTML stripped, lists joined, long text cut) */
function displayValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  let text: string
  if (typeof value === 'boolean') text = value ? 'Yes' : 'No'
  else if (Array.isArray(value)) {
    if (value.length === 0) return null
    text = value
      .map((item: any) =>
        key === 'nearby_places' && item && typeof item === 'object'
          ? `${item.name} (${item.distance_km} km)`
          : typeof item === 'object'
            ? JSON.stringify(item)
            : String(item)
      )
      .join(', ')
  } else if (typeof value === 'object') text = JSON.stringify(value)
  else {
    text = String(value).trim()
    if (/<[a-z][\s\S]*>/i.test(text)) {
      text = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    }
    text = text.replace(/\s+/g, ' ').trim()
    if (/^\d{2}:\d{2}:00$/.test(text)) text = text.slice(0, 5)
  }
  if (!text) return null
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE - 1)}…` : text
}

/**
 * The fields that really changed between two versions of a row, with before / after values for
 * the log. `keys` limits it to the fields the save sent (default: every key of `after`); `secret`
 * fields only say "Changed", never their values.
 */
export function diffChanges(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
  { keys, secret = [] }: { keys?: string[]; secret?: string[] } = {}
): ActivityChange[] {
  const fields = keys ?? Object.keys(after ?? {})
  const changes: ActivityChange[] = []
  for (const key of fields) {
    if (IGNORED_FIELDS.has(key)) continue
    const from = before?.[key]
    const to = after?.[key]
    if (comparable(from) === comparable(to)) continue
    changes.push(
      secret.includes(key)
        ? { field: fieldLabel(key), from: null, to: 'Changed' }
        : { field: fieldLabel(key), from: displayValue(key, from), to: displayValue(key, to) }
    )
  }
  return changes.slice(0, MAX_CHANGES)
}

/** "name, description and 2 more" from the changed fields' labels ('' when nothing changed) */
export function summarizeChanges(changes: ActivityChange[]): string {
  const words = [...new Set(changes.map((c) => c.field.toLowerCase()))]
  if (words.length === 0) return ''
  if (words.length <= 3) return words.join(', ')
  return `${words.slice(0, 2).join(', ')} and ${words.length - 2} more`
}
