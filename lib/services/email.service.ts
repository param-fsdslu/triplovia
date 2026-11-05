/**
 * Email notification service powered by the Resend API.
 * Sends transactional emails for the full hotel booking lifecycle:
 * confirmation, cancellation, payment receipt, refund, and status updates.
 *
 * Each method renders a self-contained HTML email with inline CSS (no React Email
 * dependency) and returns { success, data } or { success: false, error }.
 * Errors are logged but never thrown — callers should treat email as non-fatal.
 *
 * Sender address is set via the EMAIL_FROM environment variable.
 *
 * Brand colors (same palette as app/globals.css):
 *   Primary (Brand Teal): #107F78 · Deep Teal: #073F3D · Accent (Champagne Gold): #D8AA68
 *   Text: #243A38 · Background: #F8F6F0
 */
import { Resend } from 'resend'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { logger } from '@/lib/utils/logger'
import type { BookingSummary } from '@/lib/utils/booking-summary'

const resend = new Resend(process.env.RESEND_API_KEY)

const BRAND = {
  name: 'Triplovia',
  tagline: 'Your Gateway to Comfortable Stays',
  primary: '#107F78',
  primaryDark: '#073F3D',
  accent: '#D8AA68',
  accentDark: '#B08A55',
  text: '#243A38',
  mutedText: '#647874',
  background: '#F8F6F0',
  success: '#059669',
  successLight: '#f0fdf4',
  warning: '#d97706',
  warningLight: '#fffbeb',
  warningDark: '#92400e',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  fromEmail: process.env.EMAIL_FROM || 'Triplovia <noreply@triplovia.com>',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://triplovia.com',
}

function baseStyles() {
  return `
    body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${BRAND.text}; max-width: 600px; margin: 0 auto; padding: 0; background: ${BRAND.background}; }
    h1, h2, h3 { font-family: Manrope, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: ${BRAND.primary}; color: white; padding: 32px 30px; text-align: center; }
    .header h1 { margin: 0 0 4px 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .header .logo-text { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; margin-bottom: 12px; }
    .content { padding: 30px; background: #ffffff; }
    .booking-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND.primary}; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #6b7280; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-value { color: #111827; font-size: 15px; margin-top: 2px; }
    .amount-box { background: ${BRAND.primary}; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; color: white; }
    .amount-box .label { font-size: 13px; opacity: 0.85; margin-bottom: 4px; }
    .amount-box .amount { font-size: 32px; font-weight: bold; }
    .button { display: inline-block; padding: 14px 28px; background: ${BRAND.primary}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .notice-box { padding: 16px; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; padding: 24px 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 4px 0; }
    .footer .brand { color: ${BRAND.primary}; font-weight: 600; font-size: 14px; }
    .footer .tagline { color: #9ca3af; font-size: 12px; }
    .footer .disclaimer { color: #9ca3af; font-size: 11px; margin-top: 12px; }
    .divider { height: 3px; background: linear-gradient(to right, ${BRAND.primary}, ${BRAND.accent}); }
    .booking-email .booking-details { background: #ffffff; padding: 0; border-left: none; margin: 24px 0; }
    .booking-email .detail-row { padding: 8px 0; }
    .booking-email .detail-label { font-size: 11px; letter-spacing: 0.3px; }
    .booking-email .amount-box { background: #E8F3EF; color: ${BRAND.text}; text-align: left; padding: 16px; }
    .booking-email .amount-box .amount { font-size: 24px; }
    .booking-email .footer { background: #ffffff; }
  `
}

function header(title: string, subtitle: string) {
  return `
    <div class="header">
      <div class="logo-text">${BRAND.name}</div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="divider"></div>
  `
}

function footer() {
  return `
    <div class="footer">
      <p class="brand">${BRAND.name}</p>
      <p class="tagline">${BRAND.tagline}</p>
      <p class="disclaimer">This is an automated email. Please do not reply directly to this message.</p>
    </div>
  `
}

