import type { DecodedIdToken } from 'firebase-admin/auth'
import { normalizePhone } from '../../utils/phone'

/** Only a fresh, verified Firebase SMS sign-in can prove ownership of a phone number. */
export function phoneFromProof(decoded: Pick<DecodedIdToken, 'auth_time' | 'phone_number' | 'firebase'>, expectedPhone: string, now = Date.now()): string {
  const phone = normalizePhone(decoded.phone_number)
  const age = now / 1000 - decoded.auth_time
  if (decoded.firebase?.sign_in_provider !== 'phone' || !phone || phone !== normalizePhone(expectedPhone) || !Number.isFinite(age) || age < -60 || age > 5 * 60) {
    throw new Error('Please verify this mobile number with a fresh SMS code.')
  }
  return phone
}

/** A contact number by itself is never proof of ownership. */
export function verifiedProfilePhone(meta: Record<string, any>): string | null {
  const phone = normalizePhone(meta.phone)
  return phone && meta.verified_phone === phone && typeof meta.phone_verified_at === 'string' ? phone : null
}
