/**
 * SELECT pipeline: fetch → row policies → filters → embedded resources → count → order → page → project.
 *
 * Only equality conditions are pushed down to Firestore (they need no composite indexes);
 * everything else runs in memory. That keeps every query index-free at the cost of reading
 * all rows that match the equality conditions, which is fine at this app's data volume.
 */
import { createPolicyContext, policiesApply, type ExecContext, type QueryPolicyContext } from './context'
import { filterColumns, matchesAll, type Filter } from './filters'
import { childRowsOf, fetchRows, hasPath, parentOf } from './layout'
import { allowsExisting, type PolicyContext } from './policies'
import { resolveRelation, type Relation } from './relations'
import type { SelectEmbed, SelectSpec } from './select-parser'
import type { StoreReader } from './store'
import type { Row } from './types'
import { compareForSort, primaryKey } from './values'

export interface Order {
  column: string
  ascending: boolean
  nullsFirst?: boolean
  /** Orders the rows of an embedded resource instead of the parent rows */
  referencedTable?: string
}

export interface ReadPlan {
  table: string
  select: SelectSpec
  filters: Filter[]
  orders: Order[]
  offset?: number
  limit?: number
}

/** A row plus its resolved embedded resources (kept apart so `*` stays columns-only) */
interface Rec {
  row: Row
  embeds: Record<string, unknown>
}

/* ------------------------------ fetching ------------------------------ */

/** Fetches candidate rows (equality conditions pushed to Firestore; see layout.ts). */
export function fetchCandidates(reader: StoreReader, table: string, filters: Filter[]): Promise<Row[]> {
  return fetchRows(reader, table, filters)
}

export async function filterVisible(
  ctx: ExecContext,
  table: string,
  rows: Row[],
  policyCtx: PolicyContext
): Promise<Row[]> {
  if (!policiesApply(ctx, table)) return rows
  const visible = await Promise.all(rows.map((row) => allowsExisting(table, 'select', row, policyCtx)))
  return rows.filter((_, i) => visible[i])
}

/* --------------------------- filter routing --------------------------- */

/** Splits filters into this level's filters and filters addressed to embedded aliases. */
function routeFilters(filters: Filter[], embeds: SelectEmbed[]) {
  const aliases = new Set(embeds.map((e) => e.alias))
  const local: Filter[] = []
  const nested = new Map<string, Filter[]>()
  for (const filter of filters) {
    const first = filterColumns(filter)[0] ?? ''
    const dot = first.indexOf('.')
    const alias = dot === -1 ? null : first.slice(0, dot)
    if (alias && aliases.has(alias)) {
      const list = nested.get(alias) ?? []
      list.push(stripPrefix(filter, alias))
      nested.set(alias, list)
    } else {
      local.push(filter)
    }
  }
  return { local, nested }
}

function stripPrefix(filter: Filter, alias: string): Filter {
  if (filter.kind === 'cmp') {
    const prefix = `${alias}.`
    return { ...filter, column: filter.column.startsWith(prefix) ? filter.column.slice(prefix.length) : filter.column }
  }
  return { ...filter, filters: filter.filters.map((f) => stripPrefix(f, alias)) }
}

/* -------------------------- embedded resources ------------------------- */

/** Rows of an embedded resource for the given parent records */
function fetchEmbedChildren(ctx: ExecContext, table: string, recs: Rec[], embed: SelectEmbed, relation: Relation) {
  // Children stored as subcollections of these very rows: read them directly
  const parent = parentOf(embed.table)
  if (
    relation.kind === 'one_to_many' &&
    parent?.table === table &&
    parent.column === relation.foreignColumn &&
    relation.localColumn === primaryKey(table) &&
    recs.every((r) => hasPath(r.row))
  ) {
    return childRowsOf(ctx.store, embed.table, recs.map((r) => r.row))
  }

  const keys = [
    ...new Set(
      recs
        .map((r) => r.row[relation.localColumn])
        .filter((v) => v !== null && v !== undefined)
        .map(String)
    ),
  ]
  if (keys.length === 0) return Promise.resolve([])
  return fetchCandidates(ctx.store, embed.table, [{ kind: 'cmp', column: relation.foreignColumn, op: 'in', value: keys }])
}

async function attachEmbed(
  ctx: ExecContext,
  table: string,
  recs: Rec[],
  embed: SelectEmbed,
  nestedFilters: Map<string, Filter[]>,
  nestedOrders: Map<string, Order[]>,
  policyCtx: QueryPolicyContext
) {
  const relation = resolveRelation(table, embed.table, embed.hint)
  let children = await fetchEmbedChildren(ctx, table, recs, embed, relation)
  policyCtx.prime(embed.table, children)
  children = await filterVisible(ctx, embed.table, children, policyCtx)

  const childPlan = routeFilters(nestedFilters.get(embed.alias) ?? [], embed.select.embeds)
  children = children.filter((row) => matchesAll(row, childPlan.local))

  let childRecs: Rec[] = children.map((row) => ({ row, embeds: {} }))
  childRecs = await resolveEmbeds(ctx, embed.table, childRecs, embed.select.embeds, childPlan.nested, new Map(), policyCtx)
  childRecs = sortRecs(childRecs, nestedOrders.get(embed.alias) ?? [])

  const groups = new Map<string, Row[]>()
  for (const rec of childRecs) {
    const key = String(rec.row[relation.foreignColumn])
    const list = groups.get(key) ?? []
    list.push(project(rec, embed.select))
    groups.set(key, list)
  }

  for (const rec of recs) {
    const key = rec.row[relation.localColumn]
    const matched = key === null || key === undefined ? [] : (groups.get(String(key)) ?? [])
    rec.embeds[embed.alias] = relation.single ? (matched[0] ?? null) : matched
  }
}

