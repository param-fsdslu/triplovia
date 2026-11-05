/**
 * Database clients for server code (server components, server actions, route handlers).
 *
 *   const db = await createClient()   // acts as the signed-in user; row policies apply
 *   const admin = createAdminClient() // service role; bypasses row policies — server-only
 *
 * Both expose `from()` / `rpc()` (Firestore), `auth` (Firebase Auth) and `storage`
 * (Firebase Storage). Browsers never talk to Firestore directly.
 */
import { cookies } from 'next/headers'
import { createAuthApi, type AuthApi } from '@/lib/firebase/auth/api'
import { SESSION_COOKIE, sessionUserFromCookie } from '@/lib/firebase/auth/session'
import type { AuthUser } from '@/lib/firebase/auth/types'
import { createStorageApi, type StorageApi } from '@/lib/firebase/storage'
import { DbClient } from './client'
import { getStore } from './service'
import type { DbUser } from './types'

export type AppDbClient = DbClient<AuthApi, StorageApi>

export function toDbUser(user: AuthUser): DbUser {
  const hotelIds = user.user_metadata?.hotel_ids
  return {
    id: user.id,
    email: user.email ?? null,
    role: user.user_metadata?.role ?? null,
    hotelIds: Array.isArray(hotelIds) ? hotelIds.map(String) : [],
  }
}

/**
 * `fresh: true` skips the short catalogue cache (lib/db/cached-store.ts): use it where room
 * prices or capacity decide what a guest is charged (booking creation, the review page).
 */
export async function createClient({ fresh = false }: { fresh?: boolean } = {}): Promise<AppDbClient> {
  // Read cookies up front (as the Supabase client did) so Next.js marks the route dynamic
  // here, rather than inside a query where the error would be caught
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value
  return new DbClient({
    store: getStore({ fresh }),
    resolveActor: async () => {
      const user = await sessionUserFromCookie(sessionCookie)
      return { kind: 'user', user: user ? toDbUser(user) : null }
    },
    auth: createAuthApi({ admin: false }),
    storage: createStorageApi(),
  })
}

export function createAdminClient({ fresh = false }: { fresh?: boolean } = {}): AppDbClient {
  return new DbClient({
    store: getStore({ fresh }),
    resolveActor: async () => ({ kind: 'service' }),
    auth: createAuthApi({ admin: true }),
    storage: createStorageApi(),
  })
}
