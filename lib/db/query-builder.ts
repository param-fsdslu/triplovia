/**
 * PostgREST-style query builder over Firestore. Mirrors the subset of the supabase-js
 * builder API this app uses, so call sites read the same as before the migration:
 *
 *   const { data, error } = await db.from('bookings')
 *     .select('*, hotel:hotels(name)').eq('user_id', id).order('created_at', { ascending: false })
 *
 * Builders are thenable; awaiting one executes it and resolves to { data, error, count }.
 * Errors are returned, never thrown, like supabase-js.
 */
import { createPolicyContext, policiesApply, type ExecContext } from './context'
import { parseOperatorValue, parseOrFilter, type Filter, type FilterOp } from './filters'
import { executeDelete, executeInsert, executeUpdate, executeUpsert, type UpsertOptions } from './mutations'
import { executeRead, filterVisible, shapeRows, type Order } from './read'
import { parseSelect } from './select-parser'
import { DbQueryError, toDbError, type DbError, type DbResponse, type Row } from './types'
import { serverLog } from '../utils/server-log'

type Operation = 'select' | 'insert' | 'update' | 'upsert' | 'delete'

interface SelectOptions {
  count?: 'exact' | 'planned' | 'estimated'
  head?: boolean
}

interface OrderOptions {
  ascending?: boolean
  nullsFirst?: boolean
  referencedTable?: string
  foreignTable?: string
}

const NO_ROWS_MESSAGE = 'JSON object requested, multiple (or no) rows returned'

/** T is the type of `data`: an array of rows, or a single row after single()/maybeSingle() */
export class QueryBuilder<T = any[]> implements PromiseLike<DbResponse<T>> {
  private operation: Operation = 'select'
  private selectColumns: string | null = null
  private countRequested = false
  private headOnly = false
  private filters: Filter[] = []
  private orders: Order[] = []
  private offset?: number
  private limitCount?: number
  private singleMode: 'single' | 'maybe' | null = null
  private payload: Row | Row[] | null = null
  private upsertOptions: UpsertOptions = {}

  /** getContext resolves who the query runs as; it is only awaited when the query executes */
  constructor(
    private getContext: () => Promise<ExecContext>,
    private table: string
  ) {}

  /* ------------------------------ operations ------------------------------ */

  select(columns = '*', options: SelectOptions = {}): QueryBuilder<T> {
    // After insert/update/upsert/delete, select() means RETURNING
    this.selectColumns = columns
    if (options.count) this.countRequested = true
    if (options.head) this.headOnly = true
    return this
  }

  insert(values: Row | Row[], options: { count?: 'exact' } = {}): QueryBuilder<T> {
    this.operation = 'insert'
    this.payload = values
    if (options.count) this.countRequested = true
    return this
  }

  upsert(values: Row | Row[], options: UpsertOptions & { count?: 'exact' } = {}): QueryBuilder<T> {
    this.operation = 'upsert'
    this.payload = values
    this.upsertOptions = { onConflict: options.onConflict, ignoreDuplicates: options.ignoreDuplicates }
    if (options.count) this.countRequested = true
    return this
  }

  update(values: Row, options: { count?: 'exact' } = {}): QueryBuilder<T> {
    this.operation = 'update'
    this.payload = values
    if (options.count) this.countRequested = true
    return this
  }

  delete(options: { count?: 'exact' } = {}): QueryBuilder<T> {
    this.operation = 'delete'
    if (options.count) this.countRequested = true
    return this
  }

  /* -------------------------------- filters -------------------------------- */

  private cmp(column: string, op: FilterOp, value: unknown, negate = false): QueryBuilder<T> {
    this.filters.push({ kind: 'cmp', column, op, value, negate })
    return this
  }

  eq(column: string, value: unknown) {
    return this.cmp(column, 'eq', value)
  }
  neq(column: string, value: unknown) {
    return this.cmp(column, 'neq', value)
  }
  gt(column: string, value: unknown) {
    return this.cmp(column, 'gt', value)
  }
  gte(column: string, value: unknown) {
    return this.cmp(column, 'gte', value)
  }
  lt(column: string, value: unknown) {
    return this.cmp(column, 'lt', value)
  }
  lte(column: string, value: unknown) {
    return this.cmp(column, 'lte', value)
  }
  like(column: string, pattern: string) {
    return this.cmp(column, 'like', pattern)
  }
  ilike(column: string, pattern: string) {
    return this.cmp(column, 'ilike', pattern)
  }
  is(column: string, value: null | boolean) {
    return this.cmp(column, 'is', value)
  }
  in(column: string, values: readonly unknown[]) {
    return this.cmp(column, 'in', [...values])
  }
  contains(column: string, value: unknown) {
    return this.cmp(column, 'cs', value)
  }
  containedBy(column: string, value: unknown) {
    return this.cmp(column, 'cd', value)
  }

  match(query: Row) {
    for (const [column, value] of Object.entries(query)) this.cmp(column, 'eq', value)
    return this
  }

  /** `.not('status', 'eq', 'cancelled')`, `.not('deleted_at', 'is', null)` */
  not(column: string, operator: string, value: unknown) {
    const op = operator as FilterOp
    const parsed = typeof value === 'string' ? parseOperatorValue(op, value) : value
    return this.cmp(column, op, parsed, true)
  }

