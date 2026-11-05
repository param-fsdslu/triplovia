/**
 * User accounts: Firebase Authentication holds credentials; the `_auth_users` Firestore
 * collection holds what Supabase kept in auth.users (user_metadata with role/hotel_ids and
 * names, sign-in and confirmation timestamps). Only server code writes either, so
 * user_metadata — which the admin guards trust for roles — cannot be edited by users directly.
 *
 * Creating or updating a user also upserts the `profiles` row (email, role, hotel_ids),
 * replacing the Supabase handle_new_user trigger.
 *
 * Google and phone (SMS code) accounts are created by Firebase itself in the browser;
 * upsertFederatedUser adopts them here on their first sign-in.
 */
import type { UpdateRequest, UserRecord } from 'firebase-admin/auth'
import { adminAuth, adminFirestore } from '@/lib/firebase/admin'
import { createServiceDb } from '@/lib/db/service'
import { AUTH_USERS_COLLECTION } from '@/lib/db/rpc'
import { TABLES } from '@/lib/db/schema'
import { invalidateSessionUser } from './session-cache'
import { authError, type AuthError, type AuthUser, type AuthUserDoc } from './types'
import { serverLog } from '@/lib/utils/server-log'

function users() {
  return adminFirestore().collection(AUTH_USERS_COLLECTION)
}

function toAuthUser(doc: AuthUserDoc): AuthUser {
  return {
    id: doc.id,
    email: doc.email ?? undefined,
    user_metadata: doc.user_metadata ?? {},
    app_metadata: doc.app_metadata ?? {},
    aud: 'authenticated',
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    last_sign_in_at: doc.last_sign_in_at ?? null,
    email_confirmed_at: doc.email_confirmed_at ?? null,
  }
}

/** Supabase semantics: keys set to null are removed, others are merged in */
function mergeMetadata(current: Record<string, any>, patch: Record<string, any>) {
  const next = { ...current }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    if (value === null) delete next[key]
    else next[key] = value
  }
  return next
}

function firebaseErrorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as any).code) : ''
}

function translateFirebaseError(err: unknown) {
  const code = firebaseErrorCode(err)
  switch (code) {
    case 'auth/email-already-exists':
      return authError('A user with this email address has already been registered', 422, 'email_exists')
    case 'auth/invalid-password':
      return authError('Password should be at least 6 characters.', 422, 'weak_password')
    case 'auth/invalid-email':
      return authError('Unable to validate email address: invalid format', 400, 'validation_failed')
    case 'auth/user-not-found':
      return authError('User not found', 404, 'user_not_found')
    default:
      return authError(err instanceof Error ? err.message : 'Authentication error', 500)
  }
}

/** Upserts the profiles row; a new account also seeds its names, phone and photo, `fields` are always written */
async function syncProfile(doc: AuthUserDoc, isNew: boolean, fields: Record<string, unknown> = {}) {
  const meta = doc.user_metadata ?? {}
  const row: Record<string, unknown> = {
    id: doc.id,
    email: doc.email,
    role: meta.role ?? null,
    hotel_ids: meta.hotel_ids ?? null,
  }
  if (isNew) {
    if (meta.first_name) row.first_name = meta.first_name
    if (meta.last_name) row.last_name = meta.last_name
    if (meta.phone) row.phone = meta.phone
    if (meta.avatar_url) row.profile_image = meta.avatar_url
  }
  Object.assign(row, fields)
  const { error } = await createServiceDb().from('profiles').upsert(row, { onConflict: 'id' })
  if (error) serverLog.error('[auth] profile sync failed:', error)
}

export async function getAuthUserById(uid: string): Promise<AuthUser | null> {
  const snap = await users().doc(uid).get()
  if (snap.exists) return toAuthUser(snap.data() as AuthUserDoc)

  // Account created outside the app (e.g. Firebase console): adopt it
  try {
    const record = await adminAuth().getUser(uid)
    const now = new Date().toISOString()
    const doc: AuthUserDoc = {
      id: record.uid,
      email: record.email ?? null,
      user_metadata: (record.customClaims as AuthUserDoc['user_metadata']) ?? {},
      app_metadata: { provider: 'email', providers: ['email'] },
      created_at: new Date(record.metadata.creationTime).toISOString(),
      updated_at: now,
      last_sign_in_at: record.metadata.lastSignInTime ? new Date(record.metadata.lastSignInTime).toISOString() : null,
      email_confirmed_at: record.emailVerified ? now : null,
    }
    await users().doc(uid).set(doc)
    await syncProfile(doc, true)
    return toAuthUser(doc)
  } catch (err) {
    if (firebaseErrorCode(err) === 'auth/user-not-found') return null
    throw err
  }
}

export async function getAuthUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    const record = await adminAuth().getUserByEmail(email)
    return getAuthUserById(record.uid)
  } catch (err) {
    if (firebaseErrorCode(err) === 'auth/user-not-found') return null
    throw err
  }
}

