/**
 * Where rows live in Firestore. Top-level tables are root collections ('hotels/{id}');
 * tables with a `parent` in schema.ts are subcollections of their parent row
 * ('hotels/{hotel_id}/room_types/{id}', 'hotels/{h}/room_types/{room_type_id}/room_type_images/{id}').
 *
 * Reads that know the parent id query that parent's subcollection directly; reads that
 * don't (e.g. a room type by id) use a collection-group query across all parents.
 * Subcollections keep their table names, which are unique, so a collection group never
 * mixes two tables.
 */
import type { Filter } from './filters'
import { TABLES } from './schema'
import type { StoredDoc, StoreQuery, StoreReader } from './store'
import { DbQueryError, type Row } from './types'
import { coerceForColumn, columnDef, decodeRow, primaryKey } from './values'

/** Document path of each row read from or written to the store */
const rowPaths = new WeakMap<Row, string>()

/**
 * Paths of nested rows seen so far ('room_types/<id>' → 'hotels/<h>/room_types/<id>').
 * A row never changes parent (mutations.ts refuses), so a known path stays valid until the
 * row is deleted, which rowsByIds notices. Saves collection-group lookups by id.
 */
const knownPaths = new Map<string, string>()
const KNOWN_PATHS_MAX = 20_000

export function pathOf(row: Row): string {
  const path = rowPaths.get(row)
  if (!path) throw new Error('Row has no known document path')
  return path
}

export function hasPath(row: Row): boolean {
  return rowPaths.has(row)
}

export function rememberPath(row: Row, path: string): Row {
  rowPaths.set(row, path)
  if (path.split('/').length > 2) {
    if (knownPaths.size >= KNOWN_PATHS_MAX) knownPaths.clear()
    const { collectionId, id } = lastSegment(path)
    knownPaths.set(`${collectionId}/${id}`, path)
  }
  return row
}

function lastSegment(path: string) {
  const segments = path.split('/')
  return { collectionId: segments[segments.length - 2], id: segments[segments.length - 1] }
}

export function parentOf(table: string) {
  return TABLES[table]?.parent
}

export function decodeDocs(table: string, docs: StoredDoc[]): Row[] {
  const pk = primaryKey(table)
  return docs.map((doc) => {
    const row = decodeRow(table, doc.data)
    if (row[pk] === null || row[pk] === undefined) row[pk] = doc.id
    return rememberPath(row, doc.path)
  })
}

/** Rows by primary key, wherever they live */
export async function rowsByIds(reader: StoreReader, table: string, ids: unknown[]): Promise<Row[]> {
  const wanted = [...new Set(ids.filter((v) => v !== null && v !== undefined && v !== '').map(String))]
  if (wanted.length === 0) return []
  if (!parentOf(table)) {
    return decodeDocs(table, await reader.getByPaths(wanted.map((id) => `${table}/${id}`)))
  }

  // Direct reads for rows whose location is known; a collection-group query for the rest
  const search = (ids: string[]) =>
    ids.length
      ? reader
          .query({ source: { kind: 'group', id: table }, equals: [], in: { column: primaryKey(table), values: ids } })
          // A group query may fall back to scanning the whole group, so keep only the requested ids
          .then((docs) => docs.filter((d) => ids.includes(d.id)))
      : Promise.resolve([])
  const cached = wanted.filter((id) => knownPaths.has(`${table}/${id}`))
  const unknown = wanted.filter((id) => !knownPaths.has(`${table}/${id}`))
  const [direct, searched] = await Promise.all([
    cached.length ? reader.getByPaths(cached.map((id) => knownPaths.get(`${table}/${id}`)!)) : Promise.resolve([]),
    search(unknown),
  ])

  // Not at the remembered path: deleted, or re-created elsewhere with the same id — search again
  const found = new Set(direct.map((d) => d.id))
  const missed = cached.filter((id) => !found.has(id))
  for (const id of missed) knownPaths.delete(`${table}/${id}`)
  const researched = await search(missed)

  return decodeDocs(table, [...direct, ...searched, ...researched])
}

