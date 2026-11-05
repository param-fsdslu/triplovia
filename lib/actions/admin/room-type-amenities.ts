'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { requireHotelAdminPermission } from './_helpers'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Add amenity to room type
 */
export async function addRoomTypeAmenity(roomTypeId: string, amenityId: string) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('amenities')
    const db = await createClient()

    const { data, error } = await db
      .from('room_type_amenities')
      .insert({
        room_type_id: roomTypeId,
        amenity_id: amenityId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    serverLog.error('Error adding room type amenity:', error)
    return {
      success: false,
      error: error.message || 'Failed to add amenity',
    }
  }
}

/**
 * Remove amenity from room type
 */
export async function removeRoomTypeAmenity(roomTypeAmenityId: string) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('amenities')
    const db = await createClient()

    const { error } = await db
      .from('room_type_amenities')
      .delete()
      .eq('id', roomTypeAmenityId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error removing room type amenity:', error)
    return {
      success: false,
      error: error.message || 'Failed to remove amenity',
    }
  }
}
