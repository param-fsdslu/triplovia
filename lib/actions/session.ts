'use server'

/**
 * Read-only session/profile helpers for client components. Browsers don't talk to
 * Firestore or Firebase Auth directly; client hooks (lib/hooks/use-auth-query.ts) call
 * these server actions instead.
 */
import { createClient } from '@/lib/db/server'

export interface CurrentUser {
  id: string
  email: string | null
  user_metadata: Record<string, any>
}

/** The signed-in user (id, email, metadata), or null */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null
  return { id: user.id, email: user.email ?? null, user_metadata: user.user_metadata ?? {} }
}

/** A profile row; row policies limit this to the user's own profile (or any, for super admins) */
export async function getProfile(userId: string) {
  const db = await createClient()
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).single()
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

const EDITABLE_PROFILE_FIELDS = [
  'first_name',
  'last_name',
  'phone',
  'date_of_birth',
  'nationality',
  'profile_image',
  'bio',
  'preferences',
] as const

/** Updates editable profile fields (role and hotel access are not editable here) */
export async function updateProfileFields(userId: string, updates: Record<string, unknown>) {
  const changes: Record<string, unknown> = {}
  for (const field of EDITABLE_PROFILE_FIELDS) {
    if (field in updates) changes[field] = updates[field]
  }
  const db = await createClient()
  const { data, error } = await db.from('profiles').update(changes).eq('id', userId).select().single()
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/** Amenity options for the hotel search filters */
export async function getFilterAmenities(limit = 10) {
  const db = await createClient()
  const { data } = await db.from('amenities').select('id, name, icon').order('name').limit(limit)
  return data ?? []
}
