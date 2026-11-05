'use server'

/**
 * Hotel review server actions.
 *
 * Reviews use a 0-10 scale internally (matching common hospitality scoring).
 * The UI collects 1-5 stars, which are doubled before insertion.
 * Reviews start in 'pending' status and require admin approval before becoming visible.
 * One review per booking is enforced by checking for an existing review row.
 */
import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { CreateReviewDto } from '@/lib/types'
import { emailService } from '@/lib/services/email.service'
import { isEmailEnabled } from '@/lib/config/features'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Submits a hotel review for a completed, paid booking.
 * Validation chain: auth → booking ownership → booking status → duplicate check → insert.
 * Rating conversion: UI 1-5 stars × 2 = DB 0-10 scale.
 * New reviews are set to status='pending' and is_verified=true (guest stayed).
 */
export async function submitReview(data: CreateReviewDto) {
  try {
    const db = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()
    if (authError || !user) {
      throw new Error('You must be logged in to submit a review')
    }

    // 2. Verify booking exists and belongs to user
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select(
        'id, user_id, hotel_id, booking_status, payment_status, check_out_date, guest_first_name, guest_last_name'
      )
      .eq('id', data.bookingId)
      .single()

    if (bookingError || !booking) {
      throw new Error('Booking not found')
    }

    if (booking.user_id !== user.id) {
      throw new Error('You can only review your own bookings')
    }

    // 3. Verify booking is completed and paid
    // Allow 'checked_out' OR 'confirmed' with a past check-out date (status may not have been updated)
    const isCheckedOut = booking.booking_status === 'checked_out'
    const isPastStay =
      booking.booking_status === 'confirmed' &&
      new Date(booking.check_out_date) < new Date()
if ((!isCheckedOut && !isPastStay) || booking.payment_status !== 'paid') {
      throw new Error('You can only review completed, paid bookings')
    }

    // 4. Check if review already exists
    const { data: existingReview } = await db
      .from('reviews')
      .select('id')
      .eq('booking_id', data.bookingId)
      .single()

    if (existingReview) {
      throw new Error('You have already reviewed this booking')
    }

    // 5. Convert ratings from 1-5 scale to 0-10 scale
    const convertRating = (rating?: number) => (rating ? rating * 2 : null)

    // 6. Insert review
    const { data: review, error: insertError } = await db
      .from('reviews')
      .insert({
        booking_id: data.bookingId,
        hotel_id: data.hotelId,
        user_id: user.id,
        overall_rating: convertRating(data.overallRating),
        staff_rating: convertRating(data.staffRating),
        facilities_rating: convertRating(data.facilitiesRating),
        cleanliness_rating: convertRating(data.cleanlinessRating),
        comfort_rating: convertRating(data.comfortRating),
        value_rating: convertRating(data.valueRating),
        location_rating: convertRating(data.locationRating),
        free_wifi_rating: convertRating(data.freeWifiRating),
        title: data.title || null,
        comment: data.comment || null,
        image_urls: data.imageUrls || [],
        status: 'pending',
        is_verified: true,
        stayed_date: booking.check_out_date,
        reviewer_name:
          [booking.guest_first_name, booking.guest_last_name].filter(Boolean).join(' ') ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email!.split('@')[0],
      })
      .select()
      .single()

    if (insertError) {
      serverLog.error('Review insert error:', insertError)
      throw new Error('Failed to submit review. Please try again.')
    }

    // 7. Send confirmation email (non-fatal, guarded by feature flag)
    if (isEmailEnabled('reviewSubmittedConfirmation')) {
      try {
        const { data: hotelRow } = await db
          .from('hotels')
          .select('name, slug')
          .eq('id', data.hotelId)
          .single()

        if (hotelRow) {
          await emailService.sendReviewSubmitted({
            to: user.email!,
            userName: user.user_metadata?.first_name || user.email!.split('@')[0],
            hotelName: hotelRow.name,
            overallRating: data.overallRating,
          })
        }
      } catch (emailErr) {
        serverLog.error('Failed to send review confirmation email:', emailErr)
      }
    }

    // 8. Revalidate paths
    revalidatePath('/bookings')
    revalidatePath('/bookings')
    revalidatePath(`${ADMIN_PATH}/reviews`)

    return {
      success: true,
      review,
    }
  } catch (error: any) {
    serverLog.error('Submit review error:', error)
    return {
      success: false,
      error: error.message || 'Failed to submit review',
    }
  }
}

/**
 * Fetches the authenticated user's review for a specific booking.
 * Returns { success: true, review: null } (not an error) when no review exists.
 * Used to determine whether to show the "Leave a Review" or "Edit Review" button.
 */
export async function getReviewByBookingId(bookingId: string) {
  try {
    const db = await createClient()

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()
    if (authError || !user) {
      return { success: false, review: null }
    }

    const { data: review, error } = await db
      .from('reviews')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error
    }

    return {
      success: true,
      review: review || null,
    }
  } catch (error: any) {
    serverLog.error('Get review error:', error)
    return {
      success: false,
      error: error.message,
      review: null,
    }
  }
}