async function resolveEmbeds(
  ctx: ExecContext,
  table: string,
  recs: Rec[],
  embeds: SelectEmbed[],
  nestedFilters: Map<string, Filter[]>,
  nestedOrders: Map<string, Order[]>,
  policyCtx: QueryPolicyContext
): Promise<Rec[]> {
  if (recs.length === 0) {
    // Nothing to attach, but unknown relations are still an error (as in PostgREST)
    for (const embed of embeds) resolveRelation(table, embed.table, embed.hint)
    return recs
  }
  // Sibling embeds are independent, so fetch them concurrently; then apply !inner
  await Promise.all(
    embeds.map((embed) => attachEmbed(ctx, table, recs, embed, nestedFilters, nestedOrders, policyCtx))
  )
  let result = recs
  for (const embed of embeds) {
    if (!embed.inner) continue
    result = result.filter((rec) => {
      const value = rec.embeds[embed.alias]
      return Array.isArray(value) ? value.length > 0 : value !== null
    })
  }
  return result
}

/* ------------------------------ ordering ------------------------------ */

function orderValue(rec: Rec, column: string, ascending: boolean): unknown {
  const dot = column.indexOf('.')
  if (dot !== -1 && column.slice(0, dot) in rec.embeds) {
    const embedded = rec.embeds[column.slice(0, dot)]
    const field = column.slice(dot + 1)
    if (Array.isArray(embedded)) {
      // Ordering by a to-many column: use the smallest value ascending, largest descending
      const values = embedded.map((e) => (e as Row)[field]).filter((v) => v !== null && v !== undefined)
      if (values.length === 0) return null
      return values.reduce((best, v) => {
        const c = compareForSort(v, best)
        return (ascending ? c < 0 : c > 0) ? v : best
      })
    }
    return embedded ? (embedded as Row)[field] : null
  }
  return rec.row[column]
}

function sortRecs(recs: Rec[], orders: Order[]): Rec[] {
  if (orders.length === 0) return recs
  return [...recs].sort((a, b) => {
    for (const order of orders) {
      const va = orderValue(a, order.column, order.ascending)
      const vb = orderValue(b, order.column, order.ascending)
      const aNull = va === null || va === undefined
      const bNull = vb === null || vb === undefined
      // Postgres default: NULLS LAST for ASC, NULLS FIRST for DESC
      const nullsFirst = order.nullsFirst ?? !order.ascending
      if (aNull || bNull) {
        if (aNull && bNull) continue
        return aNull === nullsFirst ? -1 : 1
      }
      const c = compareForSort(va, vb)
      if (c !== 0) return order.ascending ? c : -c
    }
    return 0
  })
}

/* ----------------------------- projection ----------------------------- */

function project(rec: Rec, spec: SelectSpec): Row {
  const out: Row = {}
  for (const col of spec.columns) {
    if (col.column === '*') {
      Object.assign(out, rec.row)
    } else {
      out[col.alias] = rec.row[col.column] ?? null
    }
  }
  for (const embed of spec.embeds) out[embed.alias] = rec.embeds[embed.alias] ?? null
  return out
}

/* ------------------------------ pipeline ------------------------------ */

export interface ReadResult {
  rows: Row[]
  count: number
}

/** Runs embeds/filters/order/paging/projection over already-fetched, policy-checked rows. */
export async function shapeRows(
  ctx: ExecContext,
  plan: ReadPlan,
  rows: Row[],
  policyCtx: QueryPolicyContext
): Promise<ReadResult> {
  const routed = routeFilters(plan.filters, plan.select.embeds)
  const filtered = rows.filter((row) => matchesAll(row, routed.local))

  const nestedOrders = new Map<string, Order[]>()
  const rootOrders: Order[] = []
  for (const order of plan.orders) {
    if (order.referencedTable) {
      const list = nestedOrders.get(order.referencedTable) ?? []
      list.push(order)
      nestedOrders.set(order.referencedTable, list)
    } else {
      rootOrders.push(order)
    }
  }

  let recs: Rec[] = filtered.map((row) => ({ row, embeds: {} }))
  recs = await resolveEmbeds(ctx, plan.table, recs, plan.select.embeds, routed.nested, nestedOrders, policyCtx)

  const count = recs.length
  recs = sortRecs(recs, rootOrders)
  const start = plan.offset ?? 0
  const end = plan.limit !== undefined ? start + plan.limit : undefined
  recs = recs.slice(start, end)

  return { rows: recs.map((rec) => project(rec, plan.select)), count }
}

export async function executeRead(ctx: ExecContext, plan: ReadPlan): Promise<ReadResult> {
  const policyCtx = createPolicyContext(ctx)
  const routed = routeFilters(plan.filters, plan.select.embeds)
  let rows = await fetchCandidates(ctx.store, plan.table, routed.local)
  policyCtx.prime(plan.table, rows)
  rows = await filterVisible(ctx, plan.table, rows, policyCtx)
  return shapeRows(ctx, plan, rows, policyCtx)
}
