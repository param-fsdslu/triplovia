/**
 * Paid and confirmed hotel bookings: customer/vendor email with independent retryable deliveries.
 *   - guest email: "Booking confirmed" with the tax invoice PDF(s) attached
 *   - guest WhatsApp: the same confirmation, only if they ticked the WhatsApp opt-in when booking
 *   - hotel WhatsApp: new-booking alert to the hotel's phone number
 *   - hotel email: the existing owner alert (hotel email, else the owner's account email)
 *
 * Called by /api/payment/verify (after the response) and the Razorpay webhook (its safety net). Both
 * can run for one payment, so only the first to claim `booking-confirmed_<first booking id>`
 * sends WhatsApp; email channels use _booking_emails with frozen payloads and delivery leases. Multi-room payments share one
 * Razorpay order and are sent as one confirmation. Every channel is best effort: a failure is logged
 * and never undoes the booking or blocks the other channels.
 */
import { beginBookingConfirmation, deliverBookingEmail } from '@/lib/db/booking-email-delivery'
import { createAdminClient } from '@/lib/db/server'
import { getStore } from '@/lib/db/service'
import { bookingConfirmedEmail, vendorBookingConfirmedEmail, emailService } from '@/lib/services/email.service'
import { renderInvoicePdf } from '@/lib/services/invoice-pdf'
import { sendWhatsAppTemplate } from '@/lib/services/whatsapp.service'
import { buildBookingSummary, guestWhatsAppVariables, hotelWhatsAppVariables } from '@/lib/utils/booking-summary'
import { invoiceFileName } from '@/lib/utils/invoice'
import { logger } from '@/lib/utils/logger'
import { normalizeIndianMobile, normalizePhone } from '@/lib/utils/phone'

const BOOKING_SELECT = `
  *,
  hotel:hotels(id, name, address_line_1, address_line_2, city, state, postal_code, phone, email, owner_id, check_in_from_time, check_out_time),
  room_type:room_types(name),
  booking_meal_plans(name)
`

const toE164 = (phone: string | null | undefined) => normalizeIndianMobile(phone) ?? normalizePhone(phone)

export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  const admin = createAdminClient({ fresh: true })

  const { data: booking } = await admin.from('bookings').select(BOOKING_SELECT).eq('id', bookingId).maybeSingle()
  if (!booking) return

  // Every room paid in the same payment, first-created first (that's the reference the guest sees)
  let group: any[] = [booking]
  if (booking.razorpay_order_id) {
    const { data } = await admin.from('bookings').select(BOOKING_SELECT).eq('razorpay_order_id', booking.razorpay_order_id)
    if (data?.length) group = data
  }
  // Wait for the whole payment group; never freeze a partial multi-room email.
  if (group.some(b => b.payment_status !== 'paid' || b.booking_status !== 'confirmed')) return
  group = group
    .filter((b) => b.payment_status === 'paid' && b.booking_status === 'confirmed')
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)))
  if (group.length === 0) return
  const first = group[0]

  const store = getStore({ fresh: true })
  const run = await beginBookingConfirmation(store, first.id)
  if (run === 'legacy') {
    await admin.from('bookings').update({ confirmation_sent_at: new Date().toISOString() }).in('id', group.map(b => b.id))
    return
  }

  const summary = buildBookingSummary(group)
  const hotel = first.hotel ?? {}

  // Account email as a fallback for guests who didn't type one on the review page
  let guestEmail: string | null = first.guest_email || null
  let ownerEmail: string | null = hotel.email || null
  try {
    if (!guestEmail && first.user_id) {
      const { data } = await admin.auth.admin.getUserById(first.user_id)
      guestEmail = data?.user?.email ?? null
    }
    if (!ownerEmail && hotel.owner_id) {
      const { data } = await admin.auth.admin.getUserById(hotel.owner_id)
      ownerEmail = data?.user?.email ?? null
    }
  } catch (error) {
    logger.error('notify', 'Could not look up an email address', error, { bookingId: first.id })
  }

  const guestPhone = toE164(first.guest_phone)
  const hotelPhone = toE164(hotel.phone)

  const results = await Promise.allSettled([
    // Guest email with the invoices
    (async () => {
      if (!guestEmail) return 'guest email: none on the booking or account'
      const status = await deliverBookingEmail(store, first.id + '_customer', async () => {
        const invoices = await Promise.all(
          group
            .filter((b) => b.invoice_number)
            .map(async (b) => ({
              filename: invoiceFileName(b.invoice_number),
              content: Buffer.from(await renderInvoicePdf({ booking: b, invoiceNumber: b.invoice_number, invoiceDate: b.invoice_date ?? '' })),
            }))
        ).catch(error => { logger.error('notify', 'Invoice attachment unavailable; booking email still sent', error); return [] })
        return {
          to: guestEmail!, ...bookingConfirmedEmail(summary, 0),
          attachments: invoices.map(invoice => ({ filename: invoice.filename, content: invoice.content.toString('base64') })),
        }
      }, emailService.sendPreparedBookingEmail)
      return 'guest email: ' + status
    })(),

    // Guest WhatsApp, only with their opt-in
    (async () => {
      if (run !== 'new') return 'guest WhatsApp: already attempted'
      if (!first.whatsapp_opt_in) return 'guest WhatsApp: no opt-in'
      if (!guestPhone) return 'guest WhatsApp: no valid mobile number'
      const sent = await sendWhatsAppTemplate('guestBooking', guestPhone, guestWhatsAppVariables(summary))
      return `guest WhatsApp: ${sent.status}${'reason' in sent ? ` (${sent.reason})` : 'error' in sent ? ` (${sent.error})` : ''}`
    })(),

    // Hotel WhatsApp to the property's phone number
    (async () => {
      if (run !== 'new') return 'hotel WhatsApp: already attempted'
      if (!hotelPhone) return 'hotel WhatsApp: hotel phone is not a mobile number'
      const sent = await sendWhatsAppTemplate('hotelBooking', hotelPhone, hotelWhatsAppVariables(summary))
      return `hotel WhatsApp: ${sent.status}${'reason' in sent ? ` (${sent.reason})` : 'error' in sent ? ` (${sent.error})` : ''}`
    })(),

    // Hotel email alert
    (async () => {
      if (!ownerEmail) return 'hotel email: no hotel or owner email'
      const status = await deliverBookingEmail(store, first.id + '_vendor', async () => ({
        to: ownerEmail!, ...vendorBookingConfirmedEmail(summary, first.booking_reference, guestEmail),
      }), emailService.sendPreparedBookingEmail)
      return 'hotel email: ' + status
    })(),
  ])

  const emailsComplete = results.filter((_, index) => index === 0 || index === 3).every(result =>
    result.status === 'fulfilled' && (result.value.endsWith(': sent') || result.value.includes(': none') || result.value.includes(': no hotel'))
  )
  if (emailsComplete) await admin.from('bookings').update({ confirmation_sent_at: new Date().toISOString() }).in('id', group.map(b => b.id))

  logger.always('notify', 'Booking confirmation delivery attempted', {
    bookingId: first.id,
    reference: summary.reference,
    results: results.map((r) => (r.status === 'fulfilled' ? r.value : `error: ${r.reason?.message ?? r.reason}`)),
  })
}
