import { rowsByIds } from './layout'
import { hasPolicies, type PolicyContext } from './policies'
import type { DocStore, StoreReader } from './store'
import type { DbActor, Row } from './types'
import { primaryKey } from './values'

export interface ExecContext {
  store: DocStore
  actor: DbActor
}

/** Policy context for one query; rows the query already fetched are reused for lookups */
export interface QueryPolicyContext extends PolicyContext {
  prime(table: string, rows: Row[]): void
}

/** Whether row-level policies apply to queries on this table for this actor */
export function policiesApply(ctx: ExecContext, table: string): boolean {
  return ctx.actor.kind === 'user' && hasPolicies(table)
}

/** Policy context with a per-query lookup cache; lookups bypass policies like SECURITY DEFINER helpers. */
export function createPolicyContext(ctx: ExecContext, reader: StoreReader = ctx.store): QueryPolicyContext {
  const cache = new Map<string, Promise<Row | null>>()
  return {
    user: ctx.actor.kind === 'user' ? ctx.actor.user : null,
    lookup(table, id) {
      if (id === null || id === undefined || id === '') return Promise.resolve(null)
      const key = `${table}/${String(id)}`
      let hit = cache.get(key)
      if (!hit) {
        hit = rowsByIds(reader, table, [id]).then((rows) => rows[0] ?? null)
        cache.set(key, hit)
      }
      return hit
    },
    prime(table, rows) {
      const pk = primaryKey(table)
      for (const row of rows) {
        const key = `${table}/${String(row[pk])}`
        if (!cache.has(key)) cache.set(key, Promise.resolve(row))
      }
    },
  }
}
