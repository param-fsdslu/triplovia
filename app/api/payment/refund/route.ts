import { calculateHotelRefund } from '@/lib/config/hotel-cancellation-policy'
import { NextRequest, NextResponse } from 'next/server'
import { razorpayInstance } from '@/lib/razorpay/config'
import { razorpayErrorMessage } from '@/lib/razorpay/errors'
import { normalRefundOptions } from '@/lib/razorpay/refund-options'
import { createClient, createAdminClient } from '@/lib/db/server'
import { emailService } from '@/lib/services/email.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { logger } from '@/lib/utils/logger'
import { FREE_CANCELLATION_HOURS, calculateGatewayFee } from '@/lib/config/cancellation-policy'

/**
 * Process refund for a booking
 * POST /api/payment/refund
 */
async function postHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, reason, isAdminInitiated = false, bookingType = 'hotel', overrideAmount, vendorCancelled = false } = body

    logger.always('refund/post', 'Request received', { bookingId, bookingType, isAdminInitiated, reason })

    if (!bookingId) {
      logger.always('refund/post', 'Rejected: missing bookingId')
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const db = await createClient()
    const { data: { user }, error: authError } = await db.auth.getUser()

    logger.always('refund/post', 'Auth check', {
      userId: user?.id ?? null,
      role: user?.user_metadata?.role ?? null,
      authError: authError?.message ?? null,
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (vendorCancelled && (!isAdminInitiated || bookingType !== 'hotel')) {
      return NextResponse.json({ error: 'Only super admins can record a vendor cancellation for a hotel booking' }, { status: 403 })
    }

    // Only super_admin can initiate admin refunds (not hotel_admin)
    if (isAdminInitiated) {
      const role = user.user_metadata?.role
      const isSuperAdmin = role === 'super_admin' || role === 'admin'
      logger.always('refund/post', 'Admin role check', { role, isSuperAdmin })
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Only super admin can process refunds' }, { status: 403 })
      }
    }

    const isBoatBooking = bookingType === 'boat'
    const adminDb = createAdminClient()

    // ── Step 1: Fetch booking ───────────────────────────────────────────────
    // Use the authenticated user client for SELECT so row policies let the row through.
    // For admin-initiated requests, admins have their own SELECT policies.
    // adminDb (admin client) is reserved for the UPDATEs below.
    logger.always('refund/post', 'Fetching booking', { bookingId, table: isBoatBooking ? 'boat_bookings' : 'bookings', usingUserClient: true })

    let booking: any
    let bookingError: any

    if (isBoatBooking) {
      const result = await db
        .from('boat_bookings')
        .select('*, trip_type:trip_types(name, free_cancellation_hours)')
        .eq('id', bookingId)
        .single()
      booking = result.data
      bookingError = result.error
    } else {
      const result = await db
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
      booking = result.data
      bookingError = result.error
    }

    logger.always('refund/post', 'Booking fetch result', {
      found: !!booking,
      bookingReference: booking?.booking_reference ?? null,
      bookingStatus: booking?.booking_status ?? null,
      paymentStatus: booking?.payment_status ?? null,
      userId: booking?.user_id ?? null,
      totalAmount: booking?.total_amount ?? null,
      checkIn: booking?.check_in_date ?? booking?.trip_date ?? null,
      dbErrorCode: bookingError?.code ?? null,
      dbErrorMsg: bookingError?.message ?? null,
    })

    if (bookingError || !booking) {
      logger.error('refund/post', 'Booking fetch failed', bookingError, { bookingId, bookingType })
      return NextResponse.json(
        {
          error: 'Booking not found',
          detail: bookingError?.message ?? 'No row returned',
          code: bookingError?.code ?? 'NO_ROW',
        },
        { status: 404 }
      )
    }

    // ── Step 2: Ownership check ─────────────────────────────────────────────
    if (!isAdminInitiated && booking.user_id !== user?.id) {
      logger.always('refund/post', 'Ownership check failed', {
        bookingUserId: booking.user_id,
        requestUserId: user.id,
      })
      return NextResponse.json({ error: 'Unauthorized access to booking' }, { status: 403 })
    }

    // ── Step 3: Booking status checks ───────────────────────────────────────
    const bookingStatus = booking.booking_status
    logger.always('refund/post', 'Status checks', {
      bookingStatus,
      paymentStatus: booking.payment_status,
    })

    if (bookingStatus === 'cancelled') {
      logger.always('refund/post', 'Rejected: booking already cancelled')
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 })
    }

    if (booking.payment_status !== 'paid') {
      logger.always('refund/post', 'Rejected: payment_status is not paid', { paymentStatus: booking.payment_status })
      return NextResponse.json(
        { error: 'No payment to refund. Booking payment status is not paid.' },
        { status: 400 }
      )
    }

    // ── Step 3b: 6-month age check ──────────────────────────────────────────
    // Razorpay hard-rejects refunds on payments older than 6 months at the
    // bank level. Fail early with a clear message rather than hitting the API.
    {
      const bookingCreatedAt = new Date(booking.created_at)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      if (bookingCreatedAt < sixMonthsAgo) {
        logger.always('refund/post', 'Rejected: payment older than 6 months', {
          createdAt: booking.created_at,
          sixMonthsAgo: sixMonthsAgo.toISOString(),
        })
        return NextResponse.json(
          { error: 'Refund not available. Razorpay does not support refunds on payments older than 6 months.' },
          { status: 400 }
        )
      }
    }

    // ── Step 4: Find payment record ─────────────────────────────────────────
    // For hotel bookings the user client works (payments_user_own policy).
    // For boat bookings the policy only covers hotel bookings, so we need adminDb.
    logger.always('refund/post', 'Fetching payment record', {
      lookupField: isBoatBooking ? 'boat_booking_id' : 'booking_id',
      bookingId,
      usingUserClient: !isBoatBooking,
    })

    const paymentClient = isBoatBooking ? adminDb : db
    const paymentQuery = isBoatBooking
      ? paymentClient.from('payments').select('*').eq('boat_booking_id', bookingId)
      : paymentClient.from('payments').select('*').eq('booking_id', bookingId)
    const { data: payments, error: paymentFetchError } = await paymentQuery
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)

    let payment = payments?.[0]

    logger.always('refund/post', 'Payment fetch (status=success)', {
      found: !!payment,
      paymentId: payment?.id ?? null,
      gatewayPaymentId: payment?.payment_gateway_payment_id ?? null,
      paymentStatus: payment?.status ?? null,
      fetchError: paymentFetchError?.message ?? null,
    })

    // Fallback: match via razorpay_payment_id on the booking
    if (!payment && booking.razorpay_payment_id) {
      logger.always('refund/post', 'Trying fallback payment lookup via razorpay_payment_id', {
        razorpayPaymentId: booking.razorpay_payment_id,
      })
      const { data: fallbackPayments, error: fallbackError } = await adminDb
        .from('payments')
        .select('*')
        .eq('payment_gateway_payment_id', booking.razorpay_payment_id)
        .limit(1)
      payment = fallbackPayments?.[0]
      logger.always('refund/post', 'Fallback payment lookup result', {
        found: !!payment,
        paymentId: payment?.id ?? null,
        fallbackError: fallbackError?.message ?? null,
      })
    }

    // If no payment record in DB but booking has razorpay_payment_id, synthesize one.
    // This handles the case where the payment record insert failed (e.g. service role issue).
    if (!payment && booking.razorpay_payment_id) {
      logger.always('refund/post', 'No payment record — using booking.razorpay_payment_id directly', {
        razorpayPaymentId: booking.razorpay_payment_id,
      })
      payment = {
        id: null, // no DB record
        payment_gateway_payment_id: booking.razorpay_payment_id,
        status: 'success',
        amount: booking.total_amount,
      }
    }

    if (!payment || !payment.payment_gateway_payment_id) {
      logger.always('refund/post', 'Rejected: payment record not found or missing gateway ID', {
        paymentExists: !!payment,
        hasGatewayId: !!payment?.payment_gateway_payment_id,
      })
      return NextResponse.json(
        { error: 'Payment record not found or missing payment ID' },
        { status: 400 }
      )
    }

    if (payment.status === 'refunded' || payment.status === 'partially_refunded') {
      logger.always('refund/post', 'Rejected: payment already refunded', { paymentStatus: payment.status })
      return NextResponse.json({ error: 'Payment is already refunded' }, { status: 400 })
    }

    // ── Step 5: Calculate refund ────────────────────────────────────────────
    const freeCancellationHours = isBoatBooking
      ? (booking.trip_type?.free_cancellation_hours ?? FREE_CANCELLATION_HOURS)
      : FREE_CANCELLATION_HOURS
    const refundCalculation = isBoatBooking
      ? calculateBoatRefundAmount(booking, freeCancellationHours)
      : calculateHotelRefund(booking, new Date(), vendorCancelled === true)

    logger.always('refund/post', 'Refund calculation result', {
      freeCancellationHours,
      totalAmount: booking.total_amount,
      refundAmount: refundCalculation.refundAmount,
      cancellationCharge: refundCalculation.cancellationCharge,
      isEligible: refundCalculation.isEligible,
      policyApplied: refundCalculation.policyApplied,
      message: refundCalculation.message,
    })

    // ── Step 5b: Admin override — admin can set the final refund amount,
    // capped at what the customer actually paid. This can both reduce AND
    // raise the policy-calculated amount (e.g. a discretionary goodwill refund),
    // and can rescue an otherwise-ineligible (₹0) case.
    let finalRefundAmount = refundCalculation.refundAmount
    let isAmountOverridden = false
    if (isAdminInitiated && overrideAmount !== undefined && overrideAmount !== null) {
      const parsedOverride = Math.round(parseFloat(overrideAmount) * 100) / 100
      const totalPaid = parseFloat(booking.total_amount)
      if (!Number.isFinite(parsedOverride) || parsedOverride < 0 || parsedOverride > totalPaid) {
        logger.always('refund/post', 'Rejected: invalid override amount', { overrideAmount, totalPaid })
        return NextResponse.json(
          { error: `Refund amount must be between ₹0 and the amount paid (₹${totalPaid.toLocaleString('en-IN')})` },
          { status: 400 }
        )
      }
      finalRefundAmount = parsedOverride
      isAmountOverridden = true
      logger.always('refund/post', 'Admin overrode refund amount', {
        calculated: refundCalculation.refundAmount,
        override: finalRefundAmount,
      })
    }

    if (vendorCancelled && finalRefundAmount !== Number(booking.total_amount)) {
      return NextResponse.json({ error: 'Vendor cancellations require a full refund' }, { status: 400 })
    }

    if (finalRefundAmount <= 0) {
      logger.always('refund/post', 'Rejected: no refund amount', { policy: refundCalculation.policyApplied })
      return NextResponse.json(
        {
          error: 'No refund available',
          message: refundCalculation.message,
          isEligible: false,
        },
        { status: 400 }
      )
    }

    const finalIsFullRefund = finalRefundAmount >= parseFloat(booking.total_amount) - 0.01

    // ── Step 6a: Customer cancellation — create pending_approval record ──────
    if (!isAdminInitiated) {
      logger.always('refund/post', 'Customer cancellation: updating booking status', {
        table: isBoatBooking ? 'boat_bookings' : 'bookings',
        bookingId,
        usingUserClient: true,
      })

      // Use the authenticated user client — bookings_user_own FOR ALL policy
      // allows users to update their own rows. adminDb (service role) is
      // misconfigured in production and silently updates 0 rows.
      let updateError: any
      if (isBoatBooking) {
        const { error } = await db
          .from('boat_bookings')
          .update({
            booking_status: 'cancelled',
            payment_status: 'refund_requested',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
          .eq('user_id', user.id)
        updateError = error
      } else {
        const { error } = await db
          .from('bookings')
          .update({
            booking_status: 'cancelled',
            payment_status: 'refund_requested',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
          .eq('user_id', user.id)
        updateError = error
      }

      logger.always('refund/post', 'Booking update result', {
        updateError: updateError?.message ?? null,
        updateErrorCode: updateError?.code ?? null,
      })

      if (updateError) {
        logger.error('refund/post', 'Booking update failed', updateError, { bookingId })
        return NextResponse.json(
          { error: 'Failed to cancel booking', detail: updateError.message, code: updateError.code },
          { status: 500 }
        )
      }

      // Insert refund_transactions record
      const refundRecord: any = {
        refund_amount: refundCalculation.refundAmount,
        cancellation_charge: refundCalculation.cancellationCharge,
        total_paid: parseFloat(booking.total_amount),
        refund_reason: vendorCancelled ? 'Vendor cancellation: ' + (reason || 'Cancelled by property') : reason,
        is_full_refund: refundCalculation.isFullRefund,
        processed_by: 'customer',
        status: 'pending_approval',
        // Store gateway payment ID directly — allows admin approval even when
        // the payments table record is missing (e.g. due to service role issues)
        payment_gateway_payment_id: payment.payment_gateway_payment_id,
      }
      if (payment.id) refundRecord.payment_id = payment.id
      if (isBoatBooking) {
        refundRecord.boat_booking_id = bookingId
      } else {
        refundRecord.booking_id = bookingId
      }

      // Use user client — the refund_transactions insert policy (lib/db/policies.ts)
      // allows users to insert for their own bookings.
      const { error: insertError } = await db.from('refund_transactions').insert(refundRecord)
      logger.always('refund/post', 'Refund transaction insert result', {
        insertError: insertError?.message ?? null,
        insertErrorCode: insertError?.code ?? null,
      })

      if (insertError) {
        logger.error('refund/post', 'refund_transactions insert failed', insertError, { bookingId })
      }

      // Send confirmation email — to the booking's email, else the account's (mobile-only guests may have neither)
      const guestEmail: string | null = booking.guest_email || user.email || null
      try {
        logger.always('refund/post', 'Sending refund requested email', {
          to: guestEmail,
          userName: user.user_metadata?.name ?? null,
        })
        if (!guestEmail) throw new Error('No email on the booking or account')
        await emailService.sendRefundRequested({
          to: guestEmail,
          userName: user.user_metadata?.name || guestEmail.split('@')[0],
          bookingId: booking.booking_reference,
          hotelName: isBoatBooking ? (booking.trip_type?.name || 'Boat Trip') : 'Hotel',
          checkInDate: isBoatBooking ? booking.trip_date : booking.check_in_date,
          checkOutDate: isBoatBooking ? booking.trip_date : booking.check_out_date,
          refundAmount: refundCalculation.refundAmount,
        })
        logger.always('refund/post', 'Refund requested email sent', { to: guestEmail })
      } catch (emailError: any) {
        logger.error('refund/post', 'Failed to send refund request email', emailError, { bookingId })
      }

      logger.always('refund/post', 'Customer cancellation complete — pending_approval created', { bookingId })
      return NextResponse.json({
        success: true,
        message: 'Cancellation confirmed. Your refund request has been submitted for admin review.',
        status: 'pending_approval',
        refund: refundCalculation,
      })
    }

    // ── Step 6b: Admin-initiated — call Razorpay immediately ─────────────────
    logger.always('refund/post', 'Admin-initiated: calling Razorpay', {
      gatewayPaymentId: payment.payment_gateway_payment_id,
      amountPaise: Math.round(finalRefundAmount * 100),
      bookingReference: booking.booking_reference,
      isAmountOverridden,
    })

    try {
      // NOTE: Razorpay supports X-Refund-Idempotency headers to prevent duplicate
      // refunds on retry, but the Node SDK v2.9.x payments.refund() method does
      // not expose a way to pass custom headers. The atomic claim mechanism
      // (pending_approval → processing) in approveRefundRequest guards the admin
      // path; this direct admin-initiated path relies on the receipt uniqueness.
      const refundResponse = await razorpayInstance.payments.refund(
        payment.payment_gateway_payment_id,
        {
          ...normalRefundOptions(finalRefundAmount),
          notes: {
            booking_id: bookingId,
            booking_reference: booking.booking_reference,
            reason: reason || 'Admin initiated refund',
            refund_type: finalIsFullRefund ? 'full' : 'partial',
            amount_overridden: isAmountOverridden ? 'true' : 'false',
          },
          receipt: `refund_${booking.booking_reference}_${Date.now()}`,
        }
      )

      logger.always('refund/post', 'Razorpay refund response', {
        refundId: refundResponse.id,
        status: refundResponse.status,
        amountPaise: refundResponse.amount,
        speed: refundResponse.speed_processed,
      })

      // Update booking
      const newPaymentStatus = finalIsFullRefund ? 'refunded' : 'partially_refunded'
      let bookingUpdateError: any
      if (isBoatBooking) {
        const { error } = await adminDb
          .from('boat_bookings')
          .update({
            booking_status: 'cancelled',
            payment_status: newPaymentStatus,
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
        bookingUpdateError = error
      } else {
        const { error } = await adminDb
          .from('bookings')
          .update({
            booking_status: 'cancelled',
            payment_status: newPaymentStatus,
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
        bookingUpdateError = error
      }
      logger.always('refund/post', 'Booking update after Razorpay', {
        newPaymentStatus,
        bookingUpdateError: bookingUpdateError?.message ?? null,
      })
      if (bookingUpdateError) {
        logger.error('refund/post', 'Booking update failed after Razorpay refund', bookingUpdateError, { bookingId })
      }

      // Update payment record
      const { error: paymentUpdateError } = await adminDb
        .from('payments')
        .update({
          status: newPaymentStatus,
          refund_amount: finalRefundAmount,
          refund_id: refundResponse.id,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
      logger.always('refund/post', 'Payment record update', {
        paymentUpdateError: paymentUpdateError?.message ?? null,
      })
      if (paymentUpdateError) {
        logger.error('refund/post', 'Payment record update failed', paymentUpdateError, { paymentId: payment.id })
      }

      // Insert refund_transactions record
      const refundRecord: any = {
        refund_gateway_id: refundResponse.id,
        refund_amount: finalRefundAmount,
        calculated_refund_amount: refundCalculation.refundAmount,
        cancellation_charge: refundCalculation.cancellationCharge,
        total_paid: parseFloat(booking.total_amount),
        refund_reason: vendorCancelled ? 'Vendor cancellation: ' + (reason || 'Cancelled by property') : reason,
        is_full_refund: finalIsFullRefund,
        processed_by: 'admin',
        processed_by_user_id: user.id,
        status: 'processing',
        payment_gateway_payment_id: payment.payment_gateway_payment_id,
      }
      if (isAmountOverridden) {
        refundRecord.amount_edited_by = user.id
        refundRecord.amount_edit_reason = reason || 'Admin-edited refund amount'
      }
      if (payment.id) refundRecord.payment_id = payment.id
      if (isBoatBooking) {
        refundRecord.boat_booking_id = bookingId
      } else {
        refundRecord.booking_id = bookingId
      }
      const { error: txInsertError } = await adminDb.from('refund_transactions').insert(refundRecord)
      logger.always('refund/post', 'Refund transaction insert (admin)', {
        txInsertError: txInsertError?.message ?? null,
      })
      if (txInsertError) {
        logger.error('refund/post', 'refund_transactions insert failed (admin)', txInsertError, { bookingId })
      }

      // Send cancellation email
      try {
        const { data: userData } = await adminDb.auth.admin.getUserById(booking.user_id)
        const guestEmail: string | null = booking.guest_email || userData?.user?.email || null
        if (userData?.user && guestEmail) {
          await emailService.sendBookingCancellation({
            to: guestEmail,
            userName: userData.user.user_metadata?.name || guestEmail.split('@')[0],
            bookingId: booking.booking_reference,
            hotelName: isBoatBooking ? (booking.trip_type?.name || 'Boat Trip') : 'Hotel',
            checkInDate: isBoatBooking ? booking.trip_date : booking.check_in_date,
            checkOutDate: isBoatBooking ? booking.trip_date : booking.check_out_date,
            refundAmount: refundCalculation.refundAmount,
          })
          logger.always('refund/post', 'Cancellation email sent', { to: guestEmail })
        }
      } catch (emailError: any) {
        logger.error('refund/post', 'Failed to send cancellation email', emailError, { bookingId })
      }

      logger.always('refund/post', 'Admin refund complete', { refundId: refundResponse.id, bookingId })
      return NextResponse.json({
        success: true,
        message: 'Refund processed successfully',
        refund: {
          refundId: refundResponse.id,
          estimatedDays: '5-7 business days',
          ...refundCalculation,
          refundAmount: finalRefundAmount,
          isFullRefund: finalIsFullRefund,
          isAmountOverridden,
        },
      })
    } catch (razorpayError: any) {
      const gatewayError = razorpayErrorMessage(razorpayError)
      logger.error('refund/post', 'Razorpay refund call failed', razorpayError, {
        bookingId,
        gatewayPaymentId: payment.payment_gateway_payment_id,
        errorCode: razorpayError.error?.code ?? null,
        errorDesc: razorpayError.error?.description ?? null,
      })

      // payment.id may be null when using the synthesized fallback object
      // (no DB record). Guard it and always store the gateway payment ID.
      const failedRefundRecord: any = {
        refund_amount: finalRefundAmount,
        calculated_refund_amount: refundCalculation.refundAmount,
        refund_reason: vendorCancelled ? 'Vendor cancellation: ' + (reason || 'Cancelled by property') : reason,
        processed_by: 'admin',
        processed_by_user_id: user.id,
        status: 'failed',
        error_message: gatewayError,
        payment_gateway_payment_id: payment.payment_gateway_payment_id,
      }
      if (payment.id) failedRefundRecord.payment_id = payment.id
      if (isBoatBooking) {
        failedRefundRecord.boat_booking_id = bookingId
      } else {
        failedRefundRecord.booking_id = bookingId
      }
      await db.from('refund_transactions').insert(failedRefundRecord)

      // The admin sees `error`, so it carries Razorpay's reason
      return NextResponse.json(
        {
          error: `Razorpay refused the refund: ${gatewayError}`,
          details: gatewayError,
        },
        { status: 502 }
      )
    }
  } catch (error: any) {
    logger.error('refund/post', 'Unhandled error in postHandler', error)
    return NextResponse.json(
      { error: 'Failed to process refund', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Calculate refund amount for boat bookings based on trip date and free cancellation hours
 */
function calculateBoatRefundAmount(booking: any, freeCancellationHours: number) {
  const totalAmount = parseFloat(booking.total_amount)
  const tripDate = new Date(booking.trip_date)
  const now = new Date()

  // Calculate hours until trip
  const hoursUntilTrip = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Check if trip date has already passed
  if (hoursUntilTrip < 0) {
    return {
      refundAmount: 0,
      cancellationCharge: totalAmount,
      isFullRefund: false,
      isEligible: false,
      message: 'Refund not available after trip date has passed',
      hoursUntilTrip: 0,
      policyApplied: 'no-refund-after-trip',
    }
  }

  // Free cancellation window: refund minus gateway fee
  if (hoursUntilTrip >= freeCancellationHours) {
    const cancellationCharge = calculateGatewayFee(totalAmount)
    const refundAmount = Math.max(0, Math.round((totalAmount - cancellationCharge) * 100) / 100)
    return {
      refundAmount,
      cancellationCharge,
      isFullRefund: false,
      isEligible: true,
      message: `Refund available minus gateway fee (cancelled ${Math.floor(hoursUntilTrip)} hours before trip)`,
      hoursUntilTrip: Math.floor(hoursUntilTrip),
      policyApplied: `free-cancellation-${freeCancellationHours}h`,
    }
  }

  // Within cancellation window - no refund
  return {
    refundAmount: 0,
    cancellationCharge: totalAmount,
    isFullRefund: false,
    isEligible: false,
    message: `No refund available (within ${freeCancellationHours}-hour cancellation window). ${Math.floor(hoursUntilTrip)} hours remaining until trip.`,
    hoursUntilTrip: Math.floor(hoursUntilTrip),
    policyApplied: `no-refund-within-${freeCancellationHours}h`,
  }
}

/**
 * Get refund eligibility for a booking (without processing)
 * GET /api/payment/refund?bookingId=xxx&bookingType=hotel|boat
 */
async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const bookingType = searchParams.get('bookingType') || 'hotel'

    logger.always('refund/get', 'Eligibility check request', { bookingId, bookingType })

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const db = await createClient()
    const { data: { user }, error: authError } = await db.auth.getUser()

    logger.always('refund/get', 'Auth check', {
      userId: user?.id ?? null,
      role: user?.user_metadata?.role ?? null,
      authError: authError?.message ?? null,
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = user.user_metadata?.role
    const isAdmin = role === 'super_admin' || role === 'admin' || role === 'hotel_admin'
    const isBoatBooking = bookingType === 'boat'

    // Get booking — admins can check eligibility for any booking
    let booking: any
    let error: any

    logger.always('refund/get', 'Fetching booking', {
      table: isBoatBooking ? 'boat_bookings' : 'bookings',
      isAdmin,
      userId: user.id,
    })

    if (isBoatBooking) {
      let q = db
        .from('boat_bookings')
        .select('*, trip_type:trip_types(free_cancellation_hours)')
        .eq('id', bookingId)
      if (!isAdmin) q = q.eq('user_id', user.id)
      const result = await q.single()
      booking = result.data
      error = result.error
    } else {
      let q = db
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
      if (!isAdmin) q = q.eq('user_id', user.id)
      const result = await q.single()
      booking = result.data
      error = result.error
    }

    logger.always('refund/get', 'Booking fetch result', {
      found: !!booking,
      bookingReference: booking?.booking_reference ?? null,
      bookingStatus: booking?.booking_status ?? null,
      paymentStatus: booking?.payment_status ?? null,
      checkIn: booking?.check_in_date ?? booking?.trip_date ?? null,
      dbErrorCode: error?.code ?? null,
      dbErrorMsg: error?.message ?? null,
    })

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found', code: error?.code ?? 'NO_ROW', detail: error?.message ?? null },
        { status: 404 }
      )
    }

    // Calculate refund eligibility
    const freeCancellationHours = isBoatBooking
      ? (booking.trip_type?.free_cancellation_hours ?? FREE_CANCELLATION_HOURS)
      : FREE_CANCELLATION_HOURS
    const refundCalculation = isBoatBooking
      ? calculateBoatRefundAmount(booking, freeCancellationHours)
      : calculateHotelRefund(booking)

    logger.always('refund/get', 'Eligibility result', {
      freeCancellationHours,
      totalAmount: booking.total_amount,
      isEligible: refundCalculation.isEligible,
      refundAmount: refundCalculation.refundAmount,
      cancellationCharge: refundCalculation.cancellationCharge,
      policyApplied: refundCalculation.policyApplied,
    })

    return NextResponse.json({
      eligible: refundCalculation.isEligible,
      ...refundCalculation,
    })
  } catch (error: any) {
    logger.error('refund/get', 'Unhandled error', error)
    return NextResponse.json(
      { error: 'Failed to check eligibility', details: error.message },
      { status: 500 }
    )
  }
}

export const GET = withApiLogging(getHandler, 'payment/refund')
export const POST = withApiLogging(postHandler, 'payment/refund')
