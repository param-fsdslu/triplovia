'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin, requireSuperAdmin, getAdminHotelAccess } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { emailService } from '@/lib/services/email.service'
import { verifyHotelAccess } from './_helpers'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Get all bookings with filters
 * Filtered by role: super_admin sees all, hotel_admin sees only their hotels' bookings
 */
export async function getAllBookings(filters?: {
  status?: string
  paymentStatus?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  hotelId?: string
  /** One website user's bookings (admin Users page → View bookings) */
  userId?: string
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
      .from('bookings')
      .select(
        `
        *,
        hotel:hotels(
          id,
          name,
          city,
          state
        ),
        room_type:room_types(
          id,
          name
        )
      `,
        { count: 'exact' }
      )

    // Filter by hotel access
    if (adminAccess.hotelIds !== null) {
      query = query.in('hotel_id', adminAccess.hotelIds)
    }

    // Apply filters
    if (filters?.status) {
      query = query.eq('booking_status', filters.status)
    }

    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus)
    }

    if (filters?.dateFrom) {
      query = query.gte('check_in_date', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('check_in_date', filters.dateTo)
    }

    if (filters?.hotelId) {
      query = query.eq('hotel_id', filters.hotelId)
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    // Search by booking reference, guest name, or guest email
    if (filters?.search) {
      const s = filters.search.trim()
      query = query.or(
        `booking_reference.ilike.%${s}%,guest_first_name.ilike.%${s}%,guest_last_name.ilike.%${s}%,guest_email.ilike.%${s}%`
      )
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
    serverLog.error('Error fetching bookings:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch bookings',
      bookings: [],
    }
  }
}

/**
 * Get list of hotels for filter dropdown (admin only)
 */
/** A booking as the dashboard's booking calendar draws it */
export interface CalendarBooking {
  id: string
  booking_reference: string
  guest_first_name: string | null
  guest_last_name: string | null
  check_in_date: string
  check_out_date: string
  booking_status: string
  payment_status: string
  num_rooms: number | null
  num_adults: number | null
  num_children: number | null
  hotel_id: string
  hotel: { name: string | null; check_in_from_time: string | null; check_out_time: string | null } | null
  room_type: { name: string | null } | null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Bookings staying between `from` and `to` (check-in before `to`, check-out after `from`,
 * both YYYY-MM-DD) for the hotel admin dashboard's booking calendar, limited to the admin's
 * hotels. Cancelled bookings only when asked for.
 */
export async function getBookingCalendar(params: {
  from: string
  to: string
  hotelId?: string
  includeCancelled?: boolean
}): Promise<{ success: boolean; bookings: CalendarBooking[]; error?: string }> {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()
    if (!adminAccess) throw new Error('Unauthorized')
    if (!ISO_DATE.test(params.from) || !ISO_DATE.test(params.to)) throw new Error('Invalid dates')

    let query = db
      .from('bookings')
      .select(
        `
        id, booking_reference, guest_first_name, guest_last_name, check_in_date, check_out_date,
        booking_status, payment_status, num_rooms, num_adults, num_children, hotel_id,
        hotel:hotels(name, check_in_from_time, check_out_time),
        room_type:room_types(name)
      `
      )
      .lt('check_in_date', params.to)
      .gt('check_out_date', params.from)

    if (adminAccess.hotelIds !== null) {
      query = query.in('hotel_id', adminAccess.hotelIds)
    }
    if (params.hotelId) {
      query = query.eq('hotel_id', params.hotelId)
    }
    if (!params.includeCancelled) {
      query = query.neq('booking_status', 'cancelled')
    }

    const { data, error } = await query.order('check_in_date')
    if (error) throw new Error(error.message)
    return { success: true, bookings: (data ?? []) as CalendarBooking[] }
  } catch (error: any) {
    serverLog.error('Error fetching booking calendar:', error)
    return { success: false, bookings: [], error: error.message || 'Failed to load bookings' }
  }
}

export async function getAdminHotelsList() {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()

    if (!adminAccess) return []

    let query = db
      .from('hotels')
      .select('id, name')
      .order('name')

    if (adminAccess.hotelIds !== null) {
      query = query.in('id', adminAccess.hotelIds)
    }

    const { data } = await query
    return data || []
  } catch {
    return []
  }
}

/**
 * Get booking details by ID or reference (admin only)
 */
export async function getBookingDetails(bookingIdOrReference: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    // Try to find by ID first, then by reference
    let query = db
      .from('bookings')
      .select(`
        *,
        hotel:hotels(
          id,
          name,
          address_line_1,
          address_line_2,
          city,
          state,
          country,
          postal_code,
          phone,
          email
        ),
        room_type:room_types(
          id,
          name,
          description,
          bed_configuration,
          size_sqm,
          max_occupancy
        ),
        booking_meal_plans(
          id,
          meal_type,
          name,
          price_per_person,
          num_guests,
          num_nights,
          total_amount
        )
      `)

    // Check if it's a UUID (booking ID) or a reference string
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
    serverLog.error('Error fetching booking details:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch booking details',
      booking: null,
    }
  }
}

/**
 * Update booking status (admin only)
 * Hotel admins can only update bookings for their hotels
 * Only super_admin can cancel bookings
 */
export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'cancelled' | 'completed' | 'pending',
  adminNote?: string
) {
  try {
    await requireAdmin()

    // Only super_admin can cancel bookings — hotel_admin cannot
    if (status === 'cancelled') {
      await requireSuperAdmin()
    }

    const db = await createClient()

    // First, get the booking to check hotel access
    const { data: existingBooking } = await db
      .from('bookings')
      .select('hotel_id')
      .eq('id', bookingId)
      .single()

    if (!existingBooking) {
      throw new Error('Booking not found')
    }

    // Verify admin has access to this booking's hotel
    await verifyHotelAccess(existingBooking.hotel_id)

    const { data: booking, error } = await db
      .from('bookings')
      .update({ booking_status: status })
      .eq('id', bookingId)
      .select(`
        *,
        hotel:hotels(name)
      `)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Send status update email to customer
    try {
      const userEmail = booking.guest_email
      const userName = `${booking.guest_first_name} ${booking.guest_last_name}`.trim() || userEmail?.split('@')[0] || 'Guest'

      if (userEmail) {
        await emailService.sendBookingStatusUpdate({
          to: userEmail,
          userName,
          bookingId: booking.booking_reference,
          hotelName: booking.hotel?.name || 'Hotel',
          newStatus: status,
          adminNote,
        })
      }
    } catch (emailError) {
      serverLog.error('Failed to send status update email:', emailError)
    }

    revalidatePath(`${ADMIN_PATH}/bookings`)
    revalidatePath('/dashboard')

    return {
      success: true,
      booking,
    }
  } catch (error: any) {
    serverLog.error('Error updating booking status:', error)
    return {
      success: false,
      error: error.message || 'Failed to update booking status',
    }
  }
}
