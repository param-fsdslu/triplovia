/**
 * Role Management Utilities
 * Handles role-based access control for the admin panel
 */

import type { AuthUser as User } from '@/lib/firebase/auth/types'

export type AdminRole = 'super_admin' | 'hotel_admin'

export interface AdminUser extends User {
  user_metadata: {
    role?: AdminRole | 'admin' // 'admin' for backwards compatibility
    hotel_ids?: string[] // For hotel_admin role
  }
}

/**
 * Check if user has super admin role
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false

  const role = user.user_metadata?.role
  // 'admin' is treated as 'super_admin' for backwards compatibility
  return role === 'super_admin' || role === 'admin'
}

/**
 * Check if user has hotel admin role
 */
export function isHotelAdmin(user: User | null): boolean {
  if (!user) return false

  return user.user_metadata?.role === 'hotel_admin'
}

/**
 * Check if user has any admin role (super_admin or hotel_admin)
 */
export function isAnyAdmin(user: User | null): boolean {
  return isSuperAdmin(user) || isHotelAdmin(user)
}

/**
 * Get the user's admin role
 */
export function getAdminRole(user: User | null): AdminRole | null {
  if (!user) return null

  const role = user.user_metadata?.role

  // Backwards compatibility: treat 'admin' as 'super_admin'
  if (role === 'admin') return 'super_admin'
  if (role === 'super_admin' || role === 'hotel_admin') return role

  return null
}

/**
 * Get hotel IDs that the user has access to
 * - Super admins: returns null (access to all hotels)
 * - Hotel admins: returns array of hotel IDs they manage
 */
export function getUserHotelIds(user: User | null): string[] | null {
  if (!user) return []

  if (isSuperAdmin(user)) {
    // Super admin has access to all hotels
    return null
  }

  if (isHotelAdmin(user)) {
    // Hotel admin has access to specific hotels
    return user.user_metadata?.hotel_ids || []
  }

  return []
}

/**
 * Check if user has access to a specific hotel
 */
export function hasHotelAccess(user: User | null, hotelId: string): boolean {
  if (!user) return false

  if (isSuperAdmin(user)) {
    // Super admin has access to all hotels
    return true
  }

  if (isHotelAdmin(user)) {
    // Hotel admin has access to specific hotels
    const hotelIds = user.user_metadata?.hotel_ids || []
    return hotelIds.includes(hotelId)
  }

  return false
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: AdminRole | 'admin' | null): string {
  switch (role) {
    case 'super_admin':
    case 'admin': // backwards compatibility
      return 'Super Admin'
    case 'hotel_admin':
      return 'Hotel Admin'
    default:
      return 'Unknown'
  }
}

/**
 * Check if user can perform an action based on role
 */
export function canPerformAction(
  user: User | null,
  action: 'view_all_hotels' | 'edit_all_hotels' | 'view_all_bookings' | 'manage_users' | 'view_analytics'
): boolean {
  if (!user) return false

  const role = getAdminRole(user)

  switch (action) {
    case 'view_all_hotels':
    case 'edit_all_hotels':
    case 'view_all_bookings':
    case 'manage_users':
    case 'view_analytics':
      // Only super admins can perform these actions
      return role === 'super_admin'
    default:
      return false
  }
}
