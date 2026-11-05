'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin, requireSuperAdmin, getAdminHotelAccess } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { razorpayInstance } from '@/lib/razorpay/config'
import { razorpayErrorMessage } from '@/lib/razorpay/errors'
import { emailService } from '@/lib/services/email.service'
import { logger } from '@/lib/utils/logger'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Get all payments with filters
 * Filtered by role: super_admin sees all, hotel_admin sees only their hotels' payments
 */
export async function getPayments(filters?: {
  page?: number
  limit?: number
  status?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}) {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()

    if (!adminAccess) {
      throw new Error('Unauthorized')
    }

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    let query = db
      .from('bookings')
      .select(`
        id,
        booking_reference,
        guest_first_name,
        guest_last_name,
        guest_email,
        total_amount,
        payment_status,
        payment_method,
        payment_transaction_id,
        created_at,
        hotel_id,
        hotels(name),
        room_types(name)
      `, { count: 'exact' })

    // Filter by hotel access
    if (adminAccess.hotelIds !== null) {
      query = query.in('hotel_id', adminAccess.hotelIds)
    }

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('payment_status', filters.status)
    }

    if (filters?.search) {
      query = query.or(
        `booking_reference.ilike.%${filters.search}%,guest_email.ilike.%${filters.search}%,guest_first_name.ilike.%${filters.search}%,guest_last_name.ilike.%${filters.search}%,payment_transaction_id.ilike.%${filters.search}%`
      )
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data: payments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching payments:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch payments',
      payments: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  }
}

/**
 * Get payment statistics
 * Filtered by role: super_admin sees all, hotel_admin sees only their hotels' payments
 */
