import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/db/server'
import { emailService } from '@/lib/services/email.service'
import { issueInvoiceNumbers } from '@/lib/services/invoice.service'
import { notifyBookingConfirmed } from '@/lib/services/booking-notifications.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { logger } from '@/lib/utils/logger'

/**
 * Razorpay Webhook Handler
 * Handles payment events from Razorpay to ensure payment reconciliation
 * Critical for handling cases where client-side verification fails
 */
async function webhookHandler(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      logger.error('webhook', 'Missing Razorpay signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      logger.error('webhook', 'Invalid Razorpay signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    const { event: eventType, payload } = event

    logger.info('webhook', `Event received: ${eventType}`)

    const db = createAdminClient()

    // Handle different event types
    switch (eventType) {
      case 'payment.captured': {
        await handlePaymentCaptured(payload, db)
        break
      }

      case 'payment.failed': {
        await handlePaymentFailed(payload, db)
        break
      }

      case 'order.paid': {
        await handleOrderPaid(payload, db)
        break
      }

      case 'refund.processed': {
        await handleRefundProcessed(payload, db)
        break
      }

      case 'refund.failed': {
        await handleRefundFailed(payload, db)
        break
      }

      case 'refund.speed_changed': {
        // Fires when an 'optimum' refund couldn't be processed instantly and
        // fell back to the normal 5-7 business day track. No DB update needed —
        // the final state is still determined by refund.processed/refund.failed.
        // Log it so support knows the customer's timeline has changed.
        const { refund } = payload
        logger.always('webhook', 'refund.speed_changed — instant downgraded to normal', {
          refundId: refund?.entity?.id ?? null,
          paymentId: refund?.entity?.payment_id ?? null,
          speedRequested: refund?.entity?.speed_requested ?? null,
          speedProcessed: refund?.entity?.speed_processed ?? null,
        })
        break
      }

      default:
        logger.warn('webhook', `Unhandled event: ${eventType}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Handle successful payment capture — covers both hotel and boat bookings.
 */
async function handlePaymentCaptured(payload: any, db: any) {
  const { payment } = payload
  const paymentId = payment.entity.id
  const orderId = payment.entity.order_id
  const amount = payment.entity.amount // in paise

  logger.info('webhook', `Processing payment.captured: ${paymentId}`)

  // Check if already processed (idempotency) — avoids duplicate work regardless
  // of which booking table we end up updating.
  const { data: existingPayment } = await db
    .from('payments')
    .select('id')
    .eq('payment_gateway_payment_id', paymentId)
    .single()

  if (existingPayment) {
    logger.info('webhook', `Payment already processed (idempotent): ${paymentId}`)
    return
  }

  // Find booking — hotel first, then boat
  let booking: any = null
  let isBoatBooking = false
  let hotelGroup: any[] = []

  const { data: hotelBookings } = await db
    .from('bookings')
    .select('id, booking_reference, total_amount, payment_status, user_id, check_in_date, check_out_date')
    .eq('razorpay_order_id', orderId)

  if (hotelBookings?.length) {
    hotelGroup = hotelBookings
    booking = hotelBookings[0]
  } else {
    const { data: boatBooking } = await db
      .from('boat_bookings')
      .select('id, booking_reference, total_amount, payment_status, user_id, trip_date')
      .eq('razorpay_order_id', orderId)
      .single()

    if (boatBooking) {
      booking = boatBooking
      isBoatBooking = true
    }
  }

  if (!booking) {
    logger.error('webhook', `Booking not found for order: ${orderId}`)
    return
  }

  // Verify amount matches
  const expectedAmount = isBoatBooking ? Math.round(parseFloat(booking.total_amount) * 100) : Math.round(hotelGroup.reduce((sum, row) => sum + Number(row.total_amount), 0) * 100)
  if (amount !== expectedAmount) {
    logger.error('webhook', `Amount mismatch for ${paymentId}`, undefined, { expected: expectedAmount, got: amount })
    await logPaymentAnomaly(db, booking.id, paymentId, 'amount_mismatch', {
      expected: expectedAmount,
      received: amount,
    })
    return
  }

  // Update booking — use booking_status (not status) to match the schema
  const updateTable = isBoatBooking ? 'boat_bookings' : 'bookings'
  const selectQuery = isBoatBooking
    ? `*, boat:boats(name)`
    : `*, hotel:hotels(id, name, email, owner_id), room_type:room_types(name)`

  const { data: updatedBooking, error: confirmationError } = await db
    .from(updateTable)
    .update({
      payment_status: 'paid',
      booking_status: 'confirmed',
      razorpay_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .in('id', isBoatBooking ? [booking.id] : hotelGroup.map(row => row.id))
    .select(selectQuery)
  if (confirmationError || !updatedBooking?.length) throw new Error('Could not confirm paid booking')
  const confirmedBooking = Array.isArray(updatedBooking) ? updatedBooking[0] : updatedBooking

  // Paid: invoice number from the financial-year series (keeps the one verify may have given)
  if (!isBoatBooking) await issueInvoiceNumbers(hotelGroup.map(row => row.id))

  // Create payment record
  const paymentRecord: any = {
    payment_gateway: 'razorpay',
    payment_gateway_order_id: orderId,
    payment_gateway_payment_id: paymentId,
    amount: expectedAmount / 100,
    currency: 'INR',
    status: 'success',
    payment_method: payment.entity.method || 'online',
    payment_details: {
      card_last4: payment.entity.card?.last4,
      bank: payment.entity.bank,
      wallet: payment.entity.wallet,
      vpa: payment.entity.vpa,
    },
  }
  if (isBoatBooking) {
    paymentRecord.boat_booking_id = booking.id
  } else {
    paymentRecord.booking_id = booking.id
  }
  await db.from('payments').insert(paymentRecord)

  if (isBoatBooking) {
    // Boat trips keep the plain payment receipt
    try {
      const { data: user } = await db.auth.admin.getUserById(booking.user_id)
      const email = confirmedBooking?.guest_email || user?.user?.email
      if (email && confirmedBooking) {
        await emailService.sendPaymentReceipt({
          to: email,
          userName: user?.user?.user_metadata?.name || email.split('@')[0],
          bookingId: booking.booking_reference,
          paymentId: paymentId,
          amount: booking.total_amount,
          paymentMethod: `Razorpay (${payment.entity.method || 'Online'})`,
          hotelName: confirmedBooking.boat?.name || 'Boat Trip',
          checkInDate: booking.trip_date,
          checkOutDate: booking.trip_date,
        })
      }
    } catch (emailError) {
      console.error('Failed to send webhook confirmation email:', emailError)
    }
  } else {
    // Safety net for when /api/payment/verify never ran (e.g. the guest closed the tab right after
    // paying): confirmation email + invoice, guest/hotel WhatsApp and the hotel email alert. Sent once
    // per payment, so this does nothing if verify already sent them.
    try {
      await notifyBookingConfirmed(booking.id)
    } catch (notifyError) {
      logger.error('webhook', 'Booking confirmation notifications failed', notifyError, { bookingId: booking.id })
    }
  }

  logger.info('webhook', `Payment captured successfully: ${paymentId} (${isBoatBooking ? 'boat' : 'hotel'})`)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payload: any, db: any) {
  const { payment } = payload
  const paymentId = payment.entity.id
  const orderId = payment.entity.order_id

  logger.info('webhook', `Processing payment.failed: ${paymentId}`)

  // Find booking in hotel bookings first, then boat bookings
  let booking: any = null
  let tableName = 'bookings'
  let paymentFk = 'booking_id'

  const { data: hotelBooking } = await db
    .from('bookings')
    .select('id')
    .eq('razorpay_order_id', orderId)
    .single()

  if (hotelBooking) {
    booking = hotelBooking
  } else {
    const { data: boatBooking } = await db
      .from('boat_bookings')
      .select('id')
      .eq('razorpay_order_id', orderId)
      .single()

    if (boatBooking) {
      booking = boatBooking
      tableName = 'boat_bookings'
      paymentFk = 'boat_booking_id'
    }
  }

  if (!booking) {
    logger.error('webhook', `Booking not found for failed payment order: ${orderId}`)
    return
  }

  // Update booking status — cancel the pending hold so it stops occupying inventory
  await db
    .from(tableName)
    .update({
      payment_status: 'failed',
      booking_status: 'cancelled',
      cancellation_reason: 'Payment failed',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)

  // Log failed payment
  await db.from('payments').insert({
    [paymentFk]: booking.id,
    payment_gateway: 'razorpay',
    payment_gateway_order_id: orderId,
    payment_gateway_payment_id: paymentId,
    amount: payment.entity.amount / 100,
    currency: payment.entity.currency || 'INR',
    status: 'failed',
    payment_method: payment.entity.method || 'online',
  })

  logger.info('webhook', `Payment failure recorded: ${paymentId} for ${tableName}`)
}

/**
 * Handle order paid event
 * order.paid carries both payload.order.entity and payload.payment.entity.
 * If the payment entity is present, delegate to handlePaymentCaptured
 * (its internal idempotency check prevents double-processing with payment.captured).
 */
async function handleOrderPaid(payload: any, db: any) {
  logger.info('webhook', 'order.paid event received')
  if (payload.payment?.entity) {
    logger.info('webhook', 'order.paid contains payment entity — delegating to handlePaymentCaptured')
    await handlePaymentCaptured(payload, db)
  } else {
    // Rare edge case — order.paid without a payment entity. Log for investigation.
    logger.warn('webhook', 'order.paid missing payment entity — cannot process', {
      orderId: payload.order?.entity?.id ?? null,
    })
  }
}

/**
 * Handle successful refund (Razorpay refund.processed webhook)
 * Razorpay refund statuses: pending → processed. This webhook fires on final processed state.
 */
async function handleRefundProcessed(payload: any, db: any) {
  const { refund } = payload
  const paymentId = refund.entity.payment_id
  const refundId = refund.entity.id
  const refundAmount = refund.entity.amount / 100 // Convert paise to rupees

  logger.always('webhook', 'refund.processed received', { refundId, paymentId, refundAmount })

  // Find payment record — select both booking_id and boat_booking_id
  const { data: payment, error: paymentError } = await db
    .from('payments')
    .select('id, booking_id, boat_booking_id, amount')
    .eq('payment_gateway_payment_id', paymentId)
    .single()

  logger.always('webhook', 'Payment lookup for refund', {
    found: !!payment,
    paymentId: payment?.id ?? null,
    bookingId: payment?.booking_id ?? null,
    boatBookingId: payment?.boat_booking_id ?? null,
    error: paymentError?.message ?? null,
  })

  // Resolve which booking to update — either via the payments table record or
  // directly from refund_transactions (fallback for when the payment record was
  // never created due to service role misconfiguration).
  let bookingId: string | null = payment?.booking_id ?? null
  let boatBookingId: string | null = payment?.boat_booking_id ?? null
  let totalPaid: number | null = payment ? parseFloat(payment.amount) : null

  if (!payment) {
    logger.always('webhook', 'Payment record missing — falling back to refund_transactions lookup', { paymentId })
    const { data: refundTx } = await db
      .from('refund_transactions')
      .select('booking_id, boat_booking_id, total_paid')
      .eq('payment_gateway_payment_id', paymentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    logger.always('webhook', 'refund_transactions fallback result', {
      found: !!refundTx,
      bookingId: refundTx?.booking_id ?? null,
      boatBookingId: refundTx?.boat_booking_id ?? null,
    })

    if (!refundTx) {
      logger.error('webhook', `No payment or refund_transaction found for payment: ${paymentId}`)
      return
    }
    bookingId = refundTx.booking_id
    boatBookingId = refundTx.boat_booking_id
    totalPaid = refundTx.total_paid ? parseFloat(refundTx.total_paid) : null
  }

  // Determine refund status based on paid amount (if known)
  const isPartialRefund = totalPaid !== null ? refundAmount < totalPaid : false
  const refundStatus = isPartialRefund ? 'partially_refunded' : 'refunded'
  const now = new Date().toISOString()

  logger.always('webhook', 'Resolving refund status', { refundStatus, refundAmount, totalPaid, isPartialRefund })

  // Update payment record (only if it exists)
  if (payment) {
    const { error: paymentUpdateError } = await db
      .from('payments')
      .update({
        status: refundStatus,
        refund_amount: refundAmount,
        refund_id: refundId,
        refunded_at: now,
      })
      .eq('id', payment.id)
    logger.always('webhook', 'Payment record updated', {
      paymentDbId: payment.id,
      error: paymentUpdateError?.message ?? null,
    })
    if (paymentUpdateError) {
      logger.error('webhook', 'Failed to update payment record', paymentUpdateError)
    }
  }

  // Update the correct booking table (hotel or boat)
  if (bookingId) {
    const { error: bookingUpdateError } = await db
      .from('bookings')
      .update({ payment_status: refundStatus, updated_at: now })
      .eq('id', bookingId)
    logger.always('webhook', 'Updated bookings payment_status', {
      bookingId,
      refundStatus,
      error: bookingUpdateError?.message ?? null,
    })
  } else if (boatBookingId) {
    const { error: boatUpdateError } = await db
      .from('boat_bookings')
      .update({ payment_status: refundStatus, updated_at: now })
      .eq('id', boatBookingId)
    logger.always('webhook', 'Updated boat_bookings payment_status', {
      boatBookingId,
      refundStatus,
      error: boatUpdateError?.message ?? null,
    })
  }

  // Mark the refund transaction as completed — this drives the admin dashboard stat
  const { error: txUpdateError } = await db
    .from('refund_transactions')
    .update({ status: 'completed', completed_at: now })
    .eq('refund_gateway_id', refundId)
  logger.always('webhook', 'Marked refund_transaction completed', {
    refundGatewayId: refundId,
    error: txUpdateError?.message ?? null,
  })

  logger.always('webhook', 'refund.processed handled successfully', { refundId })
}

/**
 * Handle failed refund (Razorpay refund.failed webhook)
 */
async function handleRefundFailed(payload: any, db: any) {
  const { refund } = payload
  const refundId = refund.entity.id
  const paymentId = refund.entity.payment_id
  const errorDescription = refund.entity.error_description || 'Refund failed at payment gateway'

  logger.always('webhook', 'refund.failed received', { refundId, paymentId, errorDescription })

  // Mark the refund transaction as failed so admin can see and retry
  const { error: txUpdateError } = await db
    .from('refund_transactions')
    .update({
      status: 'failed',
      error_message: errorDescription,
    })
    .eq('refund_gateway_id', refundId)
  logger.always('webhook', 'Marked refund_transaction failed', {
    refundGatewayId: refundId,
    error: txUpdateError?.message ?? null,
  })

  // Log for admin review
  await logPaymentAnomaly(db, null, paymentId, 'refund_failed', {
    refund_id: refundId,
    error: refund.entity.error_description,
  })
}

/**
 * Log payment anomaly for admin review
 */
async function logPaymentAnomaly(
  db: any,
  bookingId: string | null,
  paymentId: string,
  anomalyType: string,
  details: any
) {
  await db.from('payment_anomalies').insert({
    booking_id: bookingId,
    payment_id: paymentId,
    anomaly_type: anomalyType,
    details: details,
    status: 'pending_review',
    created_at: new Date().toISOString(),
  })
}

export const POST = withApiLogging(webhookHandler, 'payment/webhook')