  /** `.filter('status', 'in', '(a,b)')` — raw PostgREST operator syntax */
  filter(column: string, operator: string, value: unknown) {
    if (operator.startsWith('not.')) return this.not(column, operator.slice(4), value)
    const op = operator as FilterOp
    const parsed = typeof value === 'string' ? parseOperatorValue(op, value) : value
    return this.cmp(column, op, parsed)
  }

  or(expression: string, options: { referencedTable?: string; foreignTable?: string } = {}) {
    this.filters.push(parseOrFilter(expression, options.referencedTable ?? options.foreignTable))
    return this
  }

  /* ------------------------------- modifiers ------------------------------- */

  order(column: string, options: OrderOptions = {}) {
    this.orders.push({
      column,
      ascending: options.ascending ?? true,
      nullsFirst: options.nullsFirst,
      referencedTable: options.referencedTable ?? options.foreignTable,
    })
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  range(from: number, to: number) {
    this.offset = from
    this.limitCount = to - from + 1
    return this
  }

  single(): QueryBuilder<any> {
    this.singleMode = 'single'
    return this
  }

  maybeSingle(): QueryBuilder<any> {
    this.singleMode = 'maybe'
    return this
  }

  /* ------------------------------- execution ------------------------------- */

  then<R1 = DbResponse<T>, R2 = never>(
    onfulfilled?: ((value: DbResponse<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute(): Promise<DbResponse<T>> {
    try {
      const { rows, count } = await this.run()
      return this.respond(rows, count)
    } catch (err) {
      if (isFrameworkSignal(err)) throw err
      if (!(err instanceof DbQueryError)) serverLog.error(`[db] ${this.operation} on ${this.table} failed:`, err)
      return this.fail(toDbError(err))
    }
  }

  private async run(): Promise<{ rows: Row[] | null; count: number | null }> {
    const ctx = await this.getContext()
    const select = parseSelect(this.selectColumns)

    if (this.operation === 'select') {
      const result = await executeRead(ctx, {
        table: this.table,
        select,
        filters: this.filters,
        orders: this.orders,
        offset: this.offset,
        limit: this.limitCount,
      })
      return { rows: this.headOnly ? null : result.rows, count: this.countRequested ? result.count : null }
    }

    let affected: Row[]
    switch (this.operation) {
      case 'insert':
        affected = await executeInsert(ctx, this.table, toArray(this.payload))
        break
      case 'upsert':
        affected = await executeUpsert(ctx, this.table, toArray(this.payload), this.upsertOptions)
        break
      case 'update':
        affected = await executeUpdate(ctx, this.table, (this.payload as Row) ?? {}, this.filters)
        break
      case 'delete':
        affected = await executeDelete(ctx, this.table, this.filters)
        break
    }

    const count = this.countRequested ? affected.length : null
    if (this.selectColumns === null) return { rows: null, count }

    // RETURNING: shape the written rows with the requested columns/embeds
    const policyCtx = createPolicyContext(ctx)
    const visible = await filterVisible(ctx, this.table, affected, policyCtx)
    if (this.operation === 'insert' && policiesApply(ctx, this.table) && visible.length < affected.length) {
      throw new DbQueryError(`new row violates row-level security policy for table "${this.table}"`, '42501')
    }
    const shaped = await shapeRows(
      ctx,
      { table: this.table, select, filters: [], orders: this.orders, offset: this.offset, limit: this.limitCount },
      visible,
      policyCtx
    )
    return { rows: shaped.rows, count }
  }

  private respond(rows: Row[] | null, count: number | null): DbResponse<T> {
    if (this.singleMode && rows !== null) {
      if (rows.length === 1) return this.ok(rows[0] as T, count)
      if (rows.length === 0 && this.singleMode === 'maybe') return this.ok(null as T, count)
      return this.fail(
        {
          message: NO_ROWS_MESSAGE,
          code: 'PGRST116',
          details: `The result contains ${rows.length} rows`,
          hint: null,
        },
        406
      )
    }
    const status = this.operation === 'insert' || this.operation === 'upsert' ? 201 : rows === null && this.operation !== 'select' ? 204 : 200
    return this.ok((rows ?? null) as T, count, status)
  }

  private ok(data: T, count: number | null, status = 200): DbResponse<T> {
    return { data, error: null, count, status, statusText: status === 201 ? 'Created' : status === 204 ? 'No Content' : 'OK' }
  }

  private fail(error: DbError, status = 400): DbResponse<T> {
    return { data: null as T, error, count: null, status, statusText: 'Error' }
  }
}

/**
 * Next.js control-flow errors (dynamic-rendering bailout, redirect, notFound) carry a
 * `digest` and must propagate instead of becoming `{ error }` results.
 */
export function isFrameworkSignal(err: unknown): boolean {
  return typeof err === 'object' && err !== null && typeof (err as { digest?: unknown }).digest === 'string'
}

function toArray(payload: Row | Row[] | null): Row[] {
  if (payload === null) return []
  return Array.isArray(payload) ? payload : [payload]
}
