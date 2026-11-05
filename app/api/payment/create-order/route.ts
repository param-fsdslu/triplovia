import { NextRequest, NextResponse } from 'next/server'
import { razorpayInstance, RAZORPAY_CURRENCY } from '@/lib/razorpay/config'
import { createAdminClient } from '@/lib/db/server'
import { findPayableBookings } from '@/lib/services/guest-checkout.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { logger } from '@/lib/utils/logger'

const handler = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { bookingType = 'hotel' } = body

    // Accept either bookingIds (array, multi-room) or bookingId (single, backwards compat)
    const bookingIds: string[] = body.bookingIds?.length
      ? body.bookingIds
      : body.bookingId
      ? [body.bookingId]
      : []

    if (!bookingIds.length) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    const tableName = bookingType === 'boat' ? 'boat_bookings' : 'bookings'

    // Fetch all bookings and verify ownership: the signed-in owner, or the browser that made a guest booking
    const access = await findPayableBookings<{ id: string; booking_reference: string; total_amount: string; payment_status: string }>(
      tableName,
      bookingIds,
      'id, booking_reference, total_amount, payment_status'
    )
    if (!access) {
      return NextResponse.json({ error: 'Booking(s) not found' }, { status: 404 })
    }
    const bookings = access.rows

    // Check if any booking is already paid
    if (bookings.some((b) => b.payment_status === 'paid')) {
      return NextResponse.json({ error: 'Booking already paid' }, { status: 400 })
    }

    // SECURITY: Sum amounts from database — never trust client-supplied totals
    const totalAmount = bookings.reduce(
      (sum, b) => sum + parseFloat(b.total_amount),
      0
    )

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid booking amount' }, { status: 400 })
    }

    const primaryBooking = bookings[0]

    // Create Razorpay order for the combined total
    const options = {
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: RAZORPAY_CURRENCY,
      receipt: primaryBooking.booking_reference,
      notes: {
        booking_ids: bookingIds.join(','),
        booking_reference: primaryBooking.booking_reference,
        amount: totalAmount.toString(),
      },
    }

    logger.network('razorpay', 'POST', 'orders', {
      amount: options.amount,
      receipt: options.receipt,
      count: bookingIds.length,
    })
    const order = await razorpayInstance.orders.create(options)
    logger.info('razorpay', 'Order created', { orderId: order.id, bookingCount: bookingIds.length })

    // Mark all bookings as processing and store the Razorpay order ID so the
    // webhook handler can look them up by order ID later.
    const adminDb = createAdminClient()
    await adminDb
      .from(tableName)
      .update({ razorpay_order_id: order.id, payment_status: 'processing', updated_at: new Date().toISOString() })
      .in('id', bookingIds)

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingReference: primaryBooking.booking_reference,
    })
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json(
      { error: 'Failed to create payment order', details: error.message },
      { status: 500 }
    )
  }
}

export const POST = withApiLogging(handler, 'payment/create-order')
