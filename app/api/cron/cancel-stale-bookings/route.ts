import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/server'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { logger } from '@/lib/utils/logger'
import { STALE_BOOKING_MINUTES } from '@/lib/config/booking-hold'

/**
 * GET /api/cron/cancel-stale-bookings
 *
 * Cancels hotel and boat bookings that have sat in booking_status='pending'
 * (awaiting payment) for longer than STALE_BOOKING_MINUTES. Covers abandoned
 * checkouts where the guest never completes payment and Razorpay never fires
 * a payment.failed webhook (e.g. they just close the tab) — without this,
 * those bookings would occupy inventory forever via the
 * booking_status IN ('confirmed','pending') overlap check.
 *
 * Protect with CRON_SECRET: the caller (the Netlify scheduled function in
 * netlify/functions/cancel-stale-bookings.mjs, Vercel Cron, or any external
 * scheduler) must send `Authorization: Bearer <CRON_SECRET>`.
 */

/**
 * Never paid: 'pending' (no order yet), 'processing' (Razorpay order created, then the window
 * was closed: "Proceed to payment" opens it straight away, so abandoned checkouts end here),
 * 'failed' (payment attempt failed and wasn't retried)
 */
const UNPAID_PAYMENT_STATUSES = ['pending', 'processing', 'failed']

const handler = async (request: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const db = createAdminClient()
  const cutoff = new Date(Date.now() - STALE_BOOKING_MINUTES * 60 * 1000).toISOString()

  const { data: cancelledBookings, error: bookingsError } = await db
    .from('bookings')
    .update({
      booking_status: 'cancelled',
      cancellation_reason: 'Payment not completed in time',
      cancelled_at: new Date().toISOString(),
    })
    .eq('booking_status', 'pending')
    .in('payment_status', UNPAID_PAYMENT_STATUSES)
    .lt('created_at', cutoff)
    .select('id, booking_reference')

  if (bookingsError) {
    logger.error('cron', 'Failed to cancel stale hotel bookings', bookingsError)
  }

  const { data: cancelledBoatBookings, error: boatBookingsError } = await db
    .from('boat_bookings')
    .update({
      booking_status: 'cancelled',
      cancellation_reason: 'Payment not completed in time',
      cancelled_at: new Date().toISOString(),
    })
    .eq('booking_status', 'pending')
    .in('payment_status', UNPAID_PAYMENT_STATUSES)
    .lt('created_at', cutoff)
    .select('id, booking_reference')

  if (boatBookingsError) {
    logger.error('cron', 'Failed to cancel stale boat bookings', boatBookingsError)
  }

  const result = {
    cancelledHotelBookings: cancelledBookings?.map((b) => b.booking_reference) ?? [],
    cancelledBoatBookings: cancelledBoatBookings?.map((b) => b.booking_reference) ?? [],
  }
  logger.info('cron', 'cancel-stale-bookings run complete', result)

  return NextResponse.json({ success: true, ...result })
}

export const GET = withApiLogging(handler, 'cron/cancel-stale-bookings')
