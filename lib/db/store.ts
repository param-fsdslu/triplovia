/**
 * Minimal document-store interface the query layer runs on. FirestoreStore
 * (firestore-store.ts) is the production implementation; MemoryStore below is an
 * in-process implementation with the same path and transaction semantics, used by tests.
 *
 * Documents are addressed by full path ('hotels/{id}/room_types/{id}'); layout.ts maps
 * tables and rows to paths.
 */
import type { Row } from './types'

export interface StoredDoc {
  id: string
  /** Full document path */
  path: string
  data: Row
}

/** One collection at a path, or every collection with this id anywhere (collection group) */
export type Source = { kind: 'collection'; path: string } | { kind: 'group'; id: string }

/** Equality conditions pushed down to the store; everything else is filtered in memory. */
export interface StoreQuery {
  source: Source
  equals: { column: string; value: unknown }[]
  in?: { column: string; values: unknown[] }
}

export interface StoreReader {
  query(q: StoreQuery): Promise<StoredDoc[]>
  getByPaths(paths: string[]): Promise<StoredDoc[]>
}

export interface StoreTransaction extends StoreReader {
  /** Fails the transaction with ALREADY_EXISTS if the document exists */
  create(path: string, data: Row): void
  set(path: string, data: Row): void
  delete(path: string): void
}

export interface DocStore extends StoreReader {
  /** Runs fn atomically. All reads must happen before the first write (Firestore rule). */
  transaction<T>(fn: (tx: StoreTransaction) => Promise<T>): Promise<T>
}

/** Thrown when create() hits an existing document (mirrors Firestore's ALREADY_EXISTS) */
export class AlreadyExistsError extends Error {
  code = 6
  constructor(public path: string) {
    super(`Document ${path} already exists`)
  }
}

export function isAlreadyExists(err: unknown): boolean {
  return (
    err instanceof AlreadyExistsError ||
    (typeof err === 'object' && err !== null && ((err as any).code === 6 || (err as any).code === 'already-exists'))
  )
}

/** Splits 'a/1/b/2' into its collection path 'a/1/b', collection id 'b' and doc id '2' */
export function splitPath(path: string) {
  const segments = path.split('/')
  const id = segments[segments.length - 1]
  const collectionPath = segments.slice(0, -1).join('/')
  return { id, collectionPath, collectionId: segments[segments.length - 2] }
}

function matches(doc: Row, q: StoreQuery): boolean {
  if (!q.equals.every((c) => doc[c.column] === c.value)) return false
  if (q.in && !q.in.values.includes(doc[q.in.column])) return false
  return true
}

/** In-memory store (tests and local tooling). Writes in a transaction apply on commit. */
export class MemoryStore implements DocStore {
  private docs = new Map<string, Row>()

  private inSource(path: string, source: Source): boolean {
    const { collectionPath, collectionId } = splitPath(path)
    return source.kind === 'collection' ? collectionPath === source.path : collectionId === source.id
  }

  async query(q: StoreQuery): Promise<StoredDoc[]> {
    return [...this.docs.entries()]
      .filter(([path, data]) => this.inSource(path, q.source) && matches(data, q))
      .map(([path, data]) => ({ id: splitPath(path).id, path, data: structuredClone(data) }))
  }

  async getByPaths(paths: string[]): Promise<StoredDoc[]> {
    return paths
      .filter((path) => this.docs.has(path))
      .map((path) => ({ id: splitPath(path).id, path, data: structuredClone(this.docs.get(path)!) }))
  }

  async transaction<T>(fn: (tx: StoreTransaction) => Promise<T>): Promise<T> {
    const writes: Array<() => void> = []
    const tx: StoreTransaction = {
      query: (q) => this.query(q),
      getByPaths: (paths) => this.getByPaths(paths),
      create: (path, data) => {
        writes.push(() => {
          if (this.docs.has(path)) throw new AlreadyExistsError(path)
          this.docs.set(path, structuredClone(data))
        })
      },
      set: (path, data) => {
        writes.push(() => this.docs.set(path, structuredClone(data)))
      },
      delete: (path) => {
        writes.push(() => this.docs.delete(path))
      },
    }
    const result = await fn(tx)
    // Apply all-or-nothing so a failed create leaves no partial writes
    const snapshot = new Map(this.docs)
    try {
      for (const write of writes) write()
    } catch (err) {
      this.docs = snapshot
      throw err
    }
    return result
  }

  /** Test helper: paths of all stored documents */
  paths(): string[] {
    return [...this.docs.keys()].sort()
  }

  /** Test helper: raw document at a path */
  raw(path: string): Row | undefined {
    const doc = this.docs.get(path)
    return doc ? structuredClone(doc) : undefined
  }
}
