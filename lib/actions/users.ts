'use server'

/**
 * Admin user management server actions (super_admin only).
 *
 * Uses the admin client (createAdminClient) to bypass row policies and manage
 * Firebase Auth users via the db.auth.admin API.
 *
 * Role storage: roles are stored in user_metadata.role (not a separate DB table).
 * hotel_admin users additionally have user_metadata.hotel_ids[] mapping them to hotels.
 * The hotels table has an owner_id FK that is kept in sync when hotel assignments change.
 */
import { createClient, createAdminClient } from '@/lib/db/server'
import { requireSuperAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { getRoleDisplayName, type AdminRole } from '@/lib/utils/roles'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'
import { diffChanges, logActivity } from '@/lib/services/activity-log.service'

/**
 * Lists all users with admin roles (super_admin, hotel_admin, or legacy admin).
 * For hotel_admin users, also fetches the associated hotel names and cities.
 */
export async function getAllAdminUsers() {
  try {
    await requireSuperAdmin()
    const db = createAdminClient()

    // Get all users with admin roles from auth.users
    const { data, error } = await db.auth.admin.listUsers()

    if (error) {
      throw new Error(error.message)
    }

    // Filter to only admin users
    const adminUsers = data.users
      .filter(user => {
        const role = user.user_metadata?.role
        return role === 'super_admin' || role === 'hotel_admin' || role === 'admin'
      })
      .map(user => ({
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role as AdminRole | 'admin',
        hotelIds: user.user_metadata?.hotel_ids || [],
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at ?? null,
        emailConfirmed: user.email_confirmed_at !== null,
      }))

    // Get hotel details for hotel admins
    const adminUsersWithHotels = await Promise.all(
      adminUsers.map(async (user) => {
        if (user.role === 'hotel_admin' && user.hotelIds.length > 0) {
          const { data: hotels } = await db
            .from('hotels')
            .select('id, name, city')
            .in('id', user.hotelIds)

          return {
            ...user,
            hotels: hotels || [],
          }
        }
        return {
          ...user,
          hotels: [],
        }
      })
    )

    return {
      success: true,
      users: adminUsersWithHotels,
    }
  } catch (error: any) {
    serverLog.error('Error fetching admin users:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch admin users',
      users: [],
    }
  }
}

/**
 * Creates a new admin user with the given role.
 * Creates the auth user with email_confirm=true (no email verification required).
 * For hotel_admin: stores hotel_ids in user_metadata and sets hotels.owner_id.
 * Hotel ownership update failure is non-fatal (logged but doesn't roll back user creation).
 */
export async function createAdminUser(data: {
  email: string
  password: string
  role: 'super_admin' | 'hotel_admin'
  hotelIds?: string[]
}) {
  try {
    await requireSuperAdmin()
    const db = createAdminClient()

    // Validate input
    if (!data.email || !data.password) {
      throw new Error('Email and password are required')
    }

    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Hotel admins can be created without hotels assigned initially
    // They can be assigned hotels later via the update function

    // Create user
    const { data: newUser, error: createError } = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: data.role,
        hotel_ids: data.role === 'hotel_admin' ? (data.hotelIds || []) : undefined,
      },
    })

    if (createError) {
      // Translate common auth admin errors into clear messages
      const msg = createError.message || ''
      if (msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('already exists')) {
        throw new Error('A user with this email address already exists.')
      }
      throw new Error(msg || 'Failed to create user')
    }

    // If hotel admin, update hotel owner_id
    if (data.role === 'hotel_admin' && data.hotelIds && data.hotelIds.length > 0) {
      const { error: updateError } = await db
        .from('hotels')
        .update({ owner_id: newUser.user.id })
        .in('id', data.hotelIds)

      if (updateError) {
        serverLog.error('Error updating hotel ownership:', updateError)
        // Don't fail the entire operation, but log the error
      }
    }

    revalidatePath(`${ADMIN_PATH}/vendors`)

    const hotelCount = data.role === 'hotel_admin' ? (data.hotelIds?.length ?? 0) : 0
    await logActivity({
      entity: 'vendor',
      action: 'created',
      entityId: newUser.user.id,
      label: data.email,
      summary: `Added the ${getRoleDisplayName(data.role)} ${data.email}${hotelCount ? ` (${hotelCount} hotel${hotelCount === 1 ? '' : 's'})` : ''}`,
      href: '/vendors',
    })

    return {
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        role: data.role,
      },
    }
  } catch (error: any) {
    serverLog.error('Error creating admin user:', error)
    return {
      success: false,
      error: error.message || 'Failed to create admin user',
    }
  }
}

/**
 * Updates an admin user's email, password, role, or hotel assignments.
 * When hotel_ids changes: removes old owner_id from previously assigned hotels
 * and sets owner_id on the newly assigned hotels.
 */
