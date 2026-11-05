'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin, getAdminHotelAccess } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { STORAGE_BUCKETS, extractStoragePath } from '@/lib/utils/storage'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

// ============================================
// Boat CRUD
// ============================================

export async function getAllBoats(filters?: {
  city?: string
  status?: string
  page?: number
  limit?: number
}) {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()

    if (!adminAccess) {
      throw new Error('Unauthorized')
    }

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    let query = db
      .from('boats')
      .select('*', { count: 'exact' })

    if (filters?.city) {
      query = query.eq('city', filters.city)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data: boats, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      boats: boats || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching boats:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch boats',
      boats: [],
    }
  }
}

export async function getBoatById(boatId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: boat, error } = await db
      .from('boats')
      .select(
        `
        *,
        boat_images(
          id,
          image_url,
          alt_text,
          is_primary,
          display_order
        ),
        boat_amenities(
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
      .eq('id', boatId)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      boat,
    }
  } catch (error: any) {
    serverLog.error('Error fetching boat:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch boat',
    }
  }
}

export async function createBoat(boatData: any) {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()

    if (!adminAccess) {
      throw new Error('Unauthorized')
    }

    const dataToInsert = {
      ...boatData,
      owner_id: adminAccess.role === 'hotel_admin' ? adminAccess.userId : boatData.owner_id,
    }

    const { data: boat, error } = await db
      .from('boats')
      .insert(dataToInsert)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
      boat,
    }
  } catch (error: any) {
    serverLog.error('Error creating boat:', error)
    return {
      success: false,
      error: error.message || 'Failed to create boat',
    }
  }
}

export async function updateBoat(boatId: string, boatData: any) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: boat, error } = await db
      .from('boats')
      .update(boatData)
      .eq('id', boatId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')
    revalidatePath(`/boats/${boat.slug}`)

    return {
      success: true,
      boat,
    }
  } catch (error: any) {
    serverLog.error('Error updating boat:', error)
    return {
      success: false,
      error: error.message || 'Failed to update boat',
    }
  }
}

export async function deleteBoat(boatId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { count: bookingsCount } = await db
      .from('boat_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('boat_id', boatId)

    if (bookingsCount && bookingsCount > 0) {
      return {
        success: false,
        error: 'Cannot delete boat with existing bookings. Set status to inactive instead.',
      }
    }

    const { error } = await db
      .from('boats')
      .delete()
      .eq('id', boatId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error deleting boat:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete boat',
    }
  }
}

export async function updateBoatStatus(
  boatId: string,
  status: 'active' | 'inactive' | 'pending'
) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: boat, error } = await db
      .from('boats')
      .update({ status })
      .eq('id', boatId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
      boat,
    }
  } catch (error: any) {
    serverLog.error('Error updating boat status:', error)
    return {
      success: false,
      error: error.message || 'Failed to update boat status',
    }
  }
}

// ============================================
// Trip Type CRUD
// ============================================

export async function getBoatTripTypes(boatId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: tripTypes, error } = await db
      .from('trip_types')
      .select(
        `
        *,
        trip_type_images(
          id,
          image_url,
          alt_text,
          display_order
        ),
        trip_time_slots(
          id,
          start_time,
          end_time,
          label,
          is_active,
          display_order
        )
      `
      )
      .eq('boat_id', boatId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      tripTypes: tripTypes || [],
    }
  } catch (error: any) {
    serverLog.error('Error fetching trip types:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch trip types',
      tripTypes: [],
    }
  }
}

export async function createTripType(tripTypeData: any) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: tripType, error } = await db
      .from('trip_types')
      .insert(tripTypeData)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
      tripType,
    }
  } catch (error: any) {
    serverLog.error('Error creating trip type:', error)
    return {
      success: false,
      error: error.message || 'Failed to create trip type',
    }
  }
}

export async function updateTripType(tripTypeId: string, tripTypeData: any) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: tripType, error } = await db
      .from('trip_types')
      .update(tripTypeData)
      .eq('id', tripTypeId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
      tripType,
    }
  } catch (error: any) {
    serverLog.error('Error updating trip type:', error)
    return {
      success: false,
      error: error.message || 'Failed to update trip type',
    }
  }
}

export async function deleteTripType(tripTypeId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { count: bookingsCount } = await db
      .from('boat_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('trip_type_id', tripTypeId)

    if (bookingsCount && bookingsCount > 0) {
      return {
        success: false,
        error: 'Cannot delete trip type with existing bookings. Set status to unavailable instead.',
      }
    }

    const { error } = await db
      .from('trip_types')
      .delete()
      .eq('id', tripTypeId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error deleting trip type:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete trip type',
    }
  }
}

// ============================================
// Time Slots CRUD
// ============================================

export async function createTimeSlot(data: {
  trip_type_id: string
  start_time: string
  end_time: string
  label?: string
  display_order?: number
}) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: slot, error } = await db
      .from('trip_time_slots')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)

    return {
      success: true,
      slot,
    }
  } catch (error: any) {
    serverLog.error('Error creating time slot:', error)
    return {
      success: false,
      error: error.message || 'Failed to create time slot',
    }
  }
}

export async function updateTimeSlot(slotId: string, data: any) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: slot, error } = await db
      .from('trip_time_slots')
      .update(data)
      .eq('id', slotId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)

    return {
      success: true,
      slot,
    }
  } catch (error: any) {
    serverLog.error('Error updating time slot:', error)
    return {
      success: false,
      error: error.message || 'Failed to update time slot',
    }
  }
}

export async function deleteTimeSlot(slotId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { error } = await db
      .from('trip_time_slots')
      .delete()
      .eq('id', slotId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error deleting time slot:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete time slot',
    }
  }
}

// ============================================
// Boat Images
// ============================================

export async function uploadBoatImage(boatId: string, formData: FormData) {
  try {
    await requireAdmin()
    const db = await createClient()

    const file = formData.get('file') as File
    const altText = formData.get('altText') as string
    const displayOrder = formData.get('displayOrder') as string

    if (!file) {
      throw new Error('No file provided')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${boatId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { data: uploadData, error: uploadError } = await db.storage
      .from(STORAGE_BUCKETS.BOAT_IMAGES)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = db.storage
      .from(STORAGE_BUCKETS.BOAT_IMAGES)
      .getPublicUrl(uploadData.path)

    const { data, error } = await db
      .from('boat_images')
      .insert({
        boat_id: boatId,
        image_url: publicUrl,
        storage_path: uploadData.path,
        alt_text: altText || '',
        display_order: displayOrder ? parseInt(displayOrder) : 0,
      })
      .select()
      .single()

    if (error) {
      await db.storage.from(STORAGE_BUCKETS.BOAT_IMAGES).remove([uploadData.path])
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    serverLog.error('Error uploading boat image:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    }
  }
}

export async function deleteBoatImage(imageId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: image } = await db
      .from('boat_images')
      .select('storage_path, image_url')
      .eq('id', imageId)
      .single()

    const { error } = await db
      .from('boat_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      throw new Error(error.message)
    }

    if (image?.storage_path) {
      await db.storage.from(STORAGE_BUCKETS.BOAT_IMAGES).remove([image.storage_path])
    } else if (image?.image_url) {
      const path = extractStoragePath(image.image_url, STORAGE_BUCKETS.BOAT_IMAGES)
      if (path) {
        await db.storage.from(STORAGE_BUCKETS.BOAT_IMAGES).remove([path])
      }
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error deleting boat image:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete image',
    }
  }
}

// ============================================
// Boat Amenities
// ============================================

export async function addBoatAmenity(boatId: string, amenityId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data, error } = await db
      .from('boat_amenities')
      .insert({
        boat_id: boatId,
        amenity_id: amenityId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    serverLog.error('Error adding boat amenity:', error)
    return {
      success: false,
      error: error.message || 'Failed to add amenity',
    }
  }
}

export async function removeBoatAmenity(boatAmenityId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { error } = await db
      .from('boat_amenities')
      .delete()
      .eq('id', boatAmenityId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boats`)
    revalidatePath('/boats')

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error removing boat amenity:', error)
    return {
      success: false,
      error: error.message || 'Failed to remove amenity',
    }
  }
}

