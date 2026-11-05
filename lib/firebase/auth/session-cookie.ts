import { adminAuth } from '@/lib/firebase/admin'

/**
 * Verifies a session cookie and returns the uid, or null if it is invalid or expired.
 * With checkRevoked, also rejects sessions revoked by sign-out/password reset and
 * disabled accounts (one call to Firebase Auth).
 */
export async function verifySessionCookie(cookie: string, checkRevoked: boolean): Promise<string | null> {
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, checkRevoked)
    return decoded.uid
  } catch {
    return null
  }
}
