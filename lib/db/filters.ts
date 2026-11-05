/**
 * Filter model and in-memory evaluation with SQL three-valued logic
 * (a comparison against NULL is unknown, and only rows where the whole
 * condition is true are returned).
 */
import { splitTopLevel } from './select-parser'
import { compareValues, likeToRegExp, valuesEqual } from './values'
import type { Row } from './types'

export type FilterOp =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'is' | 'in' | 'cs' | 'cd'

export type Filter =
  | { kind: 'cmp'; column: string; op: FilterOp; value: unknown; negate?: boolean }
  | { kind: 'or'; filters: Filter[]; negate?: boolean }
  | { kind: 'and'; filters: Filter[]; negate?: boolean }

type Tri = boolean | null

function evalCmp(rowValue: unknown, op: FilterOp, value: unknown): Tri {
  if (op === 'is') {
    if (value === null || value === 'null') return rowValue === null || rowValue === undefined
    const target = value === true || value === 'true'
    if (rowValue === null || rowValue === undefined) return false
    return rowValue === target
  }
  if (rowValue === null || rowValue === undefined) return null

  switch (op) {
    case 'eq':
      if (value === null) return null
      return valuesEqual(rowValue, value)
    case 'neq':
      if (value === null) return null
      return !valuesEqual(rowValue, value)
    case 'gt':
      return value === null ? null : compareValues(rowValue, value) > 0
    case 'gte':
      return value === null ? null : compareValues(rowValue, value) >= 0
    case 'lt':
      return value === null ? null : compareValues(rowValue, value) < 0
    case 'lte':
      return value === null ? null : compareValues(rowValue, value) <= 0
    case 'like':
    case 'ilike':
      return likeToRegExp(String(value), op === 'ilike').test(String(rowValue))
    case 'in': {
      const list = Array.isArray(value) ? value : [value]
      return list.some((v) => valuesEqual(rowValue, v))
    }
    case 'cs': {
      // array contains: every element of value is in the column
      if (Array.isArray(rowValue)) {
        const list = Array.isArray(value) ? value : [value]
        return list.every((v) => rowValue.some((r) => valuesEqual(r, v)))
      }
      if (typeof rowValue === 'object' && typeof value === 'object' && value !== null) {
        return Object.entries(value as Row).every(([k, v]) => valuesEqual((rowValue as Row)[k], v))
      }
      return false
    }
    case 'cd': {
      // contained by: every element of the column is in value
      if (Array.isArray(rowValue)) {
        const list = Array.isArray(value) ? value : [value]
        return rowValue.every((r) => list.some((v) => valuesEqual(r, v)))
      }
      return false
    }
  }
}

function not(v: Tri): Tri {
  return v === null ? null : !v
}

export function evaluateFilter(row: Row, filter: Filter, getValue = defaultGetValue): Tri {
  let result: Tri
  if (filter.kind === 'cmp') {
    result = evalCmp(getValue(row, filter.column), filter.op, filter.value)
  } else if (filter.kind === 'and') {
    result = true
    for (const f of filter.filters) {
      const v = evaluateFilter(row, f, getValue)
      if (v === false) {
        result = false
        break
      }
      if (v === null) result = null
    }
  } else {
    result = false
    for (const f of filter.filters) {
      const v = evaluateFilter(row, f, getValue)
      if (v === true) {
        result = true
        break
      }
      if (v === null) result = null
    }
  }
  return filter.negate ? not(result) : result
}

export function matchesAll(row: Row, filters: Filter[], getValue = defaultGetValue): boolean {
  return filters.every((f) => evaluateFilter(row, f, getValue) === true)
}

function defaultGetValue(row: Row, column: string): unknown {
  return row[column]
}

/** Columns referenced by a filter tree (used to route filters to embedded resources). */
export function filterColumns(filter: Filter): string[] {
  if (filter.kind === 'cmp') return [filter.column]
  return filter.filters.flatMap(filterColumns)
}

/* ------------------------------------------------------------------ */
/* PostgREST filter-string parsing (used by .or(), .not(), .filter())   */
/* ------------------------------------------------------------------ */

const OPS = new Set<string>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'cs', 'cd'])

function stripQuotes(v: string): string {
  return v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v
}

/** Parses a PostgREST operator value: `in.(a,b)`, `is.null`, `cs.{a,b}`, plain literals. */
export function parseOperatorValue(op: FilterOp, raw: string): unknown {
  if (op === 'in') {
    const inner = raw.replace(/^\(/, '').replace(/\)$/, '')
    return splitTopLevel(inner).map(stripQuotes)
  }
  if (op === 'cs' || op === 'cd') {
    const inner = raw.replace(/^\{/, '').replace(/\}$/, '')
    return inner === '' ? [] : splitTopLevel(inner).map(stripQuotes)
  }
  if (op === 'is') {
    if (raw === 'null') return null
    if (raw === 'true') return true
    if (raw === 'false') return false
  }
  return stripQuotes(raw)
}

/**
 * Parses one condition such as `city.ilike.%goa%`, `status.not.eq.cancelled`,
 * `and(a.gt.1,b.lt.5)` or `not.or(x.eq.1,y.eq.2)`.
 */
function parseCondition(expr: string): Filter {
  let negate = false
  let body = expr.trim()
  if (body.startsWith('not.')) {
    negate = true
    body = body.slice(4)
  }

  const group = body.match(/^(and|or)\(([\s\S]*)\)$/)
  if (group) {
    return {
      kind: group[1] as 'and' | 'or',
      filters: splitTopLevel(group[2]).map(parseCondition),
      negate,
    }
  }

  const parts = body.split('.')
  const column = parts.shift() as string
  let op = parts.shift() as string
  if (op === 'not') {
    negate = !negate
    op = parts.shift() as string
  }
  if (!OPS.has(op)) throw new Error(`Unsupported filter operator "${op}" in "${expr}"`)
  const raw = parts.join('.')
  return { kind: 'cmp', column, op: op as FilterOp, value: parseOperatorValue(op as FilterOp, raw), negate }
}

/** `.or('a.eq.1,b.ilike.%x%')` → an OR filter. `referencedTable` prefixes columns. */
export function parseOrFilter(expression: string, referencedTable?: string): Filter {
  const filters = splitTopLevel(expression).map(parseCondition)
  const scoped = referencedTable ? filters.map((f) => prefixColumns(f, referencedTable)) : filters
  return { kind: 'or', filters: scoped }
}

function prefixColumns(filter: Filter, prefix: string): Filter {
  if (filter.kind === 'cmp') return { ...filter, column: `${prefix}.${filter.column}` }
  return { ...filter, filters: filter.filters.map((f) => prefixColumns(f, prefix)) }
}
