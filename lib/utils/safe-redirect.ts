/**
 * Post-sign-in redirect targets come from URLs (?redirect=...), so only same-site paths are
 * allowed: an absolute or protocol-relative URL here would be an open redirect.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = '/bookings'): string {
  return path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : fallback
}
