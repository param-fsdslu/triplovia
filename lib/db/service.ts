import { adminFirestore } from '@/lib/firebase/admin'
import { DbClient } from './client'
import { CachedStore } from './cached-store'
import { FirestoreStore } from './firestore-store'
import type { DocStore } from './store'

let store: FirestoreStore | null = null
let cached: CachedStore | null = null

/**
 * The process-wide Firestore-backed store, with the hotel catalogue's reads cached for a short
 * while (cached-store.ts). `fresh` skips the cache: for code that prices or creates bookings.
 * Firestore (and its credentials) are only touched when a query runs, so a missing key surfaces
 * as a query error, not a crash.
 */
export function getStore({ fresh = false }: { fresh?: boolean } = {}): DocStore {
  if (!store) store = new FirestoreStore(adminFirestore)
  if (fresh) return store
  if (!cached) cached = new CachedStore(store)
  return cached
}

/**
 * Service-role database client without auth/storage facades. For internal use by the
 * auth layer; app code should use createAdminClient() from '@/lib/db/server'.
 */
export function createServiceDb(): DbClient<null, null> {
  return new DbClient({
    store: getStore(),
    resolveActor: async () => ({ kind: 'service' }),
    auth: null,
    storage: null,
  })
}
