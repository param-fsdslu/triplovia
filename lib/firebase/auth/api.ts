/**
 * The `db.auth` facade: the Supabase-style auth calls the app makes from server code
 * (getUser, updateUser, signOut, and the admin user APIs), implemented on Firebase.
 * Sign-in, sign-up and password reset live in lib/actions/auth.ts.
 */
import { isFrameworkSignal } from '@/lib/db/query-builder'
import { endSession, getSessionUser } from './session'
import { createAuthUser, deleteAuthUser, getAuthUserById, listAuthUsers, updateAuthUser } from './users'
import { authError, type AuthError, type AuthUser } from './types'
import { serverLog } from '@/lib/utils/server-log'

/** Like supabase-js: checking `error` narrows `data.user` to a user */
type UserResult = { data: { user: AuthUser }; error: null } | { data: { user: null }; error: AuthError }

function userResult(user: AuthUser | null, error: AuthError | null): UserResult {
  if (error) return { data: { user: null }, error }
  if (!user) return { data: { user: null }, error: authError('User not found', 404, 'user_not_found') }
  return { data: { user }, error: null }
}

interface AdminUserAttributes {
  email?: string
  password?: string
  email_confirm?: boolean
  user_metadata?: Record<string, any>
}

export function createAuthApi({ admin }: { admin: boolean }) {
  const forbidden = (): UserResult => ({
    data: { user: null },
    error: authError('User not allowed', 403, 'not_admin'),
  })

  return {
    async getUser(): Promise<UserResult> {
      let user: AuthUser | null
      try {
        user = await getSessionUser()
      } catch (err) {
        // Let Next.js dynamic-rendering signals through; report anything else like supabase-js did
        if (isFrameworkSignal(err)) throw err
        serverLog.error('[auth] session lookup failed:', err)
        return { data: { user: null }, error: authError('Unable to verify session', 500, 'unexpected_failure') }
      }
      if (!user) return { data: { user: null }, error: authError('Auth session missing!', 400, 'session_missing') }
      return { data: { user }, error: null }
    },

    /** Updates the signed-in user. `data` is merged into user_metadata (null removes a key). */
    async updateUser(attrs: { email?: string; password?: string; data?: Record<string, any> }): Promise<UserResult> {
      const user = await getSessionUser()
      if (!user) return { data: { user: null }, error: authError('Auth session missing!', 400, 'session_missing') }
      const { user: updated, error } = await updateAuthUser(user.id, {
        email: attrs.email,
        password: attrs.password,
        userMetadata: attrs.data,
      })
      return userResult(updated, error)
    },

    async signOut(options: { scope?: 'global' | 'local' } = {}): Promise<{ error: AuthError | null }> {
      await endSession({ revoke: options.scope !== 'local' })
      return { error: null }
    },

    admin: {
      async getUserById(uid: string): Promise<UserResult> {
        if (!admin) return forbidden()
        return userResult(await getAuthUserById(uid), null)
      },

      async listUsers(): Promise<{ data: { users: AuthUser[] }; error: AuthError | null }> {
        if (!admin) return { data: { users: [] }, error: forbidden().error }
        return { data: { users: await listAuthUsers() }, error: null }
      },

      async createUser(attrs: AdminUserAttributes & { email: string; password: string }): Promise<UserResult> {
        if (!admin) return forbidden()
        const { user, error } = await createAuthUser({
          email: attrs.email,
          password: attrs.password,
          emailConfirmed: attrs.email_confirm,
          userMetadata: attrs.user_metadata,
        })
        return userResult(user, error)
      },

      async updateUserById(uid: string, attrs: AdminUserAttributes): Promise<UserResult> {
        if (!admin) return forbidden()
        const { user, error } = await updateAuthUser(uid, {
          email: attrs.email,
          password: attrs.password,
          emailConfirmed: attrs.email_confirm,
          userMetadata: attrs.user_metadata,
        })
        return userResult(user, error)
      },

      async deleteUser(uid: string): Promise<{ data: { user: null }; error: AuthError | null }> {
        if (!admin) return { data: { user: null }, error: forbidden().error }
        const { error } = await deleteAuthUser(uid)
        return { data: { user: null }, error }
      },
    },
  }
}

export type AuthApi = ReturnType<typeof createAuthApi>
