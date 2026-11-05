'use server'

/**
 * Hotel booking server actions — the primary entry point for booking operations
 * in Next.js server components and client-side form submissions.
 *
 * All functions return { success, error? } and never throw.
 * Pricing data (pricePerNight, taxAmount, totalAmount) must be calculated
 * server-side before calling createBooking — never trust client-supplied totals.
 *
 * Note: This file and BookingService (lib/services/booking.service.ts) have
 * overlapping responsibilities. These actions are preferred for the public-facing
 * booking flow; BookingService is used by admin panel operations.
 */
import { hydrateBookingProperties } from '@/lib/services/booking-records.service'
import { snapshotHotelPolicy } from '@/lib/services/hotel-policy.service'
import { createAdminClient, createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { isWithinBookingWindow, MAX_BOOKING_MONTHS_AHEAD, parseGstDetails, type GstDetailsInput } from '@/lib/utils'
import { normalizeIndianMobile } from '@/lib/utils/phone'
import { occupancyError } from '@/lib/utils/occupancy'
import { guestAccessHash, saveGuestStay } from '@/lib/services/guest-checkout.service'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Meal plan selection attached to a booking.
 * Stored in the booking_meal_plans table with per-person and per-night breakdown.
 */
export interface BookingMealPlanData {
  mealPlanId: string
  mealType: string
  name: string
  pricePerPerson: number
  numGuests: number
  numNights: number
  totalAmount: number
}

/**
 * Input shape for creating a hotel booking.
 * userId is ignored: the account comes from the session, and no session means a guest checkout
 * (name + mobile number, see lib/services/guest-checkout.service.ts).
 * Totals (pricePerNight, taxAmount, serviceFee, totalAmount) should be
 * computed server-side from room_types table data, not passed from UI state.
 */
export interface CreateBookingData {
  userId?: string
  hotelId: string
  roomTypeId: string
  guestFirstName: string
  guestLastName: string
  /** Optional: guests can book with just a mobile number */
  guestEmail?: string
  guestPhone: string
  /** Optional GST details for a company invoice (validated with parseGstDetails) */
  gstDetails?: GstDetailsInput
  /** The guest agreed to booking messages on WhatsApp */
  whatsappOptIn?: boolean
  /** Travelling with pets */
  withPets?: boolean
  checkInDate: string
  checkOutDate: string
  numAdults: number
  numChildren: number
  numRooms: number
  pricePerNight: number
  taxAmount: number
  serviceFee: number
  extraBedCharge?: number
  totalAmount: number
  specialRequests?: string
  mealPlanTotal?: number
  mealPlans?: BookingMealPlanData[]
}

/**
 * Creates a hotel booking with optional meal plans.
 * Generates a collision-safe booking reference (BK-YYYYMMDD-XXXX).
 * Meal plan insertion is non-fatal — a meal plan failure won't roll back the booking.
 * Returns { success, bookingReference, bookingId } on success.
 */
export async function createBooking(data: CreateBookingData) {
  try {
    // Fresh reads (no catalogue cache): room capacity and availability decide the booking
    const db = await createClient({ fresh: true })
    const admin = createAdminClient({ fresh: true })
    const {
      data: { user },
    } = await db.auth.getUser()

    if (!isWithinBookingWindow(data.checkInDate)) {
      return {
        success: false,
        error: `Bookings can only be made up to ${MAX_BOOKING_MONTHS_AHEAD} months in advance`,
      }
    }

    const gst = parseGstDetails(data.gstDetails)
    if (!gst.ok) return { success: false, error: gst.error }

    // Validate room availability before creating booking
    const { data: roomType, error: rtError } = await db
      .from('room_types')
      .select('num_available_rooms, name, max_adults, max_children, max_occupancy')
      .eq('id', data.roomTypeId)
      .single()

    if (rtError || !roomType) {
      return { success: false, error: 'Room type not found' }
    }

    // Never more guests than the rooms take (the review page's counters stop there too)
    const occupancy = occupancyError(roomType, Number(data.numRooms), {
      adults: Number(data.numAdults),
      children: Number(data.numChildren ?? 0),
    })
    if (occupancy) return { success: false, error: occupancy }

    // Count rooms already booked for overlapping dates (active bookings only). Admin client:
    // everyone's bookings count, not just the ones this caller may read.
    const { data: overlappingBookings, error: overlapError } = await admin
      .from('bookings')
      .select('num_rooms')
      .eq('room_type_id', data.roomTypeId)
      .in('booking_status', ['confirmed', 'pending'])
      .in('payment_status', ['paid', 'pending', 'processing'])
      .lt('check_in_date', data.checkOutDate)
      .gt('check_out_date', data.checkInDate)

    if (overlapError) {
      serverLog.error('Error checking availability:', overlapError)
      return { success: false, error: 'Failed to check room availability' }
    }

    const bookedRooms = (overlappingBookings || []).reduce(
      (sum, b) => sum + (b.num_rooms || 1), 0
    )

    // Also subtract rooms blocked by inventory blocks that overlap the requested dates
    const { data: inventoryBlocks } = await db
      .from('room_inventory_blocks')
      .select('rooms_blocked')
      .eq('room_type_id', data.roomTypeId)
      .lte('start_date', data.checkOutDate)
      .gte('end_date', data.checkInDate)

    const blockedRooms = (inventoryBlocks || []).reduce(
      (sum, b) => sum + (b.rooms_blocked || 0), 0
    )
    const availableRooms = (roomType.num_available_rooms || 0) - bookedRooms - blockedRooms

    if (data.numRooms > availableRooms) {
      if (availableRooms <= 0) {
        return {
          success: false,
          error: `No ${roomType.name} rooms available for the selected dates`,
        }
      }
      return {
        success: false,
        error: `Only ${availableRooms} ${roomType.name} room${availableRooms === 1 ? '' : 's'} available for the selected dates`,
      }
    }

    // Generate booking reference
    const bookingReference = await generateBookingReference()

    // No session = guest checkout: kept under the mobile number (E.164, like phone sign-in) and
    // payable only from this browser
    const guestPhone = normalizeIndianMobile(data.guestPhone) ?? data.guestPhone

    const policySnapshot = await snapshotHotelPolicy(data.hotelId)

    // Prepare booking data
    const bookingData = {
      ...policySnapshot,
      user_id: user?.id ?? null,
      guest_access_hash: user ? null : await guestAccessHash(),
      hotel_id: data.hotelId,
      room_type_id: data.roomTypeId,
      guest_first_name: data.guestFirstName,
      guest_last_name: data.guestLastName,
      guest_email: data.guestEmail?.trim() || null,
      guest_phone: guestPhone,
      whatsapp_opt_in: data.whatsappOptIn === true,
      with_pets: data.withPets === true,
      ...gst.value,
      check_in_date: data.checkInDate,
      check_out_date: data.checkOutDate,
      num_adults: data.numAdults,
      num_children: data.numChildren,
      num_rooms: data.numRooms,
      price_per_night: data.pricePerNight,
      tax_amount: data.taxAmount,
      service_fee: data.serviceFee,
      extra_bed_charge: data.extraBedCharge || 0,
      meal_plan_total: data.mealPlanTotal || 0,
      total_amount: data.totalAmount,
      special_requests: data.specialRequests || null,
      booking_reference: bookingReference,
      booking_status: 'pending',
      payment_status: 'pending',
    }

    // Guest rows are hidden by row policies, so they're written with the admin client
    const writer = user ? db : admin

    // Insert booking
    const { data: booking, error } = await writer
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (error) {
      serverLog.error('Error creating booking:', error)
      throw new Error('Failed to create booking. Please try again.')
    }

    // Insert selected meal plans
    if (data.mealPlans && data.mealPlans.length > 0) {
      const mealPlanRows = data.mealPlans.map((mp) => ({
        booking_id: booking.id,
        meal_plan_id: mp.mealPlanId,
        meal_type: mp.mealType,
        name: mp.name,
        price_per_person: mp.pricePerPerson,
        num_guests: mp.numGuests,
        num_nights: mp.numNights,
        total_amount: mp.totalAmount,
      }))

      const { error: mealPlanError } = await writer
        .from('booking_meal_plans')
        .insert(mealPlanRows)

      if (mealPlanError) {
        serverLog.error('Error inserting booking meal plans:', mealPlanError)
        // Non-fatal: booking was created, just log the error
      }
    }

    // Guests: keep the rooms under their number too, so they're there after signing in with it
    if (!user && guestPhone.startsWith('+')) {
      await saveGuestStay({
        phone: guestPhone,
        hotelId: data.hotelId,
        rooms: [{ roomId: data.roomTypeId, qty: data.numRooms }],
        checkIn: data.checkInDate,
        checkOut: data.checkOutDate,
        adults: data.numAdults,
        children: data.numChildren,
        pets: data.withPets === true,
      })
    }

    // Revalidate relevant paths
    revalidatePath('/bookings')

    return {
      success: true,
      bookingReference: booking.booking_reference,
      bookingId: booking.id,
    }
  } catch (error: any) {
    serverLog.error('Booking creation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create booking',
    }
  }
}

/**
 * Fetches a booking by reference code with full hotel, room type, and meal plan joins.
 * Used by the booking confirmation page (/bookings/[reference]).
 */
export async function getBookingByReference(bookingReference: string) {
  try {
    const db = await createClient()

    const { data: booking, error } = await db
      .from('bookings')
      .select(
        `
        *,
        hotel:hotels(
          id,
          name,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          latitude,
          longitude,
          phone,
          email,
          check_in_from_time,
          check_in_to_time,
          check_out_time
        ),
        room_type:room_types(
          id,
          name,
          description,
          bed_configuration,
          max_occupancy,
          room_type_images(image_url, alt_text)
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
      `
      )
      .eq('booking_reference', bookingReference)
      .single()

    if (error) {
      serverLog.error('Error fetching booking:', error)
      throw new Error('Booking not found')
    }

    return {
      success: true,
      booking: (await hydrateBookingProperties([booking]))[0],
    }
  } catch (error: any) {
    serverLog.error('Error fetching booking:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch booking',
    }
  }
}

/**
 * Returns all bookings for a user, newest first, with hotel name and room thumbnail.
 * Used on the My Bookings page.
 */
export async function getUserBookings(userId: string) {
  try {
    const db = await createClient()

    const { data: bookings, error } = await db
      .from('bookings')
      .select(
        `
        *,
        hotel:hotels(
          id,
          name,
          city,
          state,
          hotel_images(image_url, alt_text, is_primary, display_order)
        ),
        room_type:room_types(
          id,
          name,
          room_type_images(image_url, alt_text)
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      serverLog.error('Error fetching user bookings:', error)
      throw new Error('Failed to fetch bookings')
    }

    return {
      success: true,
      bookings: await hydrateBookingProperties(bookings || []),
    }
  } catch (error: any) {
    serverLog.error('Error fetching user bookings:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch bookings',
      bookings: [],
    }
  }
}

/**
 * Cancels a booking. Allowed only by the booking owner or a super_admin/admin.
 * Role is checked from user_metadata.role (set at signup or by admin tooling).
 * Revalidates the bookings list and the specific booking detail page.
 */
export async function cancelBooking(bookingId: string, cancellationReason?: string) {
  try {
    const db = await createClient()

    // Verify the user is either the booking owner or a super_admin
    const { data: { user } } = await db.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: existingBooking } = await db
      .from('bookings')
      .select('user_id, booking_reference')
      .eq('id', bookingId)
      .single()

    if (!existingBooking) {
      return { success: false, error: 'Booking not found' }
    }

    const role = user.user_metadata?.role
    const isSuperAdmin = role === 'super_admin' || role === 'admin'
    const isOwner = existingBooking.user_id === user.id

    if (!isOwner && !isSuperAdmin) {
      return { success: false, error: 'Only the booking owner or super admin can cancel bookings' }
    }

    const { error } = await db
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellationReason || null,
      })
      .eq('id', bookingId)

    if (error) {
      serverLog.error('Error cancelling booking:', error)
      throw new Error('Failed to cancel booking')
    }

    // Revalidate relevant paths
    revalidatePath('/bookings')
    revalidatePath(`/bookings/${existingBooking.booking_reference}`)

    return {
      success: true,
      booking: { id: bookingId, booking_reference: existingBooking.booking_reference, booking_status: 'cancelled' },
    }
  } catch (error: any) {
    serverLog.error('Error cancelling booking:', error)
    return {
      success: false,
      error: error.message || 'Failed to cancel booking',
    }
  }
}

/**
 * Generates a collision-safe booking reference (BK-YYYYMMDD-XXXX).
 * Loops until a reference that doesn't already exist in the bookings table is found.
 */
async function generateBookingReference(): Promise<string> {
  // Admin client: references must be unique across everyone's bookings, not just readable ones
  const db = createAdminClient()

  let reference: string
  let exists = true

  while (exists) {
    // Generate format: BK-YYYYMMDD-XXXX (e.g., BK-20250109-A7B2)
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
    reference = `BK-${dateStr}-${randomStr}`

    // Check if reference already exists
    const { data } = await db
      .from('bookings')
      .select('id')
      .eq('booking_reference', reference)
      .single()

    exists = !!data
  }

  return reference!
}
