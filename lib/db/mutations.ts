/**
 * INSERT / UPDATE / DELETE / UPSERT with the guarantees the app relied on from Postgres:
 *   - column defaults and type casts (values.ts), trigger replacements (hooks.ts)
 *   - unique constraints: every unique key owns a sentinel document in `_unique`, created in
 *     the same Firestore transaction as the row, so concurrent duplicates fail with 23505
 *     (this is what keeps payment verification idempotent on payment_gateway_payment_id)
 *   - conditional updates (`.update(...).eq('payment_status', 'pending')`) are atomic: the
 *     matching rows are read inside the transaction that writes them
 *   - ON DELETE CASCADE / SET NULL / RESTRICT from the foreign keys in schema.ts (this also
 *     removes subcollection documents, which Firestore would otherwise leave behind)
 *   - nested rows can only be created under an existing parent (layout.ts)
 *   - row policies (policies.ts) for user-scoped clients
 */
import { createHash } from 'node:crypto'
import { createPolicyContext, policiesApply, type ExecContext } from './context'
import { matchesAll, type Filter } from './filters'
import { afterWrite, beforeWrite, type FollowUpInsert } from './hooks'
import { parentOf, pathForNewRow, pathOf, rememberPath } from './layout'
import { allowsExisting, allowsNew, type PolicyContext } from './policies'
import { fetchCandidates } from './read'
import { TABLES } from './schema'
import { isAlreadyExists, type StoreReader, type StoreTransaction } from './store'
import { DbQueryError, type Row } from './types'
import { coerceRow, encodeRow, primaryKey, valuesEqual, withDefaults } from './values'
import { serverLog } from '../utils/server-log'

export const UNIQUE_COLLECTION = '_unique'

const uniquePath = (id: string) => `${UNIQUE_COLLECTION}/${id}`

interface UniqueKey {
  id: string
  constraint: string
  columns: string[]
  values: unknown[]
}

function uniqueKeys(table: string, row: Row): UniqueKey[] {
  const def = TABLES[table]
  if (!def) return []
  const keys: UniqueKey[] = []
  for (const columns of def.unique) {
    const values = columns.map((c) => row[c])
    // Postgres unique constraints ignore rows with a NULL in the key
    if (values.some((v) => v === null || v === undefined)) continue
    const hash = createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 40)
    keys.push({
      id: `${table}__${columns.join('+')}__${hash}`,
      constraint: `${table}_${columns.join('_')}_key`,
      columns,
      values,
    })
  }
  return keys
}

function uniqueViolation(table: string, key: UniqueKey | null): DbQueryError {
  if (!key) {
    return new DbQueryError(`duplicate key value violates unique constraint "${table}_pkey"`, '23505')
  }
  return new DbQueryError(
    `duplicate key value violates unique constraint "${key.constraint}"`,
    '23505',
    `Key (${key.columns.join(', ')})=(${key.values.join(', ')}) already exists.`
  )
}

function policyViolation(table: string): DbQueryError {
  return new DbQueryError(`new row violates row-level security policy for table "${table}"`, '42501')
}

function sentinelDoc(table: string, rowId: string, key: UniqueKey): Row {
  return { table, row_id: rowId, columns: key.columns, created_at: new Date().toISOString() }
}

/** Nested rows can't change parent: Firestore can't move a document with its subcollections */
function assertSameParent(table: string, before: Row, after: Row) {
  const parent = parentOf(table)
  if (parent && String(after[parent.column]) !== String(before[parent.column])) {
    throw new DbQueryError(`Moving a ${table} row to a different ${parent.table} row is not supported`, '0A000')
  }
}

/** Runs trigger follow-ups (payment audit rows) as the service role, outside the main transaction. */
async function runFollowUps(ctx: ExecContext, followUps: FollowUpInsert[]) {
  for (const f of followUps) {
    try {
      await executeInsert({ store: ctx.store, actor: { kind: 'service' } }, f.table, [f.row])
    } catch (err) {
      serverLog.error(`[db] ${f.table} follow-up insert failed:`, err)
    }
  }
}

/* -------------------------------- insert -------------------------------- */