// ============================================
// Boat Bookings (Admin)
// ============================================

export async function getAllBoatBookings(filters?: {
  status?: string
  paymentStatus?: string
  page?: number
  limit?: number
}) {
  try {
    await requireAdmin()
    const db = await createClient()

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    let query = db
      .from('boat_bookings')
      .select(
        `
        *,
        boat:boats(id, name, city),
        trip_type:trip_types(id, name),
        time_slot:trip_time_slots(id, start_time, end_time, label)
      `,
        { count: 'exact' }
      )

    if (filters?.status) {
      query = query.eq('booking_status', filters.status)
    }

    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus)
    }

    const { data: bookings, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      bookings: bookings || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching boat bookings:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch boat bookings',
      bookings: [],
    }
  }
}

export async function getBoatBookingDetails(bookingIdOrReference: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    let query = db
      .from('boat_bookings')
      .select(`
        *,
        boat:boats(
          id, name, slug, departure_point, city, state, country, phone, email
        ),
        trip_type:trip_types(
          id, name, description, duration_minutes, pricing_model, includes_text
        ),
        time_slot:trip_time_slots(
          id, start_time, end_time, label
        )
      `)

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdOrReference)

    if (isUUID) {
      query = query.eq('id', bookingIdOrReference)
    } else {
      query = query.eq('booking_reference', bookingIdOrReference)
    }

    const { data: booking, error } = await query.single()

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      booking,
    }
  } catch (error: any) {
    serverLog.error('Error fetching boat booking details:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch boat booking details',
      booking: null,
    }
  }
}

export async function updateBoatBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'cancelled' | 'completed' | 'pending' | 'no_show',
  adminNote?: string
) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: booking, error } = await db
      .from('boat_bookings')
      .update({ booking_status: status })
      .eq('id', bookingId)
      .select(`
        *,
        boat:boats(name)
      `)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/boat-bookings`)

    return {
      success: true,
      booking,
    }
  } catch (error: any) {
    serverLog.error('Error updating boat booking status:', error)
    return {
      success: false,
      error: error.message || 'Failed to update boat booking status',
    }
  }
}

// ============================================
// Boat Stats (Dashboard)
// ============================================

export async function getBoatAdminStats() {
  try {
    await requireAdmin()
    const db = await createClient()

    const { count: totalBoats } = await db
      .from('boats')
      .select('*', { count: 'exact', head: true })

    const { count: totalBoatBookings } = await db
      .from('boat_bookings')
      .select('*', { count: 'exact', head: true })

    const { data: revenueData } = await db
      .from('boat_bookings')
      .select('total_amount')
      .eq('payment_status', 'paid')

    const totalBoatRevenue = revenueData?.reduce(
      (sum, booking) => sum + parseFloat(booking.total_amount),
      0
    ) || 0

    const today = new Date().toISOString().split('T')[0]
    const { count: boatBookingsToday } = await db
      .from('boat_bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)

    return {
      success: true,
      stats: {
        totalBoats: totalBoats || 0,
        totalBoatBookings: totalBoatBookings || 0,
        totalBoatRevenue,
        boatBookingsToday: boatBookingsToday || 0,
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching boat admin stats:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch boat statistics',
    }
  }
}
