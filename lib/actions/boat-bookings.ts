'use server'

/**
 * Boat booking server actions — mirrors lib/actions/bookings.ts for the boat domain.
 *
 * All functions return { success, error? } and never throw.
 * Booking reference format: BB-YYYYMMDD-XXXX (collision-safe via retry loop).
 * userId is optional — guest bookings (no account) are supported.
 */
import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { CreateBoatBookingData } from '@/lib/types'
import { isWithinBookingWindow, MAX_BOOKING_MONTHS_AHEAD } from '@/lib/utils'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Creates a boat booking with a collision-safe reference number.
 * booking_status starts as 'pending' and only becomes 'confirmed' once payment
 * is verified (app/api/payment/verify or the Razorpay webhook).
 * Returns { success, bookingReference, bookingId } on success.
 */
export async function createBoatBooking(data: CreateBoatBookingData) {
  try {
    const db = await createClient()

    if (!isWithinBookingWindow(data.tripDate)) {
      return {
        success: false,
        error: `Bookings can only be made up to ${MAX_BOOKING_MONTHS_AHEAD} months in advance`,
      }
    }

    const bookingReference = await generateBoatBookingReference()

    const bookingData = {
      user_id: data.userId || null,
      boat_id: data.boatId,
      trip_type_id: data.tripTypeId,
      time_slot_id: data.timeSlotId,
      trip_date: data.tripDate,
      num_adults: data.numAdults,
      num_children: data.numChildren,
      guest_first_name: data.guestFirstName,
      guest_last_name: data.guestLastName,
      guest_email: data.guestEmail,
      guest_phone: data.guestPhone,
      pricing_model: data.pricingModel,
      price_per_person: data.pricePerPerson || null,
      price_per_boat: data.pricePerBoat || null,
      child_price_per_person: data.childPricePerPerson || null,
      subtotal: data.subtotal,
      tax_amount: data.taxAmount,
      service_fee: data.serviceFee,
      total_amount: data.totalAmount,
      special_requests: data.specialRequests || null,
      booking_reference: bookingReference,
      booking_status: 'pending',
      payment_status: 'pending',
    }

    const { data: booking, error } = await db
      .from('boat_bookings')
      .insert(bookingData)
      .select()
      .single()

    if (error) {
      serverLog.error('Error creating boat booking:', error)
      throw new Error('Failed to create boat booking. Please try again.')
    }

    revalidatePath('/bookings')
    revalidatePath('/boat-bookings')

    return {
      success: true,
      bookingReference: booking.booking_reference,
      bookingId: booking.id,
    }
  } catch (error: any) {
    serverLog.error('Boat booking creation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create boat booking',
    }
  }
}

/**
 * Fetches a boat booking by reference with boat, trip_type (including includes_text),
 * and time_slot joins. Used on the boat booking confirmation page.
 */
export async function getBoatBookingByReference(bookingReference: string) {
  try {
    const db = await createClient()

    const { data: booking, error } = await db
      .from('boat_bookings')
      .select(
        `
        *,
        boat:boats(
          id,
          name,
          slug,
          departure_point,
          city,
          state,
          phone,
          email
        ),
        trip_type:trip_types(
          id,
          name,
          description,
          duration_minutes,
          pricing_model,
          includes_text,
          trip_type_images(image_url, alt_text)
        ),
        time_slot:trip_time_slots(
          id,
          start_time,
          end_time,
          label
        )
      `
      )
      .eq('booking_reference', bookingReference)
      .single()

    if (error) {
      serverLog.error('Error fetching boat booking:', error)
      throw new Error('Boat booking not found')
    }

    return {
      success: true,
      booking,
    }
  } catch (error: any) {
    serverLog.error('Error fetching boat booking:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch boat booking',
    }
  }
}

/**
 * Returns all boat bookings for a user, newest first.
 * Used on the boat bookings list page.
 */
export async function getUserBoatBookings(userId: string) {
  try {
    const db = await createClient()

    const { data: bookings, error } = await db
      .from('boat_bookings')
      .select(
        `
        *,
        boat:boats(
          id,
          name,
          city,
          state
        ),
        trip_type:trip_types(
          id,
          name,
          duration_minutes
        ),
        time_slot:trip_time_slots(
          id,
          start_time,
          end_time,
          label
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      serverLog.error('Error fetching user boat bookings:', error)
      throw new Error('Failed to fetch boat bookings')
    }

    return {
      success: true,
      bookings: bookings || [],
    }
  } catch (error: any) {
    serverLog.error('Error fetching user boat bookings:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch boat bookings',
      bookings: [],
    }
  }
}

/**
 * Cancels a boat booking. Allowed by the booking owner or a super_admin/admin.
 * Revalidates the bookings and boat-bookings lists, and the specific booking page.
 */
export async function cancelBoatBooking(bookingId: string, cancellationReason?: string) {
  try {
    const db = await createClient()

    // Verify the user is either the booking owner or a super_admin
    const { data: { user } } = await db.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: existingBooking } = await db
      .from('boat_bookings')
      .select('user_id')
      .eq('id', bookingId)
      .single()

    if (!existingBooking) {
      return { success: false, error: 'Boat booking not found' }
    }

    const role = user.user_metadata?.role
    const isSuperAdmin = role === 'super_admin' || role === 'admin'
    const isOwner = existingBooking.user_id === user.id

    if (!isOwner && !isSuperAdmin) {
      return { success: false, error: 'Only the booking owner or super admin can cancel bookings' }
    }

    const { data: booking, error } = await db
      .from('boat_bookings')
      .update({
        booking_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellationReason || null,
      })
      .eq('id', bookingId)
      .select()
      .single()

    if (error) {
      serverLog.error('Error cancelling boat booking:', error)
      throw new Error('Failed to cancel boat booking')
    }

    revalidatePath('/bookings')
    revalidatePath('/boat-bookings')
    revalidatePath(`/boat-bookings/${booking.booking_reference}`)

    return {
      success: true,
      booking,
    }
  } catch (error: any) {
    serverLog.error('Error cancelling boat booking:', error)
    return {
      success: false,
      error: error.message || 'Failed to cancel boat booking',
    }
  }
}

/**
 * Generates a collision-safe boat booking reference (BB-YYYYMMDD-XXXX).
 * Loops until a reference not already in boat_bookings is found.
 */
async function generateBoatBookingReference(): Promise<string> {
  const db = await createClient()

  let reference: string
  let exists = true

  while (exists) {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
    reference = `BB-${dateStr}-${randomStr}`

    const { data } = await db
      .from('boat_bookings')
      .select('id')
      .eq('booking_reference', reference)
      .single()

    exists = !!data
  }

  return reference!
}