export async function getPaymentStats() {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()

    if (!adminAccess) {
      throw new Error('Unauthorized')
    }

    // Build revenue query with hotel filter
    let revenueQuery = db
      .from('bookings')
      .select('total_amount')
      .eq('payment_status', 'paid')

    if (adminAccess.hotelIds !== null) {
      revenueQuery = revenueQuery.in('hotel_id', adminAccess.hotelIds)
    }

    const { data: revenueData } = await revenueQuery
    const totalRevenue = revenueData?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0

    // Get payment status counts with hotel filter
    let statusQuery = db
      .from('bookings')
      .select('payment_status')

    if (adminAccess.hotelIds !== null) {
      statusQuery = statusQuery.in('hotel_id', adminAccess.hotelIds)
    }

    const { data: statusData } = await statusQuery
    const statusCounts = statusData?.reduce((acc: any, booking) => {
      acc[booking.payment_status] = (acc[booking.payment_status] || 0) + 1
      return acc
    }, {}) || {}

    // Get recent transactions with hotel filter
    let transactionsQuery = db
      .from('bookings')
      .select(`
        id,
        booking_reference,
        guest_first_name,
        guest_last_name,
        total_amount,
        payment_status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (adminAccess.hotelIds !== null) {
      transactionsQuery = transactionsQuery.in('hotel_id', adminAccess.hotelIds)
    }

    const { data: recentTransactions } = await transactionsQuery

    // Get revenue this month with hotel filter
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    let monthRevenueQuery = db
      .from('bookings')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', startOfMonth.toISOString())

    if (adminAccess.hotelIds !== null) {
      monthRevenueQuery = monthRevenueQuery.in('hotel_id', adminAccess.hotelIds)
    }

    const { data: monthRevenue } = await monthRevenueQuery
    const revenueThisMonth = monthRevenue?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0

    return {
      success: true,
      stats: {
        totalRevenue,
        revenueThisMonth,
        statusCounts,
        recentTransactions,
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching payment stats:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch payment statistics',
    }
  }
}

/**
 * Get payment details
 */
export async function getPaymentDetails(bookingId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: payment, error } = await db
      .from('bookings')
      .select(`
        *,
        hotels(id, name, city),
        room_types(id, name, base_price)
      `)
      .eq('id', bookingId)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      payment,
    }
  } catch (error: any) {
    serverLog.error('Error fetching payment details:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch payment details',
    }
  }
}

/**
 * Approve a pending refund request — calls Razorpay and sends confirmation email
 * Only super_admin can approve
 */
export async function approveRefundRequest(refundTransactionId: string, overrideAmount?: number) {
  try {
    await requireSuperAdmin()
    const db = await createClient()
    // Service role client needed for auth.admin.getUserById
    const { createAdminClient } = await import('@/lib/db/server')
    const adminClient = createAdminClient()

    logger.always('admin/approveRefund', 'Approve request received', { refundTransactionId })

    // Get the refund transaction with related payment, hotel booking, and boat booking
    const { data: refundTx, error: txError } = await db
      .from('refund_transactions')
      .select(`
        *,
        payment:payments(
          id,
          payment_gateway_payment_id,
          amount,
          booking_id,
          boat_booking_id
        ),
        booking:bookings!booking_id(
          id,
          booking_reference,
          check_in_date,
          check_out_date,
          user_id,
          hotel:hotels(name)
        ),
        boat_booking:boat_bookings!boat_booking_id(
          id,
          booking_reference,
          trip_date,
          user_id,
          boat:boats(name)
        )
      `)
      .eq('id', refundTransactionId)
      .single()

    logger.always('admin/approveRefund', 'Refund transaction fetch', {
      found: !!refundTx,
      status: refundTx?.status ?? null,
      refundAmount: refundTx?.refund_amount ?? null,
      isFullRefund: refundTx?.is_full_refund ?? null,
      hasBooking: !!(refundTx?.booking as any),
      hasBoatBooking: !!(refundTx?.boat_booking as any),
      txError: txError?.message ?? null,
    })

    if (txError || !refundTx) {
      return { success: false, error: 'Refund transaction not found' }
    }

    const payment = refundTx.payment as any
    // Fallback: gateway payment ID may be stored directly on the refund transaction
    // when the payments table record was never created (e.g. service role misconfiguration)
    const gatewayPaymentId = payment?.payment_gateway_payment_id
      || (refundTx as any).payment_gateway_payment_id

    logger.always('admin/approveRefund', 'Payment info', {
      paymentId: payment?.id ?? null,
      gatewayPaymentId,
      amount: payment?.amount ?? null,
      bookingId: payment?.booking_id ?? null,
      boatBookingId: payment?.boat_booking_id ?? null,
      usingFallbackGatewayId: !payment?.payment_gateway_payment_id && !!(refundTx as any).payment_gateway_payment_id,
    })

    if (!gatewayPaymentId) {
      return { success: false, error: 'Payment gateway ID not found' }
    }

    // Determine which booking this is for
    const booking = refundTx.booking as any
    const boatBooking = refundTx.boat_booking as any
    const activeBooking = booking ?? boatBooking
    const isBoatBooking = !booking && !!boatBooking

    logger.always('admin/approveRefund', 'Booking resolved', {
      isBoatBooking,
      bookingReference: activeBooking?.booking_reference ?? null,
      userId: activeBooking?.user_id ?? null,
    })

    if (!activeBooking) {
      return { success: false, error: 'Related booking not found' }
    }

    // Atomically claim the pending_approval slot to prevent double-processing.
    // Update returns the updated rows; if empty, another process already claimed it.
    const { data: claimed } = await db
      .from('refund_transactions')
      .update({ status: 'processing' })
      .eq('id', refundTransactionId)
      .eq('status', 'pending_approval')
      .select('id')

    logger.always('admin/approveRefund', 'Atomic claim result', {
      claimed: claimed?.length ?? 0,
    })

    if (!claimed || claimed.length === 0) {
      return { success: false, error: 'Refund is not in pending_approval state' }
    }

    // Admin can override the customer-requested refund amount, capped at what
    // was actually paid. Resolve the final amount before calling Razorpay.
    const calculatedAmount = parseFloat(refundTx.refund_amount)
    const totalPaid = parseFloat(refundTx.total_paid)
    let finalRefundAmount = calculatedAmount
    let isAmountOverridden = false
    if (overrideAmount !== undefined && overrideAmount !== null) {
      const parsedOverride = Math.round(overrideAmount * 100) / 100
      if (!Number.isFinite(parsedOverride) || parsedOverride < 0 || parsedOverride > totalPaid) {
        // Roll back the claim so the request stays actionable
        await db
          .from('refund_transactions')
          .update({ status: 'pending_approval' })
          .eq('id', refundTransactionId)
        return { success: false, error: `Refund amount must be between ₹0 and ₹${totalPaid.toLocaleString('en-IN')}` }
      }
      finalRefundAmount = parsedOverride
      isAmountOverridden = finalRefundAmount !== calculatedAmount
    }
    const finalIsFullRefund = finalRefundAmount >= totalPaid - 0.01

    // Call Razorpay to process the refund
    const refundAmountPaise = Math.round(finalRefundAmount * 100)
    logger.always('admin/approveRefund', 'Calling Razorpay', {
      gatewayPaymentId,
      amountPaise: refundAmountPaise,
      bookingReference: activeBooking.booking_reference,
      isAmountOverridden,
    })

    let refundResponse: any
    try {
      // NOTE: Razorpay supports X-Refund-Idempotency headers to prevent duplicate
      // refunds on retry, but the Node SDK v2.9.x payments.refund() does not
      // expose custom headers. The atomic claim (pending_approval → processing)
      // above guards against double-processing at the application level.
      refundResponse = await razorpayInstance.payments.refund(
        gatewayPaymentId,
        {
          amount: refundAmountPaise,
          // 'optimum' attempts instant processing first, falls back to normal
          // (5-7 days) automatically. Razorpay charges a small fee for instant;
          // auto-waived on fallback.
          speed: 'optimum',
          notes: {
            booking_reference: activeBooking.booking_reference || '',
            reason: refundTx.refund_reason || 'Admin approved refund',
            approved_by: 'super_admin',
            amount_overridden: isAmountOverridden ? 'true' : 'false',
          },
          receipt: `refund_${activeBooking.booking_reference || refundTransactionId}_${Date.now()}`,
        }
      )
      logger.always('admin/approveRefund', 'Razorpay response', {
        refundId: refundResponse.id,
        status: refundResponse.status,
        amountPaise: refundResponse.amount,
      })
    } catch (razorpayError: any) {
      const gatewayError = razorpayErrorMessage(razorpayError)
      // Roll back to pending_approval so admin can retry
      await db
        .from('refund_transactions')
        .update({ status: 'pending_approval', error_message: gatewayError })
        .eq('id', refundTransactionId)
      logger.error('admin/approveRefund', 'Razorpay refund call failed', razorpayError, { gatewayError })
      return { success: false, error: `Razorpay refused the refund: ${gatewayError}` }
    }

    const newPaymentStatus = finalIsFullRefund ? 'refunded' : 'partially_refunded'
    const { data: { user: adminUser } } = await db.auth.getUser()

    // Update the refund transaction with gateway refund ID (and the override audit trail, if any)
    const { error: txUpdateError } = await db
      .from('refund_transactions')
      .update({
        refund_gateway_id: refundResponse.id,
        processed_by_user_id: adminUser?.id,
        refund_amount: finalRefundAmount,
        calculated_refund_amount: calculatedAmount,
        is_full_refund: finalIsFullRefund,
        ...(isAmountOverridden
          ? { amount_edited_by: adminUser?.id, amount_edit_reason: refundTx.refund_reason || 'Admin-edited refund amount' }
          : {}),
      })
      .eq('id', refundTransactionId)
    logger.always('admin/approveRefund', 'Refund transaction updated with gateway ID', {
      refundGatewayId: refundResponse.id,
      error: txUpdateError?.message ?? null,
    })

    // Resolve booking IDs — prefer the payment record's FKs, fall back to
    // refundTx columns directly (when no payments table record exists).
    const resolvedBookingId = payment?.booking_id ?? (refundTx as any).booking_id ?? null
    const resolvedBoatBookingId = payment?.boat_booking_id ?? (refundTx as any).boat_booking_id ?? null

    // Update the correct booking table
    if (resolvedBookingId) {
      const { error: bookingUpdateError } = await db
        .from('bookings')
        .update({ payment_status: newPaymentStatus })
        .eq('id', resolvedBookingId)
      logger.always('admin/approveRefund', 'Booking payment_status updated', {
        bookingId: resolvedBookingId,
        newPaymentStatus,
        error: bookingUpdateError?.message ?? null,
      })
    } else if (resolvedBoatBookingId) {
      const { error: boatUpdateError } = await db
        .from('boat_bookings')
        .update({ payment_status: newPaymentStatus })
        .eq('id', resolvedBoatBookingId)
      logger.always('admin/approveRefund', 'Boat booking payment_status updated', {
        boatBookingId: resolvedBoatBookingId,
        newPaymentStatus,
        error: boatUpdateError?.message ?? null,
      })
    }

    // Update the payment record only if one exists in the DB
    if (payment?.id) {
      const { error: paymentUpdateError } = await db
        .from('payments')
        .update({
          status: newPaymentStatus,
          refund_amount: finalRefundAmount,
          refund_id: refundResponse.id,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
      logger.always('admin/approveRefund', 'Payment record updated', {
        paymentId: payment.id,
        error: paymentUpdateError?.message ?? null,
      })
    } else {
      logger.always('admin/approveRefund', 'No payments table record — skipping payment update', {
        gatewayPaymentId,
      })
    }

    // Send approval email using service role client for auth.admin
    try {
      const { data: userData } = await adminClient.auth.admin.getUserById(activeBooking.user_id)
      logger.always('admin/approveRefund', 'User fetch for email', {
        userFound: !!userData?.user,
        email: userData?.user?.email ?? null,
      })
      if (userData?.user?.email) {
        const propertyName = isBoatBooking
          ? (boatBooking.boat?.name || 'Boat Trip')
          : (booking.hotel?.name || 'Hotel')
        await emailService.sendBookingCancellation({
          to: userData.user.email,
          userName: userData.user.user_metadata?.name || userData.user.email.split('@')[0],
          bookingId: activeBooking.booking_reference,
          hotelName: propertyName,
          checkInDate: isBoatBooking ? boatBooking.trip_date : booking.check_in_date,
          checkOutDate: isBoatBooking ? boatBooking.trip_date : booking.check_out_date,
          refundAmount: finalRefundAmount,
        })
        logger.always('admin/approveRefund', 'Approval email sent', { to: userData.user.email })
      }
    } catch (emailError) {
      logger.error('admin/approveRefund', 'Failed to send refund approval email', emailError)
    }

    revalidatePath(`${ADMIN_PATH}/refunds`)
    revalidatePath(`${ADMIN_PATH}/bookings`)

    logger.always('admin/approveRefund', 'Approve complete', { refundId: refundResponse.id })
    return { success: true, refundId: refundResponse.id }
  } catch (error: any) {
    logger.error('admin/approveRefund', 'Unhandled error', error)
    return { success: false, error: error.message || 'Failed to approve refund' }
  }
}

/**
 * Reject a pending refund request — notifies customer, no Razorpay call
 * Only super_admin can reject
 */
export async function rejectRefundRequest(refundTransactionId: string, reason?: string) {
  try {
    await requireSuperAdmin()
    const db = await createClient()
    // Service role client needed for auth.admin.getUserById
    const { createAdminClient } = await import('@/lib/db/server')
    const adminClient = createAdminClient()

    logger.always('admin/rejectRefund', 'Reject request received', { refundTransactionId, reason })

    // Get the refund transaction with related payment, hotel booking, and boat booking
    const { data: refundTx, error: txError } = await db
      .from('refund_transactions')
      .select(`
        *,
        payment:payments(id, booking_id, boat_booking_id),
        booking:bookings!booking_id(
          id,
          booking_reference,
          check_in_date,
          check_out_date,
          user_id,
          hotel:hotels(name)
        ),
        boat_booking:boat_bookings!boat_booking_id(
          id,
          booking_reference,
          trip_date,
          user_id,
          boat:boats(name)
        )
      `)
      .eq('id', refundTransactionId)
      .single()

    logger.always('admin/rejectRefund', 'Refund transaction fetch', {
      found: !!refundTx,
      status: refundTx?.status ?? null,
      hasBooking: !!(refundTx?.booking as any),
      hasBoatBooking: !!(refundTx?.boat_booking as any),
      txError: txError?.message ?? null,
    })

    if (txError || !refundTx) {
      return { success: false, error: 'Refund transaction not found' }
    }

    if (refundTx.status !== 'pending_approval') {
      logger.always('admin/rejectRefund', 'Rejected: wrong status', { status: refundTx.status })
      return { success: false, error: 'Refund is not in pending_approval state' }
    }

    const payment = refundTx.payment as any
    const booking = refundTx.booking as any
    const boatBooking = refundTx.boat_booking as any
    const activeBooking = booking ?? boatBooking
    const isBoatBooking = !booking && !!boatBooking

    logger.always('admin/rejectRefund', 'Booking resolved', {
      isBoatBooking,
      bookingReference: activeBooking?.booking_reference ?? null,
      userId: activeBooking?.user_id ?? null,
    })

    const { data: { user: adminUser } } = await db.auth.getUser()

    // Update refund transaction to rejected
    const { error: txUpdateError } = await db
      .from('refund_transactions')
      .update({
        status: 'rejected',
        notes: reason || 'Refund request rejected by admin',
        processed_by_user_id: adminUser?.id,
      })
      .eq('id', refundTransactionId)
    logger.always('admin/rejectRefund', 'Refund transaction marked rejected', {
      error: txUpdateError?.message ?? null,
    })

    // Resolve booking IDs — prefer payment record FKs, fall back to refundTx columns
    const resolvedBookingId = payment?.booking_id ?? (refundTx as any).booking_id ?? null
    const resolvedBoatBookingId = payment?.boat_booking_id ?? (refundTx as any).boat_booking_id ?? null

    // Update the correct booking table payment_status to refund_rejected
    if (resolvedBookingId) {
      const { error: bookingUpdateError } = await db
        .from('bookings')
        .update({ payment_status: 'refund_rejected' })
        .eq('id', resolvedBookingId)
      logger.always('admin/rejectRefund', 'Booking payment_status updated to refund_rejected', {
        bookingId: resolvedBookingId,
        error: bookingUpdateError?.message ?? null,
      })
    } else if (resolvedBoatBookingId) {
      const { error: boatUpdateError } = await db
        .from('boat_bookings')
        .update({ payment_status: 'refund_rejected' })
        .eq('id', resolvedBoatBookingId)
      logger.always('admin/rejectRefund', 'Boat booking payment_status updated to refund_rejected', {
        boatBookingId: resolvedBoatBookingId,
        error: boatUpdateError?.message ?? null,
      })
    }

    // Send rejection email using service role client for auth.admin
    if (activeBooking?.user_id) {
      try {
        const { data: userData } = await adminClient.auth.admin.getUserById(activeBooking.user_id)
        logger.always('admin/rejectRefund', 'User fetch for email', {
          userFound: !!userData?.user,
          email: userData?.user?.email ?? null,
        })
        if (userData?.user?.email) {
          const propertyName = isBoatBooking
            ? (boatBooking.boat?.name || 'Boat Trip')
            : (booking.hotel?.name || 'Hotel')
          await emailService.sendRefundRejected({
            to: userData.user.email,
            userName: userData.user.user_metadata?.name || userData.user.email.split('@')[0],
            bookingId: activeBooking.booking_reference,
            hotelName: propertyName,
            checkInDate: isBoatBooking ? boatBooking.trip_date : booking.check_in_date,
            checkOutDate: isBoatBooking ? boatBooking.trip_date : booking.check_out_date,
            reason,
          })
          logger.always('admin/rejectRefund', 'Rejection email sent', { to: userData.user.email })
        }
      } catch (emailError) {
        logger.error('admin/rejectRefund', 'Failed to send refund rejection email', emailError)
      }
    }

    revalidatePath(`${ADMIN_PATH}/refunds`)
    revalidatePath(`${ADMIN_PATH}/bookings`)

    logger.always('admin/rejectRefund', 'Reject complete', { refundTransactionId })
    return { success: true }
  } catch (error: any) {
    logger.error('admin/rejectRefund', 'Unhandled error', error)
    return { success: false, error: error.message || 'Failed to reject refund' }
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  bookingId: string,
  status: 'pending' | 'paid' | 'failed' | 'refunded'
) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: payment, error } = await db
      .from('bookings')
      .update({ payment_status: status })
      .eq('id', bookingId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/payments`)
    revalidatePath(`${ADMIN_PATH}/bookings`)

    return {
      success: true,
      payment,
    }
  } catch (error: any) {
    serverLog.error('Error updating payment status:', error)
    return {
      success: false,
      error: error.message || 'Failed to update payment status',
    }
  }
}
