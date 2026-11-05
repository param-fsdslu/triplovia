import type { ExecContext } from './context'
import { isFrameworkSignal, QueryBuilder } from './query-builder'
import { RPC_FUNCTIONS } from './rpc'
import type { DocStore } from './store'
import { toDbError, type DbActor, type DbResponse } from './types'

export interface DbClientOptions<Auth, Storage> {
  store: DocStore
  /** Resolved on first query, so creating a client never costs a session lookup */
  resolveActor: () => Promise<DbActor>
  auth: Auth
  storage: Storage
}

/**
 * Database client: `from()` for table queries, `rpc()` for the server functions that
 * replaced Postgres functions, plus the auth and storage facades it was created with.
 */
export class DbClient<Auth = unknown, Storage = unknown> {
  readonly auth: Auth
  readonly storage: Storage
  private context: Promise<ExecContext> | null = null

  constructor(private options: DbClientOptions<Auth, Storage>) {
    this.auth = options.auth
    this.storage = options.storage
  }

  private getContext = (): Promise<ExecContext> => {
    if (!this.context) {
      this.context = this.options.resolveActor().then((actor) => ({ store: this.options.store, actor }))
      // Don't cache a failed session lookup; the next query retries
      this.context.catch(() => {
        this.context = null
      })
    }
    return this.context
  }

  from<T = any[]>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.getContext, table)
  }

  async rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<DbResponse<T>> {
    const handler = RPC_FUNCTIONS[fn]
    if (!handler) {
      return {
        data: null as T,
        error: { message: `Could not find the function public.${fn}`, code: 'PGRST202', details: null, hint: null },
        count: null,
        status: 404,
        statusText: 'Not Found',
      }
    }
    try {
      const data = (await handler(await this.getContext(), args)) as T
      return { data, error: null, count: null, status: 200, statusText: 'OK' }
    } catch (err) {
      if (isFrameworkSignal(err)) throw err
      return { data: null as T, error: toDbError(err), count: null, status: 400, statusText: 'Error' }
    }
  }
}
