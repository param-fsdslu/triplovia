import assert from 'node:assert/strict'
import test from 'node:test'
import { MemoryStore } from '../store'
import { beginBookingConfirmation, deliverBookingEmail } from '../booking-email-delivery'

const payload = { to: 'guest@example.com', subject: 'Confirmed', html: '<p>Booking details</p>' }

test('customer and vendor retry independently, retaining the original payload', async () => {
  const store = new MemoryStore()
  let prepared = 0
  let customerSends = 0
  const prepare = async () => { prepared++; return payload }
  assert.equal(await deliverBookingEmail(store, 'b_customer', prepare, async () => { customerSends++; return { success: false } }), 'pending')
  assert.equal(await deliverBookingEmail(store, 'b_vendor', async () => ({ ...payload, to: 'vendor@example.com' }), async () => ({ success: true })), 'sent')
  assert.equal(await deliverBookingEmail(store, 'b_customer', async () => { throw new Error('Must reuse frozen email') }, async (saved, key) => {
    assert.equal(saved.to, payload.to)
    assert.equal(key, 'booking-confirmation-b_customer')
    customerSends++
    return { success: true }
  }), 'sent')
  await deliverBookingEmail(store, 'b_customer', prepare, async () => { throw new Error('Duplicate') })
  await deliverBookingEmail(store, 'b_vendor', prepare, async () => { throw new Error('Duplicate') })
  assert.equal(prepared, 1)
  assert.equal(customerSends, 2)
})

test('active lease prevents another caller sending, and expired lease recovers', async () => {
  const store = new MemoryStore()
  await store.transaction(async tx => tx.create('_booking_emails/b_customer', { payload, status: 'sending', created_at: 1000, lease_until: 121000, token: 'old', attempts: 1 }))
  let sends = 0
  const send = async () => { sends++; return { success: true } }
  assert.equal(await deliverBookingEmail(store, 'b_customer', async () => payload, send, 2000), 'not-due')
  assert.equal(await deliverBookingEmail(store, 'b_customer', async () => payload, send, 122000), 'sent')
  assert.equal(sends, 1)
})

test('stops retries before provider idempotency expires', async () => {
  const store = new MemoryStore()
  await deliverBookingEmail(store, 'b_customer', async () => payload, async () => ({ success: false }), 1000)
  await deliverBookingEmail(store, 'b_customer', async () => payload, async () => { throw new Error('Must not resend after 23 hours') }, 1000 + 23 * 3600000)
  assert.equal(store.raw('_booking_emails/b_customer')?.status, 'needs_attention')
})

test('new runs resume but old claims are not replayed', async () => {
  const store = new MemoryStore()
  assert.equal(await beginBookingConfirmation(store, 'new'), 'new')
  assert.equal(await beginBookingConfirmation(store, 'new'), 'retry')
  await store.transaction(async tx => tx.create('_claims/booking-confirmed_old', {}))
  assert.equal(await beginBookingConfirmation(store, 'old'), 'legacy')
})

test('missing recipient does not mark delivery sent', async () => {
  const store = new MemoryStore()
  assert.equal(await deliverBookingEmail(store, 'b_customer', async () => null, async () => { throw new Error('No recipient') }), 'missing-recipient')
  assert.equal(store.raw('_booking_emails/b_customer'), undefined)
})
