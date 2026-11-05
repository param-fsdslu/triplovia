'use server'

import { getAdminHotelAccess } from '@/lib/utils/admin'
import { isHotelAdminPermissionEnabled } from './permissions'
import type { HotelAdminPermissionKey } from '@/lib/utils/hotelAdminPermissions'
import {
  HOTEL_ADMIN_PERMISSION_LABELS,
} from '@/lib/utils/hotelAdminPermissions'

/**
 * Helper: Verify admin has access to a hotel
 */
export async function verifyHotelAccess(hotelId: string) {
  const adminAccess = await getAdminHotelAccess()

  if (!adminAccess) {
    throw new Error('Unauthorized')
  }

  // Super admin has access to all hotels
  if (adminAccess.role === 'super_admin') {
    return true
  }

  // Hotel admin must have access to this specific hotel
  if (adminAccess.hotelIds && adminAccess.hotelIds.includes(hotelId)) {
    return true
  }

  throw new Error('You do not have access to this hotel')
}

/**
 * Helper: Require a hotel admin permission to be enabled.
 * Super admins bypass this check entirely.
 * Throws if the current user is a hotel_admin and the permission is disabled.
 */
export async function requireHotelAdminPermission(permissionKey: HotelAdminPermissionKey) {
  const adminAccess = await getAdminHotelAccess()

  if (!adminAccess) {
    throw new Error('Unauthorized')
  }

  // Super admins are never restricted
  if (adminAccess.role === 'super_admin') {
    return true
  }

  // For hotel admins, check if the permission is enabled
  const enabled = await isHotelAdminPermissionEnabled(permissionKey)
  if (!enabled) {
    const label = HOTEL_ADMIN_PERMISSION_LABELS[permissionKey]
    throw new Error(
      `Permission denied: "${label}" management has been restricted by your administrator.`
    )
  }

  return true
}
