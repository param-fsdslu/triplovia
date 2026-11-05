'use server'

import { createClient, createAdminClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { serverLog } from '@/lib/utils/server-log'
import { formToProfileColumns, profileDetailsSchema, type ProfileDetails } from '@/lib/utils/profile-details'

interface UpdateProfileInput {
  /** The profile form's fields (My Profile); validated again here */
  details?: ProfileDetails
  /** A new photo URL (from uploadUserImage), or '' / null to remove it */
  profileImage?: string | null
}

/**
 * Saves the signed-in user's profile. Only what's passed changes: a photo upload alone leaves the
 * details as they are. Details are checked with the form's schema and cleaned (phones in E.164,
 * Aadhaar kept as its last 4 digits) by formToProfileColumns.
 */
export async function updateProfile(input: UpdateProfileInput) {
  try {
    const db = await createClient()

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()

    if (authError || !user) {
      throw new Error('You must be logged in')
    }

    // full_name is a generated column: never set it directly
    const updates: Record<string, any> = {}
    let names: { first: string | null; last: string | null } | null = null

    if (input.details) {
      const parsed = profileDetailsSchema.safeParse(input.details)
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || 'Please check the highlighted fields' }
      }
      const columns = formToProfileColumns(parsed.data)
      Object.assign(updates, columns)
      names = { first: columns.first_name, last: columns.last_name }
    }
    if (input.profileImage !== undefined) {
      updates.profile_image = input.profileImage || null
    }
    if (Object.keys(updates).length === 0) return { success: true }
    updates.updated_at = new Date().toISOString()

    const { error: profileError } = await db
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (profileError) {
      serverLog.error('Profile update error:', profileError)
      throw new Error('Failed to update profile')
    }

    // Keep auth metadata in sync
    if (names) {
      await db.auth.updateUser({
        data: {
          first_name: names.first,
          last_name: names.last,
          full_name: [names.first, names.last].filter(Boolean).join(' ') || null,
        },
      })
    }

    revalidatePath('/profile')

    return { success: true }
  } catch (error: any) {
    serverLog.error('Update profile error:', error)
    return { success: false, error: error.message || 'Failed to update profile' }
  }
}

export async function deleteAccount() {
  try {
    const db = await createClient()

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()

    if (authError || !user) {
      throw new Error('You must be logged in')
    }

    const serviceClient = createAdminClient()
    const userId = user.id

    // 1. Delete wishlists (no value after account deletion)
    await serviceClient.from('wishlists').delete().eq('user_id', userId)

    // 2. Anonymize reviews — keep content but remove user association
    await serviceClient
      .from('reviews')
      .update({ user_id: null })
      .eq('user_id', userId)

    await serviceClient
      .from('boat_reviews')
      .update({ user_id: null })
      .eq('user_id', userId)

    // 3. Anonymize bookings — keep transaction records for accounting
    await serviceClient
      .from('bookings')
      .update({ user_id: null })
      .eq('user_id', userId)

    await serviceClient
      .from('boat_bookings')
      .update({ user_id: null })
      .eq('user_id', userId)

    // 4. Sign out
    await db.auth.signOut()

    // 5. Delete auth user (profiles row deleted via ON DELETE CASCADE)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      serverLog.error('Delete account error:', deleteError)
      throw new Error('Failed to delete account')
    }

    revalidatePath('/', 'layout')
  } catch (error: any) {
    serverLog.error('Delete account error:', error)
    return { success: false, error: error.message || 'Failed to delete account' }
  }

  redirect('/')
}
