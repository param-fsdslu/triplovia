/**
 * Shared types for the Firestore-backed data layer (lib/db).
 *
 * The layer exposes the same PostgREST-style query builder the app used with Supabase
 * (`db.from('bookings').select('*, hotel:hotels(name)').eq('id', id).single()`), so
 * responses keep the `{ data, error, count }` shape and error codes the callers check
 * (e.g. PGRST116 for "no rows" on .single(), 23505 for unique violations).
 */

export type Row = Record<string, any>

export interface DbError {
  message: string
  code: string
  details: string | null
  hint: string | null
}

export interface DbResponse<T = any> {
  data: T
  error: DbError | null
  count: number | null
  status: number
  statusText: string
}

/** The signed-in user a request runs as. `role`/`hotelIds` come from user_metadata. */
export interface DbUser {
  id: string
  email: string | null
  role: string | null
  hotelIds: string[]
}

/**
 * Who a query runs as:
 *  - { kind: 'service' }  bypasses row-level policies (server-only admin client)
 *  - { kind: 'user', user } applies policies.ts for that user (user = null means anonymous)
 */
export type DbActor = { kind: 'service' } | { kind: 'user'; user: DbUser | null }

export class DbQueryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details: string | null = null,
    public hint: string | null = null
  ) {
    super(message)
    this.name = 'DbQueryError'
  }

  toJSON(): DbError {
    return { message: this.message, code: this.code, details: this.details, hint: this.hint }
  }
}

export function toDbError(err: unknown): DbError {
  if (err instanceof DbQueryError) return err.toJSON()
  const message = err instanceof Error ? err.message : String(err)
  return { message, code: 'FIRESTORE_ERROR', details: null, hint: null }
}
