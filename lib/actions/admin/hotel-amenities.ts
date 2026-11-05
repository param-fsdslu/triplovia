'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { requireHotelAdminPermission } from './_helpers'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Get all amenities
 */
export async function getAllAmenities() {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: amenities, error } = await db
      .from('amenities')
      .select(`
        *,
        category:amenity_categories(
          id,
          name
        )
      `)
      .order('category_id', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      amenities: amenities || [],
    }
  } catch (error: any) {
    serverLog.error('Error fetching amenities:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch amenities',
      amenities: [],
    }
  }
}

/**
 * Add amenity to hotel
 */
export async function addHotelAmenity(hotelId: string, amenityId: string) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('amenities')
    const db = await createClient()

    const { data, error } = await db
      .from('hotel_amenities')
      .insert({
        hotel_id: hotelId,
        amenity_id: amenityId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`/hotels`)

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    serverLog.error('Error adding hotel amenity:', error)
    return {
      success: false,
      error: error.message || 'Failed to add amenity',
    }
  }
}

/**
 * Remove amenity from hotel
 */
export async function removeHotelAmenity(hotelAmenityId: string) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('amenities')
    const db = await createClient()

    const { error } = await db
      .from('hotel_amenities')
      .delete()
      .eq('id', hotelAmenityId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`/hotels`)

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error removing hotel amenity:', error)
    return {
      success: false,
      error: error.message || 'Failed to remove amenity',
    }
  }
}
