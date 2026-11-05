import { serverLog } from '@/lib/utils/server-log'
/**
 * Firebase Auth REST API (Identity Toolkit) calls that the Admin SDK does not offer:
 * verifying a password, exchanging a custom token, and consuming email action codes.
 * Uses the public web API key (NEXT_PUBLIC_FIREBASE_API_KEY).
 */

export class IdentityError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = 'IdentityError'
  }
}

function baseUrl() {
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST
  return emulator
    ? `http://${emulator}/identitytoolkit.googleapis.com/v1`
    : 'https://identitytoolkit.googleapis.com/v1'
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!key) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY is not configured')

  const res = await fetch(`${baseUrl()}/${path}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    // e.g. "INVALID_LOGIN_CREDENTIALS" or "TOO_MANY_ATTEMPTS_TRY_LATER : Access to this account..."
    const message: string = json?.error?.message ?? `HTTP_${res.status}`
    throw new IdentityError(message.split(' ')[0])
  }
  return json as T
}

/** Verifies email + password; returns an ID token to mint a session cookie from */
export function signInWithPassword(email: string, password: string) {
  return call<{ idToken: string; localId: string; email: string }>('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  })
}

/** Exchanges an Admin SDK custom token for an ID token (used after email verification) */
export function signInWithCustomToken(token: string) {
  return call<{ idToken: string }>('accounts:signInWithCustomToken', { token, returnSecureToken: true })
}

/** Checks a password-reset code without consuming it; returns the account email */
export function verifyPasswordResetCode(oobCode: string) {
  return call<{ email: string; requestType: string }>('accounts:resetPassword', { oobCode })
}

/** Sets a new password using a password-reset code (consumes the code) */
export function confirmPasswordReset(oobCode: string, newPassword: string) {
  return call<{ email: string }>('accounts:resetPassword', { oobCode, newPassword })
}

/** Marks the email verified using a verifyEmail code */
export function applyEmailVerificationCode(oobCode: string) {
  return call<{ localId?: string; email: string; emailVerified: boolean }>('accounts:update', { oobCode })
}

/** User-facing messages, worded like the Supabase errors the UI showed before */
export function identityErrorMessage(err: unknown): string {
  const code = err instanceof IdentityError ? err.code : ''
  switch (code) {
    case 'INVALID_LOGIN_CREDENTIALS':
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_EMAIL':
      return 'Invalid login credentials'
    case 'USER_DISABLED':
      return 'This account has been disabled'
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Too many attempts. Please try again later.'
    case 'EXPIRED_OOB_CODE':
    case 'INVALID_OOB_CODE':
      return 'This link is invalid or has expired'
    case 'WEAK_PASSWORD':
      return 'Password should be at least 6 characters'
    default:
      serverLog.error('[auth] identity toolkit error:', err)
      return 'Something went wrong. Please try again.'
  }
}