export async function updateAdminUser(data: {
  userId: string
  email?: string
  password?: string
  role?: 'super_admin' | 'hotel_admin'
  hotelIds?: string[]
}) {
  try {
    await requireSuperAdmin()
    const db = createAdminClient()

    if (!data.userId) {
      throw new Error('User ID is required')
    }

    // Get current user data
    const { data: currentUser, error: getUserError } = await db.auth.admin.getUserById(
      data.userId
    )

    if (getUserError || !currentUser.user) {
      throw new Error('User not found')
    }

    const currentRole = currentUser.user.user_metadata?.role
    const currentHotelIds = currentUser.user.user_metadata?.hotel_ids || []

    // Build update object
    const updateData: any = {}

    if (data.email && data.email !== currentUser.user.email) {
      updateData.email = data.email
    }

    if (data.password && data.password.length >= 8) {
      updateData.password = data.password
    }

    // Update user metadata if role or hotel IDs changed
    const newRole = data.role || currentRole
    const newHotelIds = data.hotelIds !== undefined ? data.hotelIds : currentHotelIds

    // Hotel admins can have 0 hotels temporarily
    // This allows for flexible hotel assignment management

    updateData.user_metadata = {
      role: newRole,
      hotel_ids: newRole === 'hotel_admin' ? newHotelIds : undefined,
    }

    // Update user
    const { error: updateError } = await db.auth.admin.updateUserById(
      data.userId,
      updateData
    )

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Update hotel ownership if needed
    if (data.role === 'hotel_admin' || currentRole === 'hotel_admin') {
      // Remove old hotel ownerships
      if (currentRole === 'hotel_admin' && currentHotelIds.length > 0) {
        await db
          .from('hotels')
          .update({ owner_id: null })
          .in('id', currentHotelIds)
          .eq('owner_id', data.userId)
      }

      // Set new hotel ownerships
      if (newRole === 'hotel_admin' && newHotelIds.length > 0) {
        await db
          .from('hotels')
          .update({ owner_id: data.userId })
          .in('id', newHotelIds)
      }
    }

    revalidatePath(`${ADMIN_PATH}/vendors`)

    const changes = diffChanges(
      { email: currentUser.user.email, role: currentRole, hotel_ids: [...currentHotelIds].sort() },
      { email: updateData.email || currentUser.user.email, role: newRole, hotel_ids: newRole === 'hotel_admin' ? [...newHotelIds].sort() : [] }
    )
    if (updateData.password) changes.push({ field: 'Password', from: null, to: 'Changed' })
    const who = updateData.email || currentUser.user.email || 'a panel account'
    if (changes.length) await logActivity({
      changes,
      entity: 'vendor',
      action: 'updated',
      entityId: data.userId,
      label: who,
      summary: `Updated ${who}${changes.length ? `: ${changes.map((change) => change.field.toLowerCase()).join(', ')}` : ''}`,
      href: '/vendors',
    })

    return {
      success: true,
      message: 'Admin user updated successfully',
    }
  } catch (error: any) {
    serverLog.error('Error updating admin user:', error)
    return {
      success: false,
      error: error.message || 'Failed to update admin user',
    }
  }
}

/**
 * Deletes an admin user. Clears their hotel ownerships (sets owner_id to null)
 * before deleting so orphaned FK references are avoided.
 */
export async function deleteAdminUser(userId: string) {
  try {
    await requireSuperAdmin()
    const db = createAdminClient()

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Get user to check if they own any hotels
    const { data: currentUser } = await db.auth.admin.getUserById(userId)

    if (currentUser.user) {
      const hotelIds = currentUser.user.user_metadata?.hotel_ids || []
      if (hotelIds.length > 0) {
        // Remove hotel ownership
        await db
          .from('hotels')
          .update({ owner_id: null })
          .in('id', hotelIds)
          .eq('owner_id', userId)
      }
    }

    // Delete user
    const { error } = await db.auth.admin.deleteUser(userId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/vendors`)

    const deletedEmail = currentUser?.user?.email || 'a panel account'
    await logActivity({
      entity: 'vendor',
      action: 'deleted',
      entityId: userId,
      label: deletedEmail,
      summary: `Removed the panel account ${deletedEmail}`,
    })

    return {
      success: true,
      message: 'Admin user deleted successfully',
    }
  } catch (error: any) {
    serverLog.error('Error deleting admin user:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete admin user',
    }
  }
}

/**
 * Returns all hotels (including currently assigned ones) for use in the
 * admin user form dropdown. Includes owner_id so the UI can show current assignments.
 */
export async function getAvailableHotels() {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    const { data: hotels, error } = await db
      .from('hotels')
      .select('id, name, city, state, owner_id')
      .order('name')

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      hotels: hotels || [],
    }
  } catch (error: any) {
    serverLog.error('Error fetching available hotels:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch hotels',
      hotels: [],
    }
  }
}
