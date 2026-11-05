'use server'

/**
 * Admin server actions for review moderation.
 * All functions require super_admin or hotel_admin role via requireAdmin().
 * Uses createAdminClient so that row policies on the reviews tables do not
 * block admins from reading or updating reviews owned by other users.
 */
import { createAdminClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

// ─── Hotel Reviews ────────────────────────────────────────────────────────────

export async function getAdminHotelReviews() {
  await requireAdmin()
  const db = createAdminClient()

  // NOTE: reviews.booking_id has no FK constraint to bookings, so it can't be
  // embedded via `bookings!booking_id(...)` — PostgREST would error on the
  // join and the whole query would fail. Booking references are fetched separately.
  const { data, error } = await db
    .from('reviews')
    .select(`
      *,
      hotel:hotels!hotel_id(id, name, slug)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    serverLog.error('getAdminHotelReviews error:', error)
    return { success: false, error: error.message, reviews: [] }
  }

  const reviews = data || []
  const bookingIds = [...new Set(reviews.map((r) => r.booking_id).filter(Boolean))]

  let bookingRefById = new Map<string, string>()
  if (bookingIds.length > 0) {
    const { data: bookings } = await db
      .from('bookings')
      .select('id, booking_reference')
      .in('id', bookingIds)
    bookingRefById = new Map((bookings || []).map((b) => [b.id, b.booking_reference]))
  }

  const reviewsWithBooking = reviews.map((r) => ({
    ...r,
    booking: bookingRefById.has(r.booking_id)
      ? { booking_reference: bookingRefById.get(r.booking_id)! }
      : null,
  }))

  return { success: true, reviews: reviewsWithBooking }
}

export async function approveHotelReview(reviewId: string) {
  await requireAdmin()
  const db = createAdminClient()

  const { error } = await db
    .from('reviews')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', reviewId)

  if (error) {
    serverLog.error('approveHotelReview error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`${ADMIN_PATH}/reviews`)
  revalidatePath('/', 'layout') // flush hotel detail pages
  return { success: true }
}

export async function rejectHotelReview(reviewId: string) {
  await requireAdmin()
  const db = createAdminClient()

  const { error } = await db
    .from('reviews')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', reviewId)

  if (error) {
    serverLog.error('rejectHotelReview error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`${ADMIN_PATH}/reviews`)
  revalidatePath('/', 'layout')
  return { success: true }
}

// ─── Boat Reviews ─────────────────────────────────────────────────────────────

export async function getAdminBoatReviews() {
  await requireAdmin()
  const db = createAdminClient()

  const { data, error } = await db
    .from('boat_reviews')
    .select(`
      *,
      boat:boats!boat_id(id, name, slug),
      boat_booking:boat_bookings!boat_booking_id(booking_reference)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    serverLog.error('getAdminBoatReviews error:', error)
    return { success: false, error: error.message, reviews: [] }
  }

  return { success: true, reviews: data || [] }
}

export async function approveBoatReview(reviewId: string) {
  await requireAdmin()
  const db = createAdminClient()

  const { error } = await db
    .from('boat_reviews')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', reviewId)

  if (error) {
    serverLog.error('approveBoatReview error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`${ADMIN_PATH}/reviews`)
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function rejectBoatReview(reviewId: string) {
  await requireAdmin()
  const db = createAdminClient()

  const { error } = await db
    .from('boat_reviews')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', reviewId)

  if (error) {
    serverLog.error('rejectBoatReview error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`${ADMIN_PATH}/reviews`)
  revalidatePath('/', 'layout')
  return { success: true }
}
