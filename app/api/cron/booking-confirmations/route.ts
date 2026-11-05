import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/server'
import { notifyBookingConfirmed } from '@/lib/services/booking-notifications.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Recovery only: payment verification/webhook remain the immediate triggers. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== 'Bearer ' + secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await createAdminClient({ fresh: true }).from('bookings')
    .select('id, razorpay_order_id, confirmation_sent_at, updated_at')
    .eq('payment_status', 'paid').eq('booking_status', 'confirmed')
    .gte('updated_at', new Date(Date.now() - 24 * 3_600_000).toISOString())
    .order('updated_at', { ascending: true })
  if (error) return NextResponse.json({ error: 'Could not load confirmations' }, { status: 500 })
  const groups = new Map<string, string>()
  for (const booking of data ?? []) {
    if (!booking.confirmation_sent_at) groups.set(booking.razorpay_order_id || booking.id, booking.id)
  }
  let attempted = 0
  let failed = 0
  for (const bookingId of [...groups.values()].slice(0, 5)) {
    try { await notifyBookingConfirmed(bookingId); attempted++ } catch (error) {
      failed++
      logger.error('cron/booking-confirmations', 'Confirmation retry failed', error, { bookingId })
    }
  }
  return NextResponse.json({ success: failed === 0, attempted, failed }, { status: failed ? 500 : 200 })
}
