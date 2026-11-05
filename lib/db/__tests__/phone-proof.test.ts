import assert from 'node:assert/strict'
import test from 'node:test'
import { phoneFromProof, verifiedProfilePhone } from '../../firebase/auth/phone-proof'
import type { DecodedIdToken } from 'firebase-admin/auth'

const now = new Date('2026-11-05T12:00:00Z').getTime()
const phone = '+919876543210'
const proof = { auth_time: now / 1000 - 10, phone_number: phone, firebase: { sign_in_provider: 'phone', identities: {} } } as DecodedIdToken

test('only recent SMS authentication proves the requested phone', () => {
  assert.equal(phoneFromProof(proof, phone, now), phone)
  assert.throws(() => phoneFromProof({ ...proof, phone_number: '+919876543211' }, phone, now))
  assert.throws(() => phoneFromProof({ ...proof, firebase: { ...proof.firebase, sign_in_provider: 'google.com' } }, phone, now))
  assert.throws(() => phoneFromProof({ ...proof, auth_time: now / 1000 - 301 }, phone, now))
  assert.throws(() => phoneFromProof({ ...proof, auth_time: now / 1000 + 61 }, phone, now))
  assert.throws(() => phoneFromProof({ ...proof, auth_time: NaN }, phone, now))
  assert.throws(() => phoneFromProof({ ...proof, phone_number: undefined }, phone, now))
})

test('typed contact phones cannot claim bookings; changing a number invalidates its proof', () => {
  assert.equal(verifiedProfilePhone({ phone }), null)
  assert.equal(verifiedProfilePhone({ phone, phone_verified: true }), null)
  assert.equal(verifiedProfilePhone({ phone, verified_phone: phone }), null)
  assert.equal(verifiedProfilePhone({ phone, verified_phone: phone, phone_verified_at: '2026-11-05T12:00:00Z' }), phone)
  assert.equal(verifiedProfilePhone({ phone: '+919876543211', verified_phone: phone, phone_verified_at: '2026-11-05T12:00:00Z' }), null)
})