function prepareInsertRow(table: string, input: Row): Row {
  const row = beforeWrite(table, withDefaults(table, coerceRow(table, input)), 'insert')
  const pk = primaryKey(table)
  if (row[pk] === null || row[pk] === undefined) {
    throw new DbQueryError(`null value in column "${pk}" of relation "${table}" violates not-null constraint`, '23502')
  }
  row[pk] = String(row[pk])
  return row
}

async function checkInsertPolicies(ctx: ExecContext, table: string, rows: Row[], policyCtx: PolicyContext) {
  if (!policiesApply(ctx, table)) return
  for (const row of rows) {
    if (!(await allowsNew(table, 'insert', row, policyCtx))) throw policyViolation(table)
  }
}

/** Reads (inside the transaction) whether any of the keys are taken; throws 23505 if so */
async function assertKeysFree(tx: StoreTransaction, table: string, keyLists: UniqueKey[][]) {
  const seen = new Map<string, UniqueKey>()
  for (const key of keyLists.flat()) {
    if (seen.has(key.id)) throw uniqueViolation(table, key)
    seen.set(key.id, key)
  }
  const taken = await tx.getByPaths([...seen.keys()].map(uniquePath))
  if (taken.length > 0) throw uniqueViolation(table, seen.get(taken[0].id) ?? null)
}

function writeInserts(tx: StoreTransaction, table: string, rows: Row[], keyLists: UniqueKey[][]) {
  const pk = primaryKey(table)
  rows.forEach((row, i) => {
    tx.create(pathOf(row), encodeRow(table, row))
    for (const key of keyLists[i]) tx.create(uniquePath(key.id), sentinelDoc(table, row[pk], key))
  })
}

export async function executeInsert(ctx: ExecContext, table: string, inputs: Row[]): Promise<Row[]> {
  const rows = inputs.map((input) => prepareInsertRow(table, input))
  const policyCtx = createPolicyContext(ctx)
  await checkInsertPolicies(ctx, table, rows, policyCtx)

  try {
    await ctx.store.transaction(async (tx) => {
      for (const row of rows) rememberPath(row, await pathForNewRow(tx, table, row))
      const keyLists = rows.map((row) => uniqueKeys(table, row))
      await assertKeysFree(tx, table, keyLists)
      writeInserts(tx, table, rows, keyLists)
    })
  } catch (err) {
    if (isAlreadyExists(err)) throw uniqueViolation(table, null)
    throw err
  }

  await runFollowUps(ctx, rows.flatMap((row) => afterWrite(table, row, 'insert')))
  return rows
}

/* -------------------------------- update -------------------------------- */

interface PlannedUpdate {
  before: Row
  after: Row
}

/** Applies sentinel changes for updated rows; must be called after all transaction reads. */
async function readSentinelsForUpdates(tx: StoreTransaction, table: string, updates: PlannedUpdate[]) {
  const pk = primaryKey(table)
  const adds: Array<{ rowId: string; key: UniqueKey }> = []
  const removes: string[] = []
  for (const { before, after } of updates) {
    const oldKeys = new Map(uniqueKeys(table, before).map((k) => [k.id, k]))
    const newKeys = uniqueKeys(table, after)
    for (const key of newKeys) {
      if (!oldKeys.has(key.id)) adds.push({ rowId: after[pk], key })
    }
    const newIds = new Set(newKeys.map((k) => k.id))
    for (const id of oldKeys.keys()) if (!newIds.has(id)) removes.push(id)
  }

  const addIds = new Map<string, { rowId: string; key: UniqueKey }>()
  for (const add of adds) {
    if (addIds.has(add.key.id)) throw uniqueViolation(table, add.key)
    addIds.set(add.key.id, add)
  }
  const existing = await tx.getByPaths([...addIds.keys()].map(uniquePath))
  for (const doc of existing) {
    // A key freed by another row in this same statement is fine (e.g. swapping values)
    if (!removes.includes(doc.id)) throw uniqueViolation(table, addIds.get(doc.id)!.key)
  }

  return () => {
    for (const id of removes) {
      if (!addIds.has(id)) tx.delete(uniquePath(id))
    }
    for (const { rowId, key } of addIds.values()) tx.set(uniquePath(key.id), sentinelDoc(table, rowId, key))
  }
}

