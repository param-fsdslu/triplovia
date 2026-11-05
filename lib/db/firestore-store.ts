import type { DocumentReference, DocumentSnapshot, Firestore, Query, Transaction } from 'firebase-admin/firestore'
import type { DocStore, Source, StoreQuery, StoreReader, StoredDoc, StoreTransaction } from './store'
import type { Row } from './types'

/** Firestore caps `in` queries at 30 values */
const IN_CHUNK = 30
const GET_ALL_CHUNK = 300

type Getter = (query: Query) => Promise<{ docs: DocumentSnapshot[] }>

function toDocs(snaps: DocumentSnapshot[]): StoredDoc[] {
  return snaps.filter((s) => s.exists).map((s) => ({ id: s.id, path: s.ref.path, data: s.data() as Row }))
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function isMissingIndex(err: unknown): boolean {
  const code = (err as any)?.code
  return code === 9 || code === 'failed-precondition'
}

/**
 * Filter combinations Firestore rejected for lack of an index (mostly collection-group
 * filters, which need indexes from firestore.indexes.json), and ones known to work.
 * Remembered so later queries go straight to the right attempt.
 */
const unindexed = new Set<string>()
const indexed = new Set<string>()

function sourceKey(source: Source) {
  return source.kind === 'group' ? `group:${source.id}` : `collection:${source.path.split('/').filter((_, i) => i % 2 === 0).join('/')}`
}

/**
 * Runs a pushed-down equality query. If Firestore wants an index for the combination,
 * falls back to fewer conditions; the query layer re-applies every filter in memory, so
 * dropping conditions only costs extra reads, never wrong results.
 *
 * In a transaction a failed read aborts the whole transaction, so `probe` (a plain,
 * non-transactional read) checks unknown combinations first.
 */
async function runQuery(db: Firestore, q: StoreQuery, get: Getter, probe?: Getter): Promise<StoredDoc[]> {
  const base: Query = q.source.kind === 'group' ? db.collectionGroup(q.source.id) : db.collection(q.source.path)

  const build = (equals: StoreQuery['equals'], inValues?: unknown[]) => {
    let query = base
    for (const c of equals) query = query.where(c.column, '==', c.value)
    if (q.in && inValues) query = query.where(q.in.column, 'in', inValues)
    return query
  }

  const execute = async (equals: StoreQuery['equals'], useIn: boolean) => {
    if (useIn && q.in) {
      if (q.in.values.length === 0) return []
      const results = await Promise.all(chunk(q.in.values, IN_CHUNK).map((values) => get(build(equals, values))))
      const seen = new Map<string, StoredDoc>()
      for (const r of results) for (const d of toDocs(r.docs)) seen.set(d.path, d)
      return [...seen.values()]
    }
    return toDocs((await get(build(equals))).docs)
  }

  const attempts: Array<[StoreQuery['equals'], boolean]> = [
    [q.equals, true],
    q.equals.length > 0 ? [q.equals.slice(0, 1), false] : [[], true],
    [[], false],
  ]
  for (const [equals, useIn] of attempts) {
    const fields = [...equals.map((e) => e.column), ...(useIn && q.in ? [q.in.column] : [])]
    const key = `${sourceKey(q.source)}|${fields.join(',')}`
    if (fields.length > 0 && unindexed.has(key)) continue

    if (probe && fields.length > 0 && !indexed.has(key)) {
      const sample = useIn && q.in && q.in.values.length > 0 ? q.in.values.slice(0, 1) : undefined
      try {
        await probe(build(equals, sample).limit(1))
        indexed.add(key)
      } catch (err) {
        if (!isMissingIndex(err)) throw err
        unindexed.add(key)
        continue
      }
    }

    try {
      const docs = await execute(equals, useIn)
      if (fields.length > 0) indexed.add(key)
      return docs
    } catch (err) {
      if (!isMissingIndex(err) || fields.length === 0) throw err
      unindexed.add(key)
    }
  }
  return execute([], false)
}

async function getByPaths(
  db: Firestore,
  paths: string[],
  getAll: (...refs: DocumentReference[]) => Promise<DocumentSnapshot[]>
): Promise<StoredDoc[]> {
  const unique = [...new Set(paths.filter((p) => typeof p === 'string' && p.split('/').length % 2 === 0))]
  if (unique.length === 0) return []
  const snaps = await Promise.all(chunk(unique, GET_ALL_CHUNK).map((part) => getAll(...part.map((p) => db.doc(p)))))
  return toDocs(snaps.flat())
}

class FirestoreTransaction implements StoreTransaction {
  constructor(private db: Firestore, private tx: Transaction) {}

  query(q: StoreQuery) {
    return runQuery(
      this.db,
      q,
      (query) => this.tx.get(query),
      (query) => query.get()
    )
  }

  getByPaths(paths: string[]) {
    return getByPaths(this.db, paths, (...refs) => this.tx.getAll(...refs))
  }

  create(path: string, data: Row) {
    this.tx.create(this.db.doc(path), data)
  }

  set(path: string, data: Row) {
    this.tx.set(this.db.doc(path), data)
  }

  delete(path: string) {
    this.tx.delete(this.db.doc(path))
  }
}

export class FirestoreStore implements DocStore, StoreReader {
  /** getDb is called on first use, so constructing the store needs no credentials */
  constructor(private getDb: () => Firestore) {}

  async query(q: StoreQuery) {
    return runQuery(this.getDb(), q, (query) => query.get())
  }

  async getByPaths(paths: string[]) {
    const db = this.getDb()
    return getByPaths(db, paths, (...refs) => db.getAll(...refs))
  }

  async transaction<T>(fn: (tx: StoreTransaction) => Promise<T>): Promise<T> {
    const db = this.getDb()
    return db.runTransaction((tx) => fn(new FirestoreTransaction(db, tx)))
  }
}
