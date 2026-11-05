/**
 * Resolves embedded resources in select strings to foreign keys, following PostgREST rules:
 *   - many-to-one: the parent table has an FK to the embedded table → embedded value is an object
 *   - one-to-many: the embedded table has an FK to the parent       → embedded value is an array,
 *     or an object when that FK column is unique (one-to-one, e.g. review → review_response)
 * A `!hint` picks the FK by column name or constraint name when several exist.
 */
import { TABLES, type ForeignKey } from './schema'
import { DbQueryError } from './types'

export interface Relation {
  /** 'many_to_one': parent[localColumn] = child[foreignColumn]; 'one_to_many': the reverse */
  kind: 'many_to_one' | 'one_to_many'
  /** Column on the parent row */
  localColumn: string
  /** Column on the embedded row */
  foreignColumn: string
  /** Embedded value is a single object (or null) rather than an array */
  single: boolean
}

function isUniqueColumn(table: string, column: string): boolean {
  const def = TABLES[table]
  if (!def) return false
  return def.pk === column || def.unique.some((cols) => cols.length === 1 && cols[0] === column)
}

function matchesHint(fk: ForeignKey, hint: string | null): boolean {
  return hint === null || fk.column === hint || fk.name === hint
}

export function resolveRelation(parent: string, child: string, hint: string | null): Relation {
  const parentDef = TABLES[parent]
  const childDef = TABLES[child]
  if (!parentDef || !childDef) {
    throw new DbQueryError(
      `Could not find a relationship between '${parent}' and '${child}' in the schema cache`,
      'PGRST200'
    )
  }

  const manyToOne = parentDef.fks.filter((fk) => fk.refTable === child && matchesHint(fk, hint))
  if (manyToOne.length > 0) {
    const fk = manyToOne[0]
    return { kind: 'many_to_one', localColumn: fk.column, foreignColumn: fk.refColumn, single: true }
  }

  const oneToMany = childDef.fks.filter((fk) => fk.refTable === parent && matchesHint(fk, hint))
  if (oneToMany.length > 0) {
    const fk = oneToMany[0]
    return {
      kind: 'one_to_many',
      localColumn: fk.refColumn,
      foreignColumn: fk.column,
      single: isUniqueColumn(child, fk.column),
    }
  }

  throw new DbQueryError(
    `Could not find a relationship between '${parent}' and '${child}' in the schema cache`,
    'PGRST200',
    hint ? `Searched for a foreign key relationship using the hint '${hint}'` : null
  )
}