function writeUpdates(tx: StoreTransaction, table: string, updates: PlannedUpdate[]) {
  for (const { before, after } of updates) {
    const path = pathOf(before)
    rememberPath(after, path)
    tx.set(path, encodeRow(table, after))
  }
}

async function selectTargets(
  reader: StoreReader,
  ctx: ExecContext,
  table: string,
  filters: Filter[],
  command: 'update' | 'delete',
  policyCtx: PolicyContext
): Promise<Row[]> {
  let rows = (await fetchCandidates(reader, table, filters)).filter((row) => matchesAll(row, filters))
  if (policiesApply(ctx, table)) {
    const allowed = await Promise.all(rows.map((row) => allowsExisting(table, command, row, policyCtx)))
    rows = rows.filter((_, i) => allowed[i])
  }
  return rows
}

export async function executeUpdate(ctx: ExecContext, table: string, patch: Row, filters: Filter[]): Promise<Row[]> {
  const changes = coerceRow(table, patch)
  const pk = primaryKey(table)
  const policyCtx = createPolicyContext(ctx)

  const updated = await ctx.store.transaction(async (tx) => {
    const targets = await selectTargets(tx, ctx, table, filters, 'update', policyCtx)
    const planned: PlannedUpdate[] = targets.map((before) => {
      if (changes[pk] !== undefined && String(changes[pk]) !== String(before[pk])) {
        throw new DbQueryError(`Changing the primary key of ${table} is not supported`, '0A000')
      }
      const after = beforeWrite(table, { ...before, ...changes }, 'update')
      assertSameParent(table, before, after)
      return { before, after }
    })

    if (policiesApply(ctx, table)) {
      for (const { after } of planned) {
        if (!(await allowsNew(table, 'update', after, policyCtx))) throw policyViolation(table)
      }
    }

    const applySentinels = await readSentinelsForUpdates(tx, table, planned)
    writeUpdates(tx, table, planned)
    applySentinels()
    return planned.map((p) => p.after)
  })

  await runFollowUps(ctx, updated.flatMap((row) => afterWrite(table, row, 'update')))
  return updated
}

/* -------------------------------- upsert -------------------------------- */

export interface UpsertOptions {
  onConflict?: string
  ignoreDuplicates?: boolean
}

export async function executeUpsert(
  ctx: ExecContext,
  table: string,
  inputs: Row[],
  options: UpsertOptions
): Promise<Row[]> {
  const pk = primaryKey(table)
  const conflict = options.onConflict
    ? options.onConflict.split(',').map((c) => c.trim())
    : [pk]
  const policyCtx = createPolicyContext(ctx)

  const result = await ctx.store.transaction(async (tx) => {
    const inserts: Row[] = []
    const updates: PlannedUpdate[] = []

    for (const input of inputs) {
      const values = coerceRow(table, input)
      const conflictFilters: Filter[] = conflict.map((column) => ({
        kind: 'cmp' as const,
        column,
        op: 'eq' as const,
        value: values[column] ?? null,
      }))
      const existing = conflict.some((c) => values[c] === undefined || values[c] === null)
        ? []
        : (await fetchCandidates(tx, table, conflictFilters)).filter((row) => matchesAll(row, conflictFilters))

      if (existing.length > 0) {
        if (options.ignoreDuplicates) continue
        const before = existing[0]
        const after = beforeWrite(table, { ...before, ...values, [pk]: before[pk] }, 'update')
        assertSameParent(table, before, after)
        updates.push({ before, after })
      } else {
        const row = prepareInsertRow(table, values)
        rememberPath(row, await pathForNewRow(tx, table, row))
        inserts.push(row)
      }
    }

    if (policiesApply(ctx, table)) {
      for (const row of inserts) {
        if (!(await allowsNew(table, 'insert', row, policyCtx))) throw policyViolation(table)
      }
      for (const { before, after } of updates) {
        const ok =
          (await allowsExisting(table, 'update', before, policyCtx)) &&
          (await allowsNew(table, 'update', after, policyCtx))
        if (!ok) throw policyViolation(table)
      }
    }

    const insertKeys = inserts.map((row) => uniqueKeys(table, row))
    await assertKeysFree(tx, table, insertKeys)
    const applySentinels = await readSentinelsForUpdates(tx, table, updates)

    writeInserts(tx, table, inserts, insertKeys)
    writeUpdates(tx, table, updates)
    applySentinels()

    return { inserts, updated: updates.map((u) => u.after) }
  }).catch((err) => {
    if (isAlreadyExists(err)) throw uniqueViolation(table, null)
    throw err
  })

  await runFollowUps(ctx, [
    ...result.inserts.flatMap((row) => afterWrite(table, row, 'insert')),
    ...result.updated.flatMap((row) => afterWrite(table, row, 'update')),
  ])
  return [...result.inserts, ...result.updated]
}

