'use server'

import { createClient } from '@/lib/db/server'
import { requireSuperAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import type {
  HotelAdminPermissionKey,
  HotelAdminPermission,
} from '@/lib/utils/hotelAdminPermissions'
import { ALL_PERMISSION_KEYS, HOTEL_ADMIN_PERMISSION_LABELS } from '@/lib/utils/hotelAdminPermissions'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'
import { diffChanges, logActivity } from '@/lib/services/activity-log.service'

/**
 * Fetches all hotel admin permissions.
 * Missing rows are returned as enabled=true, requires_approval=false (default).
 * Callable by super_admin only.
 */
export async function getHotelAdminPermissions(): Promise<{
  success: boolean
  permissions?: HotelAdminPermission[]
  error?: string
}> {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    const { data, error } = await db
      .from('hotel_admin_permissions')
      .select('*')
      .order('permission_key')

    if (error) throw new Error(error.message)

    // Fill in defaults for any missing rows
    const existing = new Map((data || []).map((p: any) => [p.permission_key, p]))
    const permissions: HotelAdminPermission[] = ALL_PERMISSION_KEYS.map((key) =>
      existing.has(key)
        ? (existing.get(key) as HotelAdminPermission)
        : {
            permission_key: key,
            enabled: true,
            requires_approval: false,
            updated_at: new Date().toISOString(),
          }
    )

    return { success: true, permissions }
  } catch (error: any) {
    serverLog.error('Error fetching hotel admin permissions:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Updates a single permission flag.
 * Upserts the row so missing rows are created automatically.
 * Callable by super_admin only.
 */
export async function updateHotelAdminPermission(
  permissionKey: HotelAdminPermissionKey,
  updates: { enabled?: boolean; requires_approval?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    const { data: previous, error: readError } = await db.from('hotel_admin_permissions').select('*').eq('permission_key', permissionKey).maybeSingle()
    if (readError) throw new Error(readError.message)
    const changes = diffChanges(previous ?? { enabled: true, requires_approval: false }, updates)

    const { error } = await db.from('hotel_admin_permissions').upsert(
      {
        permission_key: permissionKey,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'permission_key' }
    )

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/settings`)

    const label = HOTEL_ADMIN_PERMISSION_LABELS[permissionKey] ?? permissionKey.replace(/_/g, ' ')
    const parts = [
      updates.enabled !== undefined && (updates.enabled ? 'allowed' : 'not allowed'),
      updates.requires_approval !== undefined && (updates.requires_approval ? 'needs approval' : 'no approval needed'),
    ].filter(Boolean)
    if (changes.length) await logActivity({
      changes,
      entity: 'settings',
      action: 'updated',
      entityId: permissionKey,
      label,
      summary: `Hotel admin permission “${label}”: ${parts.join(', ') || 'updated'}`,
      href: '/settings',
    })
    return { success: true }
  } catch (error: any) {
    serverLog.error('Error updating hotel admin permission:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Checks whether a specific permission is enabled.
 * Used server-side in admin server actions to enforce RBAC.
 * Returns true if the permission row is missing (default: enabled).
 */
export async function isHotelAdminPermissionEnabled(
  permissionKey: HotelAdminPermissionKey
): Promise<boolean> {
  try {
    const db = await createClient()

    const { data, error } = await db
      .from('hotel_admin_permissions')
      .select('enabled')
      .eq('permission_key', permissionKey)
      .maybeSingle()

    if (error || !data) return true // default: enabled
    return data.enabled
  } catch {
    return true // fail-open (network issues shouldn't block admins)
  }
}
