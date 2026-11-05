// Dependency-free so middleware (edge runtime) can import it without pulling in firebase-admin

/** Name of the httpOnly Firebase session cookie */
export const SESSION_COOKIE = '__session'

/** Set by /auth/callback when a password-reset link is opened; holds the Firebase oobCode */
export const PASSWORD_RESET_COOKIE = 'pw_reset_code'