/* -------------------------------- delete -------------------------------- */

interface DeletePlan {
  deletes: Array<{ table: string; row: Row }>
  nullify: Array<{ table: string; row: Row; column: string }>
}

/** Walks foreign keys that reference the deleted rows (inside the transaction, before writes). */
async function planCascade(
  tx: StoreTransaction,
  table: string,
  rows: Row[],
  plan: DeletePlan,
  visited: Set<string>
) {
  const pending: Row[] = []
  for (const row of rows) {
    const key = `${table}/${row[primaryKey(table)]}`
    if (visited.has(key)) continue
    visited.add(key)
    plan.deletes.push({ table, row })
    pending.push(row)
  }
  if (pending.length === 0) return

  for (const [childTable, def] of Object.entries(TABLES)) {
    for (const fk of def.fks) {
      if (fk.refTable !== table) continue
      const parentValues = pending.map((r) => r[fk.refColumn]).filter((v) => v !== null && v !== undefined)
      if (parentValues.length === 0) continue
      const children = await fetchCandidates(tx, childTable, [
        { kind: 'cmp', column: fk.column, op: 'in', value: parentValues },
      ])
      const referencing = children.filter((child) => parentValues.some((v) => valuesEqual(child[fk.column], v)))
      if (referencing.length === 0) continue

      if (fk.onDelete === 'cascade') {
        await planCascade(tx, childTable, referencing, plan, visited)
      } else if (fk.onDelete === 'set_null') {
        for (const child of referencing) plan.nullify.push({ table: childTable, row: child, column: fk.column })
      } else {
        throw new DbQueryError(
          `update or delete on table "${table}" violates foreign key constraint "${fk.name}" on table "${childTable}"`,
          '23503',
          `Key (${fk.refColumn})=(${referencing[0][fk.column]}) is still referenced from table "${childTable}".`
        )
      }
    }
  }
}

export async function executeDelete(ctx: ExecContext, table: string, filters: Filter[]): Promise<Row[]> {
  const policyCtx = createPolicyContext(ctx)
  return ctx.store.transaction(async (tx) => {
    const targets = await selectTargets(tx, ctx, table, filters, 'delete', policyCtx)
    const plan: DeletePlan = { deletes: [], nullify: [] }
    await planCascade(tx, table, targets, plan, new Set())

    const deleted = new Set(plan.deletes.map((d) => pathOf(d.row)))
    const nullified = new Map<string, { table: string; original: Row; row: Row }>()
    for (const n of plan.nullify) {
      const path = pathOf(n.row)
      if (deleted.has(path)) continue
      const entry = nullified.get(path) ?? { table: n.table, original: n.row, row: { ...n.row } }
      entry.row[n.column] = null
      nullified.set(path, entry)
    }

    for (const { table: t, row } of plan.deletes) {
      tx.delete(pathOf(row))
      for (const key of uniqueKeys(t, row)) tx.delete(uniquePath(key.id))
    }
    for (const [path, { table: t, original, row }] of nullified) {
      tx.set(path, encodeRow(t, row))
      // A NULL in a unique key releases it (Postgres ignores NULL keys)
      const kept = new Set(uniqueKeys(t, row).map((k) => k.id))
      for (const key of uniqueKeys(t, original)) if (!kept.has(key.id)) tx.delete(uniquePath(key.id))
    }
    return targets
  })
}
