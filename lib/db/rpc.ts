/**
 * Server-side replacements for the Postgres functions the app called through `.rpc()`.
 * They run with service privileges (the originals were SECURITY DEFINER).
 */
import type { ExecContext } from './context'
import { fetchRows } from './layout'
import type { Row } from './types'

/** Collection that mirrors Firebase Auth users (see lib/firebase/auth/users.ts) */
export const AUTH_USERS_COLLECTION = '_auth_users'

type RpcHandler = (ctx: ExecContext, args: Record<string, unknown>) => Promise<unknown>

export const RPC_FUNCTIONS: Record<string, RpcHandler> = {
  /** All blogs with the author's email, for the admin dashboard */
  async get_blogs_with_author(ctx) {
    const blogs = await fetchRows(ctx.store, 'blogs', [])
    const authorIds = [...new Set(blogs.map((b) => b.author_id).filter(Boolean))] as string[]
    const authors = await ctx.store.getByPaths(authorIds.map((id) => `${AUTH_USERS_COLLECTION}/${id}`))
    const emails = new Map(authors.map((a) => [a.id, (a.data.email as string) ?? null]))
    return blogs.map((b: Row) => ({ ...b, author_email: emails.get(b.author_id) ?? null }))
  },
}
