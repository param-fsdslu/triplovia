/**
 * Server sessions use Firebase session cookies: after a password check, the ID token is
 * exchanged for an httpOnly cookie valid for 14 days. Pages and actions verify it with
 * revocation checks (so sign-out and disabled accounts take effect immediately);
 * middleware does a cheaper signature-only check for redirects.
 */
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { getCachedSessionUser, invalidateSessionCookie, invalidateSessionUser } from './session-cache'
import { PASSWORD_RESET_COOKIE, SESSION_COOKIE } from './constants'
import { verifySessionCookie } from './session-cookie'
import { getAuthUserById, recordSignIn } from './users'
import type { AuthUser } from './types'

export { PASSWORD_RESET_COOKIE, SESSION_COOKIE, verifySessionCookie }

const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

/** Creates the session cookie for a freshly verified ID token (server actions / route handlers only) */
export async function startSession(idToken: string, uid: string) {
  const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS })
  const store = await cookies()
  store.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  })
  await recordSignIn(uid)
}

/**
 * Clears the session cookie. With revoke (the default, like Supabase's global sign-out)
 * every session of the user is invalidated.
 */
export async function endSession({ revoke = true }: { revoke?: boolean } = {}) {
  const store = await cookies()
  const cookie = store.get(SESSION_COOKIE)?.value
  if (cookie) {
    invalidateSessionCookie(cookie)
    if (revoke) {
      const uid = await verifySessionCookie(cookie, false)
      if (uid) {
        await adminAuth().revokeRefreshTokens(uid)
        invalidateSessionUser(uid)
      }
    }
  }
  store.delete(SESSION_COOKIE)
}

/** The user a session cookie value belongs to, or null if missing/invalid/revoked */
export function sessionUserFromCookie(cookie: string | undefined): Promise<AuthUser | null> {
  if (!cookie) return Promise.resolve(null)
  return getCachedSessionUser(cookie, async () => {
    const uid = await verifySessionCookie(cookie, true)
    return uid ? getAuthUserById(uid) : null
  })
}

/** The signed-in user for the current request, or null */
export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies()
  return sessionUserFromCookie(store.get(SESSION_COOKIE)?.value)
}
