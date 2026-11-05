/**
 * Tests for the catalogue read cache (cached-store.ts) over MemoryStore. Run with: npm run test:db
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CachedStore, CACHE_TTL_MS } from '../cached-store'
import { DbClient } from '../client'
import { MemoryStore, type StoreQuery } from '../store'

/** A MemoryStore that counts the reads reaching it */
class CountingStore extends MemoryStore {
  reads = 0
  override async query(q: StoreQuery) {
    this.reads++
    return super.query(q)
  }
  override async getByPaths(paths: string[]) {
    this.reads++
    return super.getByPaths(paths)
  }
}

function setup() {
  const inner = new CountingStore()
  const cached = new CachedStore(inner)
  const db = new DbClient({ store: cached, resolveActor: async () => ({ kind: 'service' }), auth: null, storage: null })
  return { inner, db }
}

test('catalogue reads are cached; a write through the store drops them', async () => {
  const { inner, db } = setup()
  await db.from('hotels').insert({ id: 'h1', name: 'Sea View', slug: 'sea-view', city: 'Honnavar' })

  inner.reads = 0
  const first = await db.from('hotels').select('name').eq('id', 'h1').single()
  const readsAfterFirst = inner.reads
  const second = await db.from('hotels').select('name').eq('id', 'h1').single()
  assert.equal(first.data?.name, 'Sea View')
  assert.equal(second.data?.name, 'Sea View')
  assert.ok(readsAfterFirst > 0)
  assert.equal(inner.reads, readsAfterFirst, 'the second read comes from the cache')

  await db.from('hotels').update({ name: 'Sea View Resort' }).eq('id', 'h1')
  const afterWrite = await db.from('hotels').select('name').eq('id', 'h1').single()
  assert.equal(afterWrite.data?.name, 'Sea View Resort', 'the write is seen at once')
})

test('bookings are never cached', async () => {
  const { inner, db } = setup()
  inner.reads = 0
  await db.from('bookings').select('id')
  const once = inner.reads
  await db.from('bookings').select('id')
  assert.equal(inner.reads, once * 2)
})

test('a stale entry is served at once and refreshed behind it', async (t) => {
  const { inner, db } = setup()
  await db.from('hotels').insert({ id: 'h1', name: 'Sea View', slug: 'sea-view', city: 'Honnavar' })
  await db.from('hotels').select('name').eq('id', 'h1').single()

  // Another server changes the row behind this cache (not through it)
  await inner.transaction(async (tx) => {
    const [doc] = await tx.query({ source: { kind: 'collection', path: 'hotels' }, equals: [] })
    tx.set(doc.path, { ...doc.data, name: 'Renamed elsewhere' })
  })

  const now = Date.now()
  t.mock.method(Date, 'now', () => now + CACHE_TTL_MS + 1)
  const stale = await db.from('hotels').select('name').eq('id', 'h1').single()
  assert.equal(stale.data?.name, 'Sea View', 'answers with the old copy')

  await new Promise((resolve) => setTimeout(resolve, 10))
  const refreshed = await db.from('hotels').select('name').eq('id', 'h1').single()
  assert.equal(refreshed.data?.name, 'Renamed elsewhere', 'the background refresh landed')
})
