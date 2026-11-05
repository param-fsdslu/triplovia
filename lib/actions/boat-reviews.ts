'use server'

/**
 * Boat review server actions — mirrors lib/actions/reviews.ts for the boat domain.
 *
 * Reviews cover: overall, safety, crew, experience, value (vs. hotel's staff, facilities, etc.).
 * Same 1-5 → 0-10 scale conversion and pending approval flow as hotel reviews.
 */
import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { CreateBoatReviewDto } from '@/lib/types'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Submits a review for a completed, paid boat booking.
 * Validation: auth → booking ownership → status → duplicate → insert.
 * Rating conversion: UI 1-5 stars × 2 = DB 0-10 scale.
 */
export async function submitBoatReview(data: CreateBoatReviewDto) {
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
      .from('boat_bookings')
      .select(
        'id, user_id, boat_id, booking_status, payment_status, trip_date'
      )
      .eq('id', data.bookingId)
      .single()

    if (bookingError || !booking) {
      throw new Error('Booking not found')
    }

    if (booking.user_id !== user.id) {
      throw new Error('You can only review your own bookings')
    }

    // 3. Verify booking is checked out and paid
    if (
      booking.booking_status !== 'checked_out' ||
      booking.payment_status !== 'paid'
    ) {
      throw new Error('You can only review completed, paid bookings')
    }

    // 4. Check if review already exists
    const { data: existingReview } = await db
      .from('boat_reviews')
      .select('id')
      .eq('boat_booking_id', data.bookingId)
      .single()

    if (existingReview) {
      throw new Error('You have already reviewed this booking')
    }

    // 5. Convert ratings from 1-5 scale to 0-10 scale
    const convertRating = (rating?: number) => (rating ? rating * 2 : null)

    // 6. Insert review
    const { data: review, error: insertError } = await db
      .from('boat_reviews')
      .insert({
        boat_booking_id: data.bookingId,
        boat_id: data.boatId,
        user_id: user.id,
        overall_rating: convertRating(data.overallRating),
        safety_rating: convertRating(data.safetyRating),
        crew_rating: convertRating(data.crewRating),
        experience_rating: convertRating(data.experienceRating),
        value_rating: convertRating(data.valueRating),
        title: data.title || null,
        comment: data.comment || null,
        image_urls: data.imageUrls || [],
        trip_date: booking.trip_date,
        status: 'pending',
        is_verified: true,
      })
      .select()
      .single()

    if (insertError) {
      serverLog.error('Boat review insert error:', insertError)
      throw new Error('Failed to submit review. Please try again.')
    }

    // 7. Revalidate paths
    revalidatePath('/bookings')
    revalidatePath(`/boats/${data.boatId}`)

    return {
      success: true,
      review,
    }
  } catch (error: any) {
    serverLog.error('Submit boat review error:', error)
    return {
      success: false,
      error: error.message || 'Failed to submit review',
    }
  }
}

/**
 * Fetches the authenticated user's review for a specific boat booking.
 * Returns { success: true, review: null } (not an error) when no review exists yet.
 */
export async function getBoatReviewByBookingId(bookingId: string) {
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
      .from('boat_reviews')
      .select('*')
      .eq('boat_booking_id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return {
      success: true,
      review: review || null,
    }
  } catch (error: any) {
    serverLog.error('Get boat review error:', error)
    return {
      success: false,
      error: error.message,
      review: null,
    }
  }
}

/**
 * Returns all approved reviews for a boat, newest first.
 * Only status='approved' reviews are returned (pending reviews are hidden from guests).
 */
export async function getBoatReviews(boatId: string) {
  try {
    const db = await createClient()

    const { data: reviews, error } = await db
      .from('boat_reviews')
      .select('*')
      .eq('boat_id', boatId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return {
      success: true,
      reviews: reviews || [],
    }
  } catch (error: any) {
    serverLog.error('Get boat reviews error:', error)
    return {
      success: false,
      error: error.message,
      reviews: [],
    }
  }
}
