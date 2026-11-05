import { randomUUID } from 'node:crypto'
import type { DocStore } from './store'

export interface BookingEmailPayload {
  to: string
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: string }>
}
const HOURS = 3_600_000
const LEASE_MS = 2 * 60_000

/** Initialise alongside the old run-once claim, so pre-upgrade notifications are not replayed. */
export async function beginBookingConfirmation(store: DocStore, bookingId: string): Promise<'new' | 'retry' | 'legacy'> {
  const run = '_booking_confirmation_runs/' + bookingId
  const claim = '_claims/booking-confirmed_' + bookingId
  return store.transaction(async tx => {
    const docs = await tx.getByPaths([run, claim])
    if (docs.some(doc => doc.path === run)) return 'retry'
    if (docs.some(doc => doc.path === claim)) return 'legacy'
    tx.create(run, { booking_id: bookingId, created_at: new Date().toISOString() })
    tx.create(claim, { booking_id: bookingId, claimed_at: new Date().toISOString() })
    return 'new'
  })
}

/** Durable, independent customer/vendor sends. Freeze the payload for Resend idempotent retries. */
export async function deliverBookingEmail(
  store: DocStore, key: string, prepare: () => Promise<BookingEmailPayload | null>,
  send: (payload: BookingEmailPayload, key: string) => Promise<{ success: boolean }>,
  now = Date.now()
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid email delivery key')
  const path = '_booking_emails/' + key
  const existing = (await store.getByPaths([path]))[0]?.data
  if (existing?.status === 'sent') return 'sent'
  if (!existing) {
    const payload = await prepare()
    if (!payload) return 'missing-recipient'
    // Firestore has a 1 MiB document limit. Large invoice sets remain available via the email CTA.
    if (Buffer.byteLength(JSON.stringify(payload)) > 850_000) delete payload.attachments
    await store.transaction(async tx => {
      if ((await tx.getByPaths([path])).length) return
      tx.create(path, { payload, status: 'pending', created_at: now, attempts: 0 })
    })
  }
  const token = randomUUID()
  const payload = await store.transaction(async tx => {
    const row = (await tx.getByPaths([path]))[0]?.data
    if (!row || row.status === 'sent' || row.lease_until > now) return null
    // Resend retains idempotency keys for 24h; stop earlier rather than risk a duplicate send.
    if (now - row.created_at >= 23 * HOURS) {
      tx.set(path, { ...row, status: 'needs_attention', lease_until: 0 })
      return null
    }
    tx.set(path, { ...row, status: 'sending', token, lease_until: now + LEASE_MS, attempts: row.attempts + 1 })
    return row.payload as BookingEmailPayload
  })
  if (!payload) return 'not-due'
  let success = false
  try { success = (await send(payload, 'booking-confirmation-' + key)).success } catch { /* Retried by cron. */ }
  await store.transaction(async tx => {
    const row = (await tx.getByPaths([path]))[0]?.data
    if (row?.token !== token) return
    tx.set(path, { ...row, status: success ? 'sent' : 'pending', lease_until: 0, ...(success ? { sent_at: new Date(now).toISOString() } : {}) })
  })
  return success ? 'sent' : 'pending'
}
