import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/server'
import { findPayableBookings } from '@/lib/services/guest-checkout.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { logger } from '@/lib/utils/logger'

const handler = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { bookingId, bookingType = 'hotel', errorCode, errorDescription, errorReason } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const tableName = bookingType === 'boat' ? 'boat_bookings' : 'bookings'

    // Verify the booking belongs to the user (or, for a guest booking, to this browser)
    const access = await findPayableBookings<{ id: string; payment_status: string }>(tableName, [bookingId], 'id, payment_status')
    const booking = access?.rows[0]
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Only update if payment is still in processing/pending state
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ success: true, message: 'Payment already completed' })
    }

    const adminDb = createAdminClient()
    await adminDb
      .from(tableName)
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    logger.info('payment', 'Payment marked as failed', {
      bookingId,
      bookingType,
      errorCode,
      errorDescription,
      errorReason,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating failed payment:', error)
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    )
  }
}

export const POST = withApiLogging(handler, 'payment/failed')
