'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { requireHotelAdminPermission } from './_helpers'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Get all room types for a hotel
 */
export async function getHotelRoomTypes(hotelId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: roomTypes, error } = await db
      .from('room_types')
      .select(
        `
        *,
        room_type_images(
          id,
          image_url,
          alt_text,
          display_order
        ),
        room_type_panoramas(id, image_url, title, display_order),
        room_type_amenities(
          id,
          amenity:amenities(
            id,
            name,
            category_id,
            icon,
            category:amenity_categories(
              id,
              name
            )
          )
        )
      `
      )
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      roomTypes: roomTypes || [],
    }
  } catch (error: any) {
    serverLog.error('Error fetching room types:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch room types',
      roomTypes: [],
    }
  }
}

/**
 * Create room type
 */
export async function createRoomType(roomTypeData: any) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: roomType, error } = await db
      .from('room_types')
      .insert(roomTypeData)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
      roomType,
    }
  } catch (error: any) {
    serverLog.error('Error creating room type:', error)
    return {
      success: false,
      error: error.message || 'Failed to create room type',
    }
  }
}

/**
 * Update room type
 * Requires: room_pricing (base_price edits) or room_availability (status/num_available_rooms)
 */
export async function updateRoomType(roomTypeId: string, roomTypeData: any) {
  try {
    await requireAdmin()
    if (
      'base_price' in roomTypeData ||
      'extra_bed_price' in roomTypeData ||
      'child_price' in roomTypeData ||
      'standard_occupancy' in roomTypeData
    ) {
      await requireHotelAdminPermission('room_pricing')
    }
    if ('status' in roomTypeData || 'num_available_rooms' in roomTypeData) {
      await requireHotelAdminPermission('room_availability')
    }
    const db = await createClient()

    const { data: roomType, error } = await db
      .from('room_types')
      .update(roomTypeData)
      .eq('id', roomTypeId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
      roomType,
    }
  } catch (error: any) {
    serverLog.error('Error updating room type:', error)
    return {
      success: false,
      error: error.message || 'Failed to update room type',
    }
  }
}

/**
 * Delete room type
 */
export async function deleteRoomType(roomTypeId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    // Check if room type has any bookings
    const { count: bookingsCount } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('room_type_id', roomTypeId)

    if (bookingsCount && bookingsCount > 0) {
      return {
        success: false,
        error: 'Cannot delete room type with existing bookings. Set status to inactive instead.',
      }
    }

    const { error } = await db
      .from('room_types')
      .delete()
      .eq('id', roomTypeId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error deleting room type:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete room type',
    }
  }
}