export async function listAuthUsers(): Promise<AuthUser[]> {
  const snap = await users().get()
  return snap.docs.map((d) => toAuthUser(d.data() as AuthUserDoc))
}

export async function createAuthUser(params: {
  email: string
  password: string
  emailConfirmed?: boolean
  userMetadata?: Record<string, any>
}): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  const meta = mergeMetadata({}, params.userMetadata ?? {})
  let uid: string
  try {
    const record = await adminAuth().createUser({
      email: params.email,
      password: params.password,
      emailVerified: !!params.emailConfirmed,
      displayName: meta.full_name || undefined,
    })
    uid = record.uid
  } catch (err) {
    return { user: null, error: translateFirebaseError(err) }
  }

  const now = new Date().toISOString()
  const doc: AuthUserDoc = {
    id: uid,
    email: params.email.toLowerCase(),
    user_metadata: meta,
    app_metadata: { provider: 'email', providers: ['email'] },
    created_at: now,
    updated_at: now,
    last_sign_in_at: null,
    email_confirmed_at: params.emailConfirmed ? now : null,
  }
  await users().doc(uid).set(doc)
  await syncProfile(doc, true)
  return { user: toAuthUser(doc), error: null }
}

export async function updateAuthUser(
  uid: string,
  attrs: { email?: string; password?: string; userMetadata?: Record<string, any>; emailConfirmed?: boolean }
): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  const current = await getAuthUserById(uid)
  if (!current) return { user: null, error: authError('User not found', 404, 'user_not_found') }

  const meta = attrs.userMetadata ? mergeMetadata(current.user_metadata, attrs.userMetadata) : current.user_metadata
  try {
    const update: UpdateRequest = {}
    if (attrs.email && attrs.email !== current.email) update.email = attrs.email
    if (attrs.password) update.password = attrs.password
    if (attrs.emailConfirmed !== undefined) update.emailVerified = attrs.emailConfirmed
    if (attrs.userMetadata && meta.full_name !== current.user_metadata.full_name) {
      update.displayName = meta.full_name || null
    }
    if (Object.keys(update).length > 0) await adminAuth().updateUser(uid, update)
  } catch (err) {
    return { user: null, error: translateFirebaseError(err) }
  }

  const now = new Date().toISOString()
  const doc: AuthUserDoc = {
    id: uid,
    email: (attrs.email ?? current.email ?? '').toLowerCase() || null,
    user_metadata: meta,
    app_metadata: current.app_metadata,
    created_at: current.created_at,
    updated_at: now,
    last_sign_in_at: current.last_sign_in_at,
    email_confirmed_at:
      attrs.emailConfirmed === undefined ? current.email_confirmed_at : attrs.emailConfirmed ? now : null,
  }
  await users().doc(uid).set(doc)
  await syncProfile(doc, false)
  invalidateSessionUser(uid)
  return { user: toAuthUser(doc), error: null }
}

/**
 * Deletes a user, applying the ON DELETE rules of every foreign key that pointed at
 * auth.users (profiles cascade; bookings/hotels/blogs set NULL; others block the delete).
 */
export async function deleteAuthUser(uid: string): Promise<{ error: AuthError | null }> {
  const db = createServiceDb()

  for (const [table, def] of Object.entries(TABLES)) {
    for (const fk of def.fks) {
      if (fk.refTable !== 'auth.users' || fk.onDelete === 'cascade' || fk.onDelete === 'set_null') continue
      const { count } = await db.from(table).select('*', { count: 'exact', head: true }).eq(fk.column, uid)
      if (count) {
        return { error: authError('Database error deleting user', 500, 'unexpected_failure') }
      }
    }
  }

  for (const [table, def] of Object.entries(TABLES)) {
    for (const fk of def.fks) {
      if (fk.refTable !== 'auth.users') continue
      const result =
        fk.onDelete === 'cascade'
          ? await db.from(table).delete().eq(fk.column, uid)
          : fk.onDelete === 'set_null'
            ? await db.from(table).update({ [fk.column]: null }).eq(fk.column, uid)
            : { error: null }
      if (result.error) return { error: authError(result.error.message, 500) }
    }
  }

  await users().doc(uid).delete()
  try {
    await adminAuth().deleteUser(uid)
  } catch (err) {
    if (firebaseErrorCode(err) !== 'auth/user-not-found') return { error: translateFirebaseError(err) }
  }
  invalidateSessionUser(uid)
  return { error: null }
}

function splitName(displayName: string | undefined) {
  const [first = '', ...rest] = (displayName ?? '').trim().split(/\s+/)
  return { first, last: rest.join(' ') }
}

function fullName(meta: AuthUserDoc['user_metadata']) {
  return [meta.first_name, meta.last_name].filter(Boolean).join(' ') || undefined
}