/** Child rows of the given parent rows (which carry their paths), read straight from the subcollections */
export async function childRowsOf(reader: StoreReader, table: string, parents: Row[]): Promise<Row[]> {
  const results = await Promise.all(
    parents.map((p) => reader.query({ source: { kind: 'collection', path: `${pathOf(p)}/${table}` }, equals: [] }))
  )
  return decodeDocs(table, results.flat())
}

type Cmp = Extract<Filter, { kind: 'cmp' }>

/** Fetches candidate rows using the equality conditions Firestore can serve; callers filter the rest. */
export async function fetchRows(reader: StoreReader, table: string, filters: Filter[]): Promise<Row[]> {
  const pk = primaryKey(table)
  const known = (column: string) => column === pk || columnDef(table, column) !== undefined
  const plain = filters.filter(
    (f): f is Cmp => f.kind === 'cmp' && !f.negate && !f.column.includes('.') && known(f.column)
  )
  const value = (f: Cmp) => coerceForColumn(table, f.column, f.value)
  const values = (f: Cmp) =>
    (f.value as unknown[]).filter((v) => v !== null && v !== undefined).map((v) => coerceForColumn(table, f.column, v))

  const pkEq = plain.find((f) => f.op === 'eq' && f.column === pk && f.value !== null && f.value !== undefined)
  if (pkEq) return rowsByIds(reader, table, [value(pkEq)])
  const pkIn = plain.find((f) => f.op === 'in' && f.column === pk && Array.isArray(f.value))
  if (pkIn) return rowsByIds(reader, table, values(pkIn))

  const parent = parentOf(table)
  const parentEq = parent && plain.find((f) => f.op === 'eq' && f.column === parent.column && f.value !== null && f.value !== undefined)
  const parentIn = parent && !parentEq && plain.find((f) => f.op === 'in' && f.column === parent.column && Array.isArray(f.value))

  const equals = plain
    .filter((f) => f.op === 'eq' && f.value !== null && f.value !== undefined && f !== parentEq)
    .map((f) => ({ column: f.column, value: value(f) }))
  const inFilter = plain.find((f) => f.op === 'in' && Array.isArray(f.value) && f !== parentIn)
  const inClause: StoreQuery['in'] = inFilter ? { column: inFilter.column, values: values(inFilter) } : undefined

  if (parent && (parentEq || parentIn)) {
    // Query only the subcollections of the requested parents
    const parentIds = parentEq ? [value(parentEq)] : values(parentIn as Cmp)
    const parents = await rowsByIds(reader, parent.table, parentIds)
    const results = await Promise.all(
      parents.map((p) => reader.query({ source: { kind: 'collection', path: `${pathOf(p)}/${table}` }, equals, in: inClause }))
    )
    return decodeDocs(table, results.flat())
  }

  const source: StoreQuery['source'] = parent ? { kind: 'group', id: table } : { kind: 'collection', path: table }
  return decodeDocs(table, await reader.query({ source, equals, in: inClause }))
}

/**
 * Path for a new row. Nested rows go under their parent, which must exist — the same
 * guarantee the Postgres foreign key gave (error 23503 otherwise).
 */
export async function pathForNewRow(reader: StoreReader, table: string, row: Row): Promise<string> {
  const id = String(row[primaryKey(table)])
  const parent = parentOf(table)
  if (!parent) return `${table}/${id}`

  const parentId = row[parent.column]
  if (parentId === null || parentId === undefined) {
    throw new DbQueryError(`null value in column "${parent.column}" of relation "${table}" violates not-null constraint`, '23502')
  }
  const [parentRow] = await rowsByIds(reader, parent.table, [parentId])
  if (!parentRow) {
    const fk = TABLES[table].fks.find((f) => f.column === parent.column)
    throw new DbQueryError(
      `insert or update on table "${table}" violates foreign key constraint "${fk?.name ?? `${table}_${parent.column}_fkey`}"`,
      '23503',
      `Key (${parent.column})=(${parentId}) is not present in table "${parent.table}".`
    )
  }
  return `${pathOf(parentRow)}/${table}/${id}`
}
