/**
 * Auth user shape returned by `db.auth.getUser()` and the admin user APIs. It keeps the
 * field names the app already reads (user_metadata.role, user_metadata.hotel_ids,
 * created_at, last_sign_in_at, email_confirmed_at) so call sites did not change when
 * Supabase Auth was replaced by Firebase Authentication.
 */
export interface AuthUser {
  id: string
  email?: string
  user_metadata: {
    role?: string
    hotel_ids?: string[]
    first_name?: string | null
    last_name?: string | null
    full_name?: string | null
    [key: string]: any
  }
  app_metadata: Record<string, any>
  aud: 'authenticated'
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

export interface AuthError {
  name: 'AuthError'
  message: string
  status: number
  code?: string
}

export function authError(message: string, status = 400, code?: string): AuthError {
  return { name: 'AuthError', message, status, code }
}

/** Shape of the `_auth_users` Firestore document that stores what Firebase Auth cannot */
export interface AuthUserDoc {
  id: string
  email: string | null
  user_metadata: AuthUser['user_metadata']
  app_metadata: Record<string, any>
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}
