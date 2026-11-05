/**
 * Value handling that reproduces what Postgres did implicitly: casting written values to the
 * column type, filling column defaults, and comparing values for filters and ORDER BY.
 *
 * Storage format in Firestore: plain JSON-like values. Dates are 'YYYY-MM-DD' strings,
 * timestamps are ISO-8601 strings (toISOString), times are 'HH:MM:SS', numerics are numbers.
 * jsonb columns are stored as JSON strings because Firestore rejects nested arrays.
 */
import { TABLES, type ColumnDef, type ColumnType } from './schema'
import type { Row } from './types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/

export function columnDef(table: string, column: string): ColumnDef | undefined {
  return TABLES[table]?.columns[column]
}

export function primaryKey(table: string): string {
  return TABLES[table]?.pk ?? 'id'
}

/** Casts a value to the column's type the way Postgres would on INSERT/UPDATE. */
export function coerceValue(type: ColumnType | undefined, value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (!type) return value

  switch (type) {
    case 'uuid':
    case 'text':
      return typeof value === 'number' || typeof value === 'boolean' ? String(value) : value
    case 'int':
    case 'numeric': {
      if (typeof value === 'number') return type === 'int' ? Math.trunc(value) : value
      if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
        return type === 'int' ? Math.trunc(Number(value)) : Number(value)
      }
      return value
    }
    case 'bool':
      if (typeof value === 'string') {
        const v = value.toLowerCase()
        if (['true', 't', '1', 'yes', 'on'].includes(v)) return true
        if (['false', 'f', '0', 'no', 'off'].includes(v)) return false
      }
      if (typeof value === 'number') return value !== 0
      return value
    case 'date':
      if (value instanceof Date) return value.toISOString().slice(0, 10)
      if (typeof value === 'string' && ISO_DATE.test(value)) return value.slice(0, 10)
      return value
    case 'timestamptz':
    case 'timestamp': {
      if (value instanceof Date) return value.toISOString()
      if (typeof value === 'string' && ISO_DATE.test(value)) {
        const d = new Date(value)
        return isNaN(d.getTime()) ? value : d.toISOString()
      }
      return value
    }
    case 'time':
      if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) return `${value.padStart(5, '0')}:00`
      return value
    case 'json':
    case 'text[]':
      return value
  }
}

export function coerceForColumn(table: string, column: string, value: unknown): unknown {
  return coerceValue(columnDef(table, column)?.type, value)
}

/** Drops undefined keys (PostgREST never sees them) and casts the rest to column types. */
export function coerceRow(table: string, row: Row): Row {
  const out: Row = {}
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue
    if (columnDef(table, key)?.generated) continue
    out[key] = coerceForColumn(table, key, value)
  }
  return out
}

/** Builds a full row for INSERT: provided values, then column defaults, then NULL. */
export function withDefaults(table: string, row: Row): Row {
  const def = TABLES[table]
  if (!def) return { ...row }
  const out: Row = {}
  for (const [column, col] of Object.entries(def.columns)) {
    if (row[column] !== undefined) {
      out[column] = row[column]
    } else if (col.default !== undefined) {
      out[column] = evaluateDefault(col.default)
    } else {
      out[column] = null
    }
  }
  // Keep columns the schema map does not know about (added after the move to Firebase)
  for (const [key, value] of Object.entries(row)) {
    if (!(key in out)) out[key] = value
  }
  return out
}

function evaluateDefault(value: NonNullable<ColumnDef['default']>): unknown {
  if (typeof value === 'object' && value !== null && 'fn' in value) {
    return value.fn === 'uuid' ? crypto.randomUUID() : new Date().toISOString()
  }
  if (Array.isArray(value)) return [...value]
  if (typeof value === 'object' && value !== null) return { ...value }
  return value
}

/**
 * Converts a row to the Firestore document format. NULL columns are left out to keep
 * documents short; decodeRow puts them back, and NULL is never pushed down as a filter.
 */
export function encodeRow(table: string, row: Row): Row {
  const out: Row = {}
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null) continue
    out[key] = columnDef(table, key)?.type === 'json' ? JSON.stringify(value) : value
  }
  return out
}

/** Converts a Firestore document back to a row, with every schema column present (NULL if unset). */
export function decodeRow(table: string, data: Row): Row {
  const def = TABLES[table]
  const out: Row = {}
  if (def) {
    for (const column of Object.keys(def.columns)) out[column] = null
  }
  for (const [key, value] of Object.entries(data)) {
    if (def?.columns[key]?.type === 'json' && typeof value === 'string') {
      try {
        out[key] = JSON.parse(value)
      } catch {
        out[key] = value
      }
    } else {
      out[key] = value
    }
  }
  return out
}

function isNumericString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))
}

/** Equality with the implicit casts Postgres applies when comparing a column to a literal. */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false
  if (typeof a === 'number' && isNumericString(b)) return a === Number(b)
  if (typeof b === 'number' && isNumericString(a)) return b === Number(a)
  if (typeof a === 'boolean' && typeof b === 'string') return String(a) === b.toLowerCase()
  if (typeof b === 'boolean' && typeof a === 'string') return String(b) === a.toLowerCase()
  if (typeof a === 'string' && typeof b === 'string' && ISO_DATETIME.test(a) && ISO_DATETIME.test(b)) {
    return new Date(a).getTime() === new Date(b).getTime()
  }
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b)
  return a === b
}

/**
 * Three-way comparison of two non-null values. Timestamps compare by instant, numbers
 * numerically, other strings by plain code-unit order (matches 'YYYY-MM-DD' range filters).
 */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && (typeof b === 'number' || isNumericString(b))) return a - Number(b)
  if (typeof b === 'number' && isNumericString(a)) return Number(a) - b
  if (typeof a === 'string' && typeof b === 'string') {
    if (ISO_DATETIME.test(a) && ISO_DATETIME.test(b)) {
      return new Date(a).getTime() - new Date(b).getTime()
    }
    return a < b ? -1 : a > b ? 1 : 0
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  const sa = String(a)
  const sb = String(b)
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

/** ORDER BY comparison: like compareValues but text uses a locale collation as Postgres does. */
export function compareForSort(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string' && !(ISO_DATETIME.test(a) && ISO_DATETIME.test(b))) {
    return a.localeCompare(b, 'en')
  }
  return compareValues(a, b)
}

/** Converts a SQL LIKE pattern (% and _ wildcards; PostgREST also accepts *) to a RegExp. */
export function likeToRegExp(pattern: string, caseInsensitive: boolean): RegExp {
  let source = ''
  for (const ch of pattern) {
    if (ch === '%' || ch === '*') source += '[\\s\\S]*'
    else if (ch === '_') source += '[\\s\\S]'
    else source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp('^' + source + '$', caseInsensitive ? 'i' : '')
}

/** Whole days between two 'YYYY-MM-DD' dates (Postgres date - date). */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}