/**
 * Adopts a Google or phone account after Firebase signed it in. New accounts take their
 * name, email, photo and number from Firebase; existing ones (e.g. an email account that
 * now signs in with Google) only have empty fields filled, so edits made in the app win.
 */
export async function upsertFederatedUser(
  record: UserRecord,
  provider: 'google' | 'phone',
  /** Runs once when the account is new to the site (e.g. the admin activity log) */
  onCreated?: (user: AuthUser) => Promise<void> | void
): Promise<AuthUser> {
  const ref = users().doc(record.uid)
  const snap = await ref.get()
  const now = new Date().toISOString()
  const name = splitName(record.displayName)
  const email = record.email?.toLowerCase() ?? null
  const phone = record.phoneNumber ?? undefined

  if (!snap.exists) {
    const meta = mergeMetadata({}, {
      first_name: name.first || undefined,
      last_name: name.last || undefined,
      full_name: record.displayName?.trim() || undefined,
      phone,
      verified_phone: phone,
      phone_verified_at: phone ? now : undefined,
      avatar_url: record.photoURL ?? undefined,
    })
    const doc: AuthUserDoc = {
      id: record.uid,
      email,
      user_metadata: meta,
      app_metadata: { provider, providers: [provider] },
      created_at: new Date(record.metadata.creationTime).toISOString(),
      updated_at: now,
      last_sign_in_at: null,
      email_confirmed_at: email && record.emailVerified ? now : null,
    }
    await ref.set(doc)
    await syncProfile(doc, true)
    const created = toAuthUser(doc)
    await onCreated?.(created)
    return created
  }

  const current = snap.data() as AuthUserDoc
  const meta = { ...current.user_metadata }
  const filled: Record<string, unknown> = {}
  if (!meta.first_name && name.first) meta.first_name = filled.first_name = name.first
  if (!meta.last_name && name.last) meta.last_name = filled.last_name = name.last
  if (!meta.full_name) meta.full_name = fullName(meta)
  if (phone) {
    meta.phone = filled.phone = phone
    meta.verified_phone = phone
    meta.phone_verified_at = now
  }
  if (!meta.avatar_url && record.photoURL) meta.avatar_url = record.photoURL

  const doc: AuthUserDoc = {
    ...current,
    email: current.email ?? email,
    user_metadata: mergeMetadata({}, meta),
    app_metadata: {
      ...current.app_metadata,
      providers: Array.from(new Set([...(current.app_metadata?.providers ?? []), provider])),
    },
    updated_at: now,
    // Google vouches for its address; a contact email typed by a phone user stays unconfirmed
    email_confirmed_at:
      current.email_confirmed_at ?? (email && record.emailVerified && (current.email ?? email) === email ? now : null),
  }
  await ref.set(doc)
  await syncProfile(doc, false, filled)
  invalidateSessionUser(record.uid)
  return toAuthUser(doc)
}

/**
 * Fills in details a Google or phone sign-in didn't provide. Only empty fields are set, so
 * this can't replace a verified email. An email given here is a contact address for booking
 * mails: it is not set on the Firebase account, so nobody can claim someone else's address.
 */
export async function fillMissingUserDetails(
  uid: string,
  details: { firstName?: string; lastName?: string; email?: string; verifiedPhone?: string }
): Promise<AuthUser | null> {
  const ref = users().doc(uid)
  const snap = await ref.get()
  if (!snap.exists) return null

  const current = snap.data() as AuthUserDoc
  const meta = { ...current.user_metadata }
  const filled: Record<string, unknown> = {}
  if (!meta.first_name && details.firstName) meta.first_name = filled.first_name = details.firstName
  if (!meta.last_name && details.lastName) meta.last_name = filled.last_name = details.lastName
  if (details.verifiedPhone) {
    meta.phone = filled.phone = details.verifiedPhone
    meta.verified_phone = details.verifiedPhone
    meta.phone_verified_at = new Date().toISOString()
  }
  const nameChanged = 'first_name' in filled || 'last_name' in filled
  if (nameChanged) meta.full_name = fullName(meta)

  const doc: AuthUserDoc = {
    ...current,
    email: current.email ?? details.email?.toLowerCase() ?? null,
    user_metadata: meta,
    updated_at: new Date().toISOString(),
  }
  await ref.set(doc)
  await syncProfile(doc, false, filled)
  if (nameChanged && meta.full_name) {
    await adminAuth().updateUser(uid, { displayName: meta.full_name }).catch((err) => {
      serverLog.error('[auth] displayName update failed:', err)
    })
  }
  invalidateSessionUser(uid)
  return toAuthUser(doc)
}

export async function recordSignIn(uid: string) {
  await users().doc(uid).set({ last_sign_in_at: new Date().toISOString() }, { merge: true })
}

export async function recordEmailConfirmed(uid: string) {
  const now = new Date().toISOString()
  await users().doc(uid).set({ email_confirmed_at: now, updated_at: now }, { merge: true })
  invalidateSessionUser(uid)
}
