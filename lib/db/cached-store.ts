/**
 * Read-through cache over the Firestore store for the hotel catalogue, which is read on every page
 * and rarely written: hotels, their photos / 360°s / amenities / nearby places, room types and
 * theirs, amenities, reviews and blogs. Firestore (nam5, US) is 0.4–1.5 s a round trip from India
 * and a hotel page needs five rounds, so warm pages skip them.
 *
 * - Stale-while-revalidate: an entry is fresh for CACHE_TTL_MS; after that it is still served
 *   at once (up to CACHE_MAX_STALE_MS old) while one background read refreshes it, so a quiet
 *   site doesn't make every visitor wait on cold reads. A write through this store (every write
 *   runs in transaction()) drops the written collections' entries at once; another server
 *   instance's write shows here after the next refresh.
 * - Bookings, payments, users, claims, saved stays… are never cached, so new bookings always
 *   count against availability. Price rules, room blocks and meal plans are cached for browsing.
 * - Code that prices or creates a booking reads everything fresh: createClient({ fresh: true }) /
 *   createAdminClient({ fresh: true }) use the store underneath (getStore({ fresh: true })), so a
 *   guest is never charged from a cached price.
 * - Reads inside a transaction always go to Firestore.
 */
import type { DocStore, Source, StoredDoc, StoreQuery, StoreTransaction } from './store'

export const CACHE_TTL_MS = 60_000
/** Older than this, an entry is read again before answering */
export const CACHE_MAX_STALE_MS = 60 * 60_000
const MAX_ENTRIES = 2_000

/** Collection ids (the table names) whose reads are cached */
export const CACHED_COLLECTIONS = new Set([
  'hotels',
  'hotel_images',
  'hotel_panoramas',
  'hotel_amenities',
  'hotel_nearby_attractions',
  'room_types',
  'room_type_images',
  'room_type_panoramas',
  'room_type_amenities',
  'amenities',
  'amenity_categories',
  'reviews',
  'review_responses',
  'blogs',
  'blog_images',
  'price_rules',
  'room_inventory_blocks',
  'meal_plans',
])

/** 'hotels/1/room_types' → 'room_types'; a group source is its id */
function collectionOf(source: Source) {
  if (source.kind === 'group') return source.id
  const parts = source.path.split('/')
  return parts[parts.length - 1]
}

/** 'hotels/1/room_types/2' → 'room_types' */
function collectionOfDoc(path: string) {
  const parts = path.split('/')
  return parts[parts.length - 2] ?? ''
}

interface Entry {
  collection: string
  /** When the docs were read */
  at: number
  docs: Promise<StoredDoc[]>
  refreshing?: boolean
}

export class CachedStore implements DocStore {
  private entries = new Map<string, Entry>()

  constructor(private inner: DocStore) {}

  private read(key: string, collection: string, load: () => Promise<StoredDoc[]>) {
    const now = Date.now()
    const hit = this.entries.get(key)
    if (hit && now - hit.at < CACHE_TTL_MS) return hit.docs
    if (hit && now - hit.at < CACHE_MAX_STALE_MS) {
      // Stale: answer now, refresh behind it (one refresh at a time; a failed one keeps the old docs)
      if (!hit.refreshing) {
        hit.refreshing = true
        const fresh = load()
        fresh.then(
          () => {
            if (this.entries.get(key) === hit) this.entries.set(key, { collection, at: Date.now(), docs: fresh })
          },
          () => {
            hit.refreshing = false
          }
        )
      }
      return hit.docs
    }

    if (this.entries.size >= MAX_ENTRIES) {
      for (const [k, entry] of this.entries) if (now - entry.at >= CACHE_MAX_STALE_MS) this.entries.delete(k)
      if (this.entries.size >= MAX_ENTRIES) this.entries.clear()
    }
    const entry: Entry = { collection, at: now, docs: load() }
    // A failed read isn't kept
    entry.docs.catch(() => {
      if (this.entries.get(key) === entry) this.entries.delete(key)
    })
    this.entries.set(key, entry)
    return entry.docs
  }

  /** Drops every entry of these collections (after a write to them) */
  invalidate(collections: Iterable<string>) {
    const drop = new Set(collections)
    if (drop.size === 0) return
    for (const [key, entry] of this.entries) if (drop.has(entry.collection)) this.entries.delete(key)
  }

  query(q: StoreQuery): Promise<StoredDoc[]> {
    const collection = collectionOf(q.source)
    if (!CACHED_COLLECTIONS.has(collection)) return this.inner.query(q)
    return this.read(`q:${JSON.stringify(q)}`, collection, () => this.inner.query(q))
  }

  getByPaths(paths: string[]): Promise<StoredDoc[]> {
    const collections = new Set(paths.map(collectionOfDoc))
    const [collection] = collections
    if (collections.size !== 1 || !CACHED_COLLECTIONS.has(collection)) return this.inner.getByPaths(paths)
    return this.read(`p:${[...new Set(paths)].sort().join('|')}`, collection, () => this.inner.getByPaths(paths))
  }

  async transaction<T>(fn: (tx: StoreTransaction) => Promise<T>): Promise<T> {
    const written = new Set<string>()
    const record = (path: string) => written.add(collectionOfDoc(path))
    try {
      return await this.inner.transaction((tx) =>
        fn({
          query: (q) => tx.query(q),
          getByPaths: (paths) => tx.getByPaths(paths),
          create: (path, data) => {
            record(path)
            tx.create(path, data)
          },
          set: (path, data) => {
            record(path)
            tx.set(path, data)
          },
          delete: (path) => {
            record(path)
            tx.delete(path)
          },
        })
      )
    } finally {
      // Also after a failed commit: the next read just goes to Firestore
      this.invalidate(written)
    }
  }
}
