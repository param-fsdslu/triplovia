import type { AuthUser } from './types'

/**
 * Short-lived cache of session cookie → user, so the several getUser() calls one request
 * makes (guards, actions, pages) cost one session verification, and browsing doesn't repeat it
 * (each costs two round trips to Firebase in the US). Entries are dropped when the user is
 * updated or signs out here; a session revoked elsewhere stops working within TTL_MS.
 */
const TTL_MS = 60_000
const MAX_ENTRIES = 500

interface Entry {
  uid: string | null
  user: Promise<AuthUser | null>
  expires: number
}

const globalForCache = globalThis as unknown as { __sessionUserCache?: Map<string, Entry> }
const cache = (globalForCache.__sessionUserCache ??= new Map<string, Entry>())

export function getCachedSessionUser(cookie: string, load: () => Promise<AuthUser | null>): Promise<AuthUser | null> {
  const now = Date.now()
  const hit = cache.get(cookie)
  if (hit && hit.expires > now) return hit.user

  if (cache.size >= MAX_ENTRIES) {
    for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key)
    if (cache.size >= MAX_ENTRIES) cache.clear()
  }

  const entry: Entry = { uid: null, user: load(), expires: now + TTL_MS }
  entry.user.then(
    (user) => {
      entry.uid = user?.id ?? null
    },
    () => cache.delete(cookie)
  )
  cache.set(cookie, entry)
  return entry.user
}

export function invalidateSessionUser(uid: string) {
  for (const [key, entry] of cache) if (entry.uid === uid) cache.delete(key)
}

export function invalidateSessionCookie(cookie: string) {
  cache.delete(cookie)
}