function emailShell(title: string, subtitle: string, content: string, bookingEmail = false) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${baseStyles()}</style>
      </head>
      <body${bookingEmail ? ' class="booking-email"' : ''}>
        <div class="wrapper">
          ${bookingEmail ? `
            <div style="padding: 28px 30px 24px; background: #ffffff; border-bottom: 1px solid #E2E9E5;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 10px;">
                    <img src="${escapeHtml(`${BRAND.appUrl.replace(/\/$/, '')}/brand/triplovia-email-logo.png`)}" alt="Triplovia logo" width="36" height="36" style="display: block; width: 36px; height: 36px; border: 0;" />
                  </td>
                  <td style="vertical-align: middle; font-family: Arial, sans-serif; font-size: 21px; font-weight: 700; color: ${BRAND.primaryDark};">${BRAND.name}</td>
                </tr>
              </table>
              <h1 style="margin: 0 0 6px; color: ${BRAND.text}; font-size: 23px; line-height: 1.3; font-weight: 700;">${title}</h1>
              <p style="margin: 0; color: ${BRAND.mutedText}; font-size: 14px;">${subtitle}</p>
            </div>
          ` : header(title, subtitle)}
          <div class="content">${content}</div>
          ${bookingEmail ? `<div class="footer"><p class="brand">${BRAND.name}</p><p class="disclaimer">Booking updates from Triplovia. Please do not reply to this automated email.</p></div>` : footer()}
        </div>
      </body>
    </html>
  `
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

/** For text guests typed (company name, address…) before it goes into email HTML */
function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function detailRow(label: string, value: string) {
  return `
    <div class="detail-row">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${value}</span>
    </div>
  `
}

/** Subject and HTML of the guest's "Booking confirmed" email (exported so it can be previewed without sending) */
export function bookingConfirmedEmail(s: BookingSummary, invoiceCount: number) {
  const manageUrl = s.isGuestCheckout ? `${BRAND.appUrl}/en/auth/login?redirect=/bookings` : `${BRAND.appUrl}/en/bookings`
  return {
    subject: `Booking confirmed: ${s.hotelName} (${s.reference})`,
    html: emailShell('Booking Confirmed', `You're all set for ${escapeHtml(s.hotelName)}`, `
      <p>Hi ${escapeHtml(s.guestFirstName)},</p>
      <p>Your stay is confirmed and your payment has been received. Show your booking ID and a photo ID at check-in.</p>

      <div class="booking-details">
        <h2 style="margin-top: 0; color: ${BRAND.primary}; font-size: 16px;">${escapeHtml(s.hotelName)}</h2>
        ${s.hotelAddress ? `<p style="margin: 0 0 12px; color: ${BRAND.mutedText}; font-size: 13px;">${escapeHtml(s.hotelAddress)}</p>` : ''}
        ${detailRow(s.references.length > 1 ? 'Booking IDs' : 'Booking ID', `<strong>${escapeHtml(s.references.join(', '))}</strong>`)}
        ${detailRow('Check-in', `${s.checkIn}${s.checkInTime ? ` · from ${s.checkInTime}` : ''}`)}
        ${detailRow('Check-out', `${s.checkOut}${s.checkOutTime ? ` · until ${s.checkOutTime}` : ''}`)}
        ${detailRow('Guest name', escapeHtml(s.guestName))}
        ${s.guestPhone ? detailRow('Guest mobile', escapeHtml(s.guestPhone)) : ''}
        ${detailRow('Nights', String(s.nights))}
        ${detailRow(s.roomCount > 1 ? 'Rooms' : 'Room', escapeHtml(s.roomsLabel))}
        ${detailRow('Guests', s.guestsLabel)}
        ${s.gst ? detailRow('GST invoice to', `${escapeHtml(s.gst.companyName)} (GSTIN ${escapeHtml(s.gst.number)})`) : ''}

        <div class="amount-box">
          <div class="label">Total Paid</div>
          <div class="amount">${s.totalPaidLabel}</div>
        </div>
        ${s.paymentId ? `<p style="margin: 10px 0 0; text-align: center; color: ${BRAND.mutedText}; font-size: 12px;">Paid online via Razorpay · ${s.paymentId}</p>` : ''}
      </div>

      ${s.mealPlansLabel ? detailRow('Meal plans', escapeHtml(s.mealPlansLabel)) : ''}
      ${s.specialRequests ? detailRow('Special requests', escapeHtml(s.specialRequests)) : ''}
      ${invoiceCount ? `<p>Your tax invoice${invoiceCount > 1 ? 's are' : ' is'} attached to this email. You can also download invoices from your booking page.</p>` : '<p>You can download available tax invoices from your booking page.</p>'}
      <p style="color: ${BRAND.mutedText}; font-size: 13px;">${escapeHtml(s.cancellationNote).replace(/\n/g, '<br>')}</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${manageUrl}" class="button">${s.isGuestCheckout ? 'Sign in to manage your booking' : 'View your booking'}</a>
      </div>
      ${s.isGuestCheckout && s.guestPhone ? `<p style="text-align: center; color: ${BRAND.mutedText}; font-size: 13px;">Sign in with ${escapeHtml(s.guestPhone)} to see or cancel this booking.</p>` : ''}
    `, true),
  }
}

/** Vendor copy: guest contact and stay details, separate from the customer message. */
export function vendorBookingConfirmedEmail(s: BookingSummary, bookingId: string, guestEmail?: string | null) {
  return {
    subject: 'New confirmed booking: ' + s.hotelName + ' (' + s.reference + ')',
    html: emailShell('New Booking Confirmed', escapeHtml(s.hotelName), `
      <p>A guest has completed payment. Please prepare the room(s) for their arrival.</p>
      <div class="booking-details">
        ${detailRow('Booking reference(s)', escapeHtml(s.references.join(', ')))}
        ${detailRow('Guest name', escapeHtml(s.guestName))}
        ${s.guestPhone ? detailRow('Guest mobile', escapeHtml(s.guestPhone)) : ''}
        ${guestEmail ? detailRow('Guest email', escapeHtml(guestEmail)) : ''}
        ${detailRow('Check-in', escapeHtml(s.checkIn + (s.checkInTime ? ' · from ' + s.checkInTime : '')))}
        ${detailRow('Check-out', escapeHtml(s.checkOut + (s.checkOutTime ? ' · until ' + s.checkOutTime : '')))}
        ${detailRow('Nights', String(s.nights))}
        ${detailRow('Rooms', escapeHtml(s.roomsLabel))}
        ${detailRow('Guests', escapeHtml(s.guestsLabel))}
        ${s.mealPlansLabel ? detailRow('Meal plans', escapeHtml(s.mealPlansLabel)) : ''}
        <div class="amount-box"><div class="label">Payment received online</div><div class="amount">${escapeHtml(s.totalPaidLabel)}</div></div>
      </div>
      ${s.specialRequests ? detailRow('Special requests', escapeHtml(s.specialRequests)) : ''}
      ${s.gst ? detailRow('GST invoice requested', escapeHtml(s.gst.companyName + ' · ' + s.gst.number + ' · ' + s.gst.companyAddress)) : ''}
      <div class="notice-box" style="background: ${BRAND.background}; font-size: 13px; white-space: pre-line;">${escapeHtml(s.cancellationNote)}</div>
      <p style="text-align:center;margin:24px 0"><a class="button" href="${BRAND.appUrl}${ADMIN_PATH}/bookings/${encodeURIComponent(bookingId)}">View booking in vendor panel</a></p>
    `, true),
  }
}

export interface CancellationEmailDetails {
  userName: string
  bookingId: string
  hotelName: string
  checkInDate: string
  checkOutDate: string
  refundAmount?: number
  reason?: string
}

/** Cancellation and refund updates share the confirmation email's logo and clean layout. */
export function bookingCancellationEmail(params: CancellationEmailDetails, status: 'cancelled' | 'review' | 'declined' = 'cancelled') {
  const reviewing = status === 'review'
  const declined = status === 'declined'
  const title = declined ? 'Refund Request Update' : 'Booking Cancelled'
  const subtitle = reviewing ? 'Your refund request is under review' : declined ? 'An update on your refund request' : 'Your cancellation is confirmed'
  const hasRefund = params.refundAmount !== undefined
  const manageUrl = BRAND.appUrl + '/en/bookings/' + encodeURIComponent(params.bookingId)
  return {
    subject: title + ': ' + params.hotelName + ' (' + params.bookingId + ')',
    html: emailShell(title, subtitle, `
      <p>Hi ${escapeHtml(params.userName)},</p>
      <p>${declined ? 'We have reviewed your refund request and are unable to approve it at this time.' : reviewing ? 'Your booking has been cancelled. We have received your refund request and will email you when the review is complete.' : 'Your booking has been cancelled. The details are below for your records.'}</p>
      <div class="booking-details">
        <h2 style="margin: 0 0 12px; color: ${BRAND.primary}; font-size: 16px;">${escapeHtml(params.hotelName)}</h2>
        ${detailRow('Booking ID', '<strong>' + escapeHtml(params.bookingId) + '</strong>')}
        ${detailRow('Guest name', escapeHtml(params.userName))}
        ${detailRow('Original check-in', formatDate(params.checkInDate))}
        ${detailRow('Original check-out', formatDate(params.checkOutDate))}
        ${detailRow('Status', declined ? 'Refund request declined' : 'Cancelled')}
        ${!declined && hasRefund ? `
          <div class="amount-box">
            <div class="label">${reviewing ? 'Refund requested' : 'Refund amount'}</div>
            <div class="amount">${formatCurrency(params.refundAmount!)}</div>
          </div>
        ` : ''}
      </div>
      ${reviewing ? '<p style="font-size: 13px; color: ' + BRAND.mutedText + ';">This amount is under review and has not yet been approved or sent. If approved, the refund will be returned to your original payment method.</p>' : !declined && hasRefund ? params.refundAmount! > 0 ? '<p style="font-size: 13px; color: ' + BRAND.mutedText + ';">Your refund will be returned to the original payment method. Allow 5–7 business days for it to appear in your account.</p>' : '<p style="font-size: 13px; color: ' + BRAND.mutedText + ';">No refund is due for this cancellation.</p>' : ''}
      ${params.reason ? detailRow(declined ? 'Reason for this decision' : 'Cancellation reason', escapeHtml(params.reason)) : ''}
      <div style="text-align: center; margin: 28px 0;">
        <a href="${escapeHtml(manageUrl)}" class="button">View booking</a>
      </div>
      <p style="font-size: 13px; color: ${BRAND.mutedText};">For help with this booking, contact our support team and quote your booking ID.</p>
    `, true),
  }
}

export const emailService = {
  /** Used only by the durable booking-email outbox; payload is frozen before the first attempt. */
  async sendPreparedBookingEmail(payload: import('@/lib/db/booking-email-delivery').BookingEmailPayload, idempotencyKey: string) {
    try {
      const { data, error } = await resend.emails.send({ from: BRAND.fromEmail, ...payload }, { idempotencyKey })
      if (error) logger.error('email', 'Booking email delivery failed', error)
      return { success: !error, data }
    } catch (error) {
      logger.error('email', 'Booking email delivery threw', error)
      return { success: false }
    }
  },
  /**
   * Sends a booking confirmation email after successful payment.
   * Triggered by /api/payment/verify once HMAC signature and amount are verified.
   */
  async sendBookingConfirmation(params: {
    to: string
    userName: string
    bookingId: string
    hotelName: string
    checkInDate: string
    checkOutDate: string
    totalAmount: number
    numGuests: number
    roomTypeName: string
  }) {
    try {
      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: `Booking Confirmation - ${params.hotelName}` })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject: `Booking Confirmation - ${params.hotelName}`,
        html: emailShell('Booking Confirmed!', `Thank you for choosing ${BRAND.name}`, `
          <p>Dear ${params.userName},</p>
          <p>Your booking has been successfully confirmed! We're excited to host you at <strong>${params.hotelName}</strong>.</p>

          <div class="booking-details">
            <h2 style="margin-top: 0; color: ${BRAND.primary}; font-size: 16px;">Booking Details</h2>
            ${detailRow('Booking ID', params.bookingId)}
            ${detailRow('Hotel', params.hotelName)}
            ${detailRow('Room Type', params.roomTypeName)}
            ${detailRow('Check-in', formatDate(params.checkInDate))}
            ${detailRow('Check-out', formatDate(params.checkOutDate))}
            ${detailRow('Guests', `${params.numGuests} ${params.numGuests === 1 ? 'Guest' : 'Guests'}`)}

            <div class="amount-box">
              <div class="label">Total Amount</div>
              <div class="amount">${formatCurrency(params.totalAmount)}</div>
            </div>
          </div>

          <p><strong>What's Next?</strong></p>
          <ul>
            <li>You'll receive a reminder email 24 hours before check-in</li>
            <li>Please carry a valid ID proof for check-in</li>
            <li>Early check-in subject to availability</li>
          </ul>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${BRAND.appUrl}/bookings" class="button">View Booking Details</a>
          </div>

          <p>If you have any questions, feel free to contact us.</p>
        `),
      })

      if (error) {
        logger.error('email', 'sendBookingConfirmation failed', error, { to: params.to })
        return { success: false, error }
      }

      logger.info('email', 'sendBookingConfirmation sent', { id: data?.id, to: params.to })
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendBookingConfirmation threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Sends a cancellation confirmation email.
   * refundAmount is optional — omit when the booking was cancelled before payment.
   */
  async sendBookingCancellation(params: {
    to: string
    userName: string
    bookingId: string
    hotelName: string
    checkInDate: string
    checkOutDate: string
    refundAmount?: number
  }) {
    const { subject, html } = bookingCancellationEmail(params, 'cancelled')
    try {
      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: `Booking Cancelled - ${params.hotelName}` })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject,
        html,
      })

      if (error) {
        logger.error('email', 'sendBookingCancellation failed', error, { to: params.to })
        return { success: false, error }
      }

      logger.info('email', 'sendBookingCancellation sent', { id: data?.id, to: params.to })
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendBookingCancellation threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * The guest's booking confirmation once payment is verified (hotel stays): stay details, what was
   * paid, the cancellation deadline, and the tax invoice PDF(s) attached. Sent once per payment by
   * notifyBookingConfirmed (lib/services/booking-notifications.service.ts).
   */
  async sendBookingConfirmed(params: {
    to: string
    summary: BookingSummary
    /** Tax invoice PDFs, one per booking in the payment */
    invoices: Array<{ filename: string; content: Buffer }>
  }) {
    const { subject, html } = bookingConfirmedEmail(params.summary, params.invoices.length)
    try {
      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject,
        attachments: params.invoices,
        html,
      })

      if (error) {
        logger.error('email', 'sendBookingConfirmed failed', error, { to: params.to })
        return { success: false, error }
      }
      logger.info('email', 'sendBookingConfirmed sent', { id: data?.id, to: params.to })
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendBookingConfirmed threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Sends a payment receipt after a Razorpay payment is verified.
   * paymentId is the Razorpay payment_id (e.g. pay_xxxx) stored for audit.
   */
  async sendPaymentReceipt(params: {
    to: string
    userName: string
    bookingId: string
    paymentId: string
    amount: number
    paymentMethod: string
    hotelName: string
    checkInDate: string
    checkOutDate: string
  }) {
    try {
      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: `Payment Receipt - Booking ${params.bookingId}` })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject: `Payment Receipt - Booking ${params.bookingId}`,
        html: emailShell('Payment Successful', 'Payment Receipt', `
          <p>Dear ${params.userName},</p>
          <p>Thank you for your payment. Your transaction has been successfully processed.</p>

          <div class="booking-details" style="border-left-color: ${BRAND.success};">
            <h2 style="margin-top: 0; color: ${BRAND.success}; font-size: 16px;">Payment Details</h2>
            ${detailRow('Payment ID', params.paymentId)}
            ${detailRow('Booking ID', params.bookingId)}
            ${detailRow('Payment Method', params.paymentMethod)}
            ${detailRow('Date', new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}

            <div class="amount-box" style="background: ${BRAND.success};">
              <div class="label">Amount Paid</div>
              <div class="amount">${formatCurrency(params.amount)}</div>
            </div>
          </div>

          <div class="notice-box" style="background: ${BRAND.successLight}; border-left: 4px solid ${BRAND.success};">
            <h3 style="margin-top: 0; color: ${BRAND.success};">Booking Information</h3>
            <p style="margin: 5px 0;"><strong>Hotel:</strong> ${params.hotelName}</p>
            <p style="margin: 5px 0;"><strong>Check-in:</strong> ${formatDateShort(params.checkInDate)}</p>
            <p style="margin: 5px 0;"><strong>Check-out:</strong> ${formatDateShort(params.checkOutDate)}</p>
          </div>

          <p style="margin-top: 20px;">This receipt serves as proof of payment. Please save it for your records.</p>
        `),
      })

      if (error) {
        logger.error('email', 'sendPaymentReceipt failed', error, { to: params.to })
        return { success: false, error }
      }

      logger.info('email', 'sendPaymentReceipt sent', { id: data?.id, to: params.to })
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendPaymentReceipt threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Notifies the guest that their refund request was received and is under review.
   * Sent immediately after a successful cancellation via /api/payment/refund.
   * Refund eligibility follows the cancellation policy saved with the booking.
   */
  async sendRefundRequested(params: {
    to: string
    userName: string
    bookingId: string
    hotelName: string
    checkInDate: string
    checkOutDate: string
    refundAmount: number
  }) {
    const { subject, html } = bookingCancellationEmail(params, 'review')
    try {
      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: `Cancellation Confirmed - Refund Under Review` })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject,
        html,
      })

      if (error) {
        logger.error('email', 'sendRefundRequested failed', error, { to: params.to })
        return { success: false, error }
      }

      logger.info('email', 'sendRefundRequested sent', { id: data?.id, to: params.to })
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendRefundRequested threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Notifies the guest that their refund request was declined.
   * reason is the admin-supplied explanation; omit when no reason is provided.
   */
  async sendRefundRejected(params: {
    to: string
    userName: string
    bookingId: string
    hotelName: string
    checkInDate: string
    checkOutDate: string
    reason?: string
  }) {
    const { subject, html } = bookingCancellationEmail(params, 'declined')
    try {
      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: `Refund Request Update - ${params.bookingId}` })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject,
        html,
      })

      if (error) {
        logger.error('email', 'sendRefundRejected failed', error, { to: params.to })
        return { success: false, error }
      }

      logger.info('email', 'sendRefundRejected sent', { id: data?.id, to: params.to })
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendRefundRejected threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Sends a generic status-change notification triggered by admin actions.
   * Supports statuses: confirmed, pending, cancelled, completed.
   * adminNote is an optional message the admin can attach (e.g. reason for cancellation).
   */
  async sendBookingStatusUpdate(params: {
    to: string
    userName: string
    bookingId: string
    hotelName: string
    newStatus: string
    adminNote?: string
  }) {
    try {
      const statusColors: Record<string, string> = {
        confirmed: BRAND.success,
        pending: BRAND.warning,
        cancelled: BRAND.danger,
        completed: BRAND.primary,
      }

      const statusMessages: Record<string, string> = {
        confirmed: 'Your booking has been confirmed by our team.',
        pending: 'Your booking is currently being reviewed.',
        cancelled: 'Your booking has been cancelled.',
        completed: 'Thank you for staying with us! We hope you enjoyed your experience.',
      }

      const color = statusColors[params.newStatus] || BRAND.primary

      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: `Booking Status Update - ${params.bookingId}` })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject: `Booking Status Update - ${params.bookingId}`,
        html: emailShell('Booking Status Update', `Your booking status has changed`, `
          <p>Dear ${params.userName},</p>

          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; padding: 8px 20px; background: ${color}; color: white; border-radius: 20px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
              ${params.newStatus}
            </span>
          </div>

          <p>${statusMessages[params.newStatus] || 'Your booking status has been updated.'}</p>

          <div class="booking-details" style="border-left-color: ${color};">
            <h2 style="margin-top: 0; color: ${color}; font-size: 16px;">Booking Details</h2>
            ${detailRow('Booking ID', params.bookingId)}
            ${detailRow('Hotel', params.hotelName)}
            ${detailRow('Status', `<strong style="color: ${color};">${params.newStatus.charAt(0).toUpperCase() + params.newStatus.slice(1)}</strong>`)}
          </div>

          ${params.adminNote ? `
          <div class="notice-box" style="background: #f3f4f6; border-left: 4px solid ${color};">
            <h3 style="margin-top: 0; color: ${color};">Note from our team</h3>
            <p style="margin: 0;">${params.adminNote}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 24px 0;">
            <a href="${BRAND.appUrl}/bookings" class="button">View Your Bookings</a>
          </div>

          <p>If you have any questions, feel free to contact us.</p>
        `, params.newStatus === 'cancelled'),
      })

      if (error) {
        logger.error('email', 'sendBookingStatusUpdate failed', error, { to: params.to })
        return { success: false, error }
      }

      logger.info('email', 'sendBookingStatusUpdate sent', { id: data?.id, to: params.to })
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendBookingStatusUpdate threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Notifies the hotel owner/admin when a guest completes payment for their property.
   * Sent from /api/payment/verify after signature + amount verification pass.
   * Falls back to hotel.email if no owner profile is found.
   */
  async sendHotelOwnerBookingAlert(params: {
    to: string
    hotelName: string
    bookingId: string
    guestName: string
    /** Guests who book with just a mobile number may have no email */
    guestEmail?: string
    guestPhone?: string
    checkInDate: string
    checkOutDate: string
    numAdults: number
    numChildren: number
    numRooms: number
    roomTypeName: string
    totalAmount: number
    specialRequests?: string
    /** The guest asked for a GST invoice in their company's name */
    gst?: { number: string; companyName: string; companyAddress: string } | null
  }) {
    try {
      const totalGuests = params.numAdults + params.numChildren
      const guestsLabel = `${params.numAdults} adult${params.numAdults !== 1 ? 's' : ''}${params.numChildren > 0 ? ` · ${params.numChildren} child${params.numChildren !== 1 ? 'ren' : ''}` : ''}`

      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: `New Booking Received - ${params.bookingId}` })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject: `New Booking Received - ${params.bookingId}`,
        html: emailShell('New Booking Received', `A guest has confirmed a booking at ${params.hotelName}`, `
          <p>A new booking has been confirmed and payment received for <strong>${params.hotelName}</strong>.</p>

          <div class="booking-details">
            <h2 style="margin-top: 0; color: ${BRAND.primary}; font-size: 16px;">Booking Details</h2>
            ${detailRow('Booking Reference', `<strong>${params.bookingId}</strong>`)}
            ${detailRow('Room Type', params.roomTypeName)}
            ${detailRow('Check-in', formatDate(params.checkInDate))}
            ${detailRow('Check-out', formatDate(params.checkOutDate))}
            ${detailRow('Guests', guestsLabel)}
            ${detailRow('Rooms', `${params.numRooms} room${params.numRooms !== 1 ? 's' : ''}`)}

            <div class="amount-box">
              <div class="label">Total Paid</div>
              <div class="amount">${formatCurrency(params.totalAmount)}</div>
            </div>
          </div>

          <div class="booking-details" style="border-left-color: ${BRAND.accent};">
            <h2 style="margin-top: 0; color: ${BRAND.accentDark}; font-size: 16px;">Guest Information</h2>
            ${detailRow('Name', escapeHtml(params.guestName))}
            ${params.guestPhone ? detailRow('Mobile', `<a href="tel:${params.guestPhone.replace(/[^\d+]/g, '')}" style="color: ${BRAND.primary};">${params.guestPhone}</a>`) : ''}
            ${params.guestEmail ? detailRow('Email', `<a href="mailto:${params.guestEmail}" style="color: ${BRAND.primary};">${params.guestEmail}</a>`) : ''}
          </div>

          ${params.gst ? `
          <div class="booking-details" style="border-left-color: ${BRAND.primary};">
            <h2 style="margin-top: 0; color: ${BRAND.primary}; font-size: 16px;">GST Invoice Requested</h2>
            ${detailRow('GSTIN', `<strong>${escapeHtml(params.gst.number)}</strong>`)}
            ${detailRow('Company', escapeHtml(params.gst.companyName))}
            ${detailRow('Address', escapeHtml(params.gst.companyAddress))}
          </div>
          ` : ''}

          ${params.specialRequests ? `
          <div class="notice-box" style="background: #fffbeb; border-left: 4px solid ${BRAND.accent};">
            <h3 style="margin-top: 0; color: ${BRAND.accentDark};">Guest Note / Special Request</h3>
            <p style="margin: 5px 0;">${escapeHtml(params.specialRequests)}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 24px 0;">
            <a href="${BRAND.appUrl}${ADMIN_PATH}/bookings/${params.bookingId}" class="button">View in Admin Panel</a>
          </div>

          <p style="color: #6b7280; font-size: 13px;">Please ensure the room is prepared for the guest's arrival. If you have any questions, contact the ${BRAND.name} team.</p>
        `),
      })

      if (error) {
        logger.error('email', 'sendHotelOwnerBookingAlert failed', error, { to: params.to })
        return { success: false, error }
      }

      logger.always('email', 'sendHotelOwnerBookingAlert sent', { id: data?.id, to: params.to })
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendHotelOwnerBookingAlert threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Confirms to the reviewer that their review was received and is pending moderation.
   * Sent immediately after a successful review insertion.
   */
  async sendReviewSubmitted(params: {
    to: string
    userName: string
    hotelName: string
    overallRating: number // 1-5 display scale
  }) {
    try {
      const stars = '★'.repeat(params.overallRating) + '☆'.repeat(5 - params.overallRating)
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject: `Thank you for your review of ${params.hotelName}`,
        html: emailShell('Review Received', `Your review is pending approval`, `
          <p>Dear ${params.userName},</p>
          <p>Thank you for taking the time to review your stay at <strong>${params.hotelName}</strong>. We've received your feedback!</p>

          <div class="booking-details">
            <div class="detail-row">
              <strong>Property</strong>
              <span>${params.hotelName}</span>
            </div>
            <div class="detail-row">
              <strong>Your Rating</strong>
              <span style="color: ${BRAND.accent}; font-size: 18px;">${stars}</span>
            </div>
          </div>

          <div class="notice-box" style="background: #fffbeb; border-left: 4px solid ${BRAND.accent};">
            <h3 style="margin-top: 0; color: #92400e;">What happens next?</h3>
            <p style="margin: 0;">Our team will review your submission and approve it shortly. Once approved, your review will be visible to other guests on the hotel page.</p>
          </div>

          <p>We appreciate your feedback — it helps us maintain the quality of our listings.</p>
        `),
      })

      if (error) {
        logger.error('email', 'sendReviewSubmitted failed', error, { to: params.to })
        return { success: false, error }
      }
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendReviewSubmitted threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Sends the sign-up confirmation link. actionUrl points at /auth/callback with a
   * Firebase verifyEmail oobCode (see lib/firebase/auth/emails.ts).
   */
  async sendEmailVerification(params: { to: string; name?: string | null; actionUrl: string }) {
    try {
      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: 'Confirm your email' })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject: `Confirm your email - ${BRAND.name}`,
        html: emailShell('Confirm your email', 'One more step to activate your account', `
          <p>Hi${params.name ? ` ${params.name}` : ''},</p>
          <p>Thanks for signing up with ${BRAND.name}. Please confirm your email address to activate your account.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${params.actionUrl}" class="button">Confirm email</a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">If you didn't create an account, you can ignore this email.</p>
        `),
      })

      if (error) {
        logger.error('email', 'sendEmailVerification failed', error, { to: params.to })
        return { success: false, error }
      }
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendEmailVerification threw', error, { to: params.to })
      return { success: false, error }
    }
  },

  /**
   * Sends the password reset link. actionUrl points at /auth/callback with a
   * Firebase resetPassword oobCode (valid for one hour).
   */
  async sendPasswordReset(params: { to: string; actionUrl: string }) {
    try {
      logger.network('email', 'POST', 'resend/emails', { to: params.to, subject: 'Reset your password' })
      const { data, error } = await resend.emails.send({
        from: BRAND.fromEmail,
        to: params.to,
        subject: `Reset your password - ${BRAND.name}`,
        html: emailShell('Reset your password', 'We received a request to reset your password', `
          <p>Hello,</p>
          <p>Click the button below to choose a new password for your ${BRAND.name} account. The link expires in one hour.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${params.actionUrl}" class="button">Reset password</a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">If you didn't request a password reset, you can ignore this email — your password won't change.</p>
        `),
      })

      if (error) {
        logger.error('email', 'sendPasswordReset failed', error, { to: params.to })
        return { success: false, error }
      }
      return { success: true, data }
    } catch (error) {
      logger.error('email', 'sendPasswordReset threw', error, { to: params.to })
      return { success: false, error }
    }
  },
}
