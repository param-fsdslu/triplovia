'use server'

import { createClient } from '@/lib/db/server'
import {
  isAnyAdmin,
  isSuperAdmin,
  isHotelAdmin,
  getAdminRole,
  getUserHotelIds,
  hasHotelAccess,
  type AdminRole
} from './roles'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Check if the current user is an admin (any type)
 * @deprecated Use isAnyAdmin, isSuperAdmin, or isHotelAdmin instead
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()

    return isAnyAdmin(user)
  } catch (error) {
    serverLog.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Check if the current user is a super admin
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()

    return isSuperAdmin(user)
  } catch (error) {
    serverLog.error('Error checking super admin status:', error)
    return false
  }
}

/**
 * Check if the current user is a hotel admin
 */
export async function checkIsHotelAdmin(): Promise<boolean> {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()

    return isHotelAdmin(user)
  } catch (error) {
    serverLog.error('Error checking hotel admin status:', error)
    return false
  }
}

/**
 * Get admin user data with role information
 */
export async function getAdminUser() {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()

    if (!user) {
      return null
    }

    const role = getAdminRole(user)
    if (!role) {
      return null
    }

    const hotelIds = getUserHotelIds(user)

    return {
      id: user.id,
      email: user.email,
      role: role,
      hotelIds: hotelIds,
      metadata: user.user_metadata,
    }
  } catch (error) {
    serverLog.error('Error getting admin user:', error)
    return null
  }
}

/**
 * Require admin access (any admin type)
 */
export async function requireAdmin() {
  const adminStatus = await isAdmin()

  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required')
  }

  return true
}

/**
 * Require super admin access
 */
export async function requireSuperAdmin() {
  const isSuperAdminStatus = await checkIsSuperAdmin()

  if (!isSuperAdminStatus) {
    throw new Error('Unauthorized: Super admin access required')
  }

  return true
}

/**
 * Require hotel admin access
 */
export async function requireHotelAdmin() {
  const isHotelAdminStatus = await checkIsHotelAdmin()

  if (!isHotelAdminStatus) {
    throw new Error('Unauthorized: Hotel admin access required')
  }

  return true
}

/**
 * Get the current admin user and their accessible hotel IDs
 * Returns null for hotel IDs if super admin (access to all)
 * Returns array of hotel IDs if hotel admin
 */
export async function getAdminHotelAccess(): Promise<{
  userId: string
  role: AdminRole
  hotelIds: string[] | null
} | null> {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()

    if (!user) {
      return null
    }

    const role = getAdminRole(user)
    if (!role) {
      return null
    }

    const hotelIds = getUserHotelIds(user)

    return {
      userId: user.id,
      role: role,
      hotelIds: hotelIds,
    }
  } catch (error) {
    serverLog.error('Error getting admin hotel access:', error)
    return null
  }
}

/**
 * Check if the current user has access to a specific hotel
 */
export async function checkHotelAccess(hotelId: string): Promise<boolean> {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()

    return hasHotelAccess(user, hotelId)
  } catch (error) {
    serverLog.error('Error checking hotel access:', error)
    return false
  }
}

/**
 * Require access to a specific hotel
 */
export async function requireHotelAccess(hotelId: string) {
  const hasAccess = await checkHotelAccess(hotelId)

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this hotel')
  }

  return true
}
