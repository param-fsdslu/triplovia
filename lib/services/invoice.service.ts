/**
 * Booking invoices on the server: numbering (lib/db/invoice-numbers.ts) and finding a booking the
 * caller may download an invoice for. The PDF itself is drawn by invoice-pdf.ts.
 */
import { INVOICE_PREFIX, INVOICE_SERIAL_DIGITS } from '@/lib/config/invoice'
import { assignInvoiceNumber } from '@/lib/db/invoice-numbers'
import { createAdminClient, createClient } from '@/lib/db/server'
import { getStore } from '@/lib/db/service'
import { isGuestBookingOwner } from '@/lib/services/guest-checkout.service'
import { serverLog } from '@/lib/utils/server-log'

export function issueInvoiceNumber(bookingId: string) {
  return assignInvoiceNumber(getStore(), bookingId, { prefix: INVOICE_PREFIX, digits: INVOICE_SERIAL_DIGITS })
}

/** Payment confirmed: numbers every booking it paid for. Never fails the payment; a miss is numbered on first download. */
export async function issueInvoiceNumbers(bookingIds: string[]) {
  for (const id of bookingIds) {
    try {
      await issueInvoiceNumber(id)
    } catch (error) {
      serverLog.error('Failed to assign invoice number', { bookingId: id, error })
    }
  }
}

const INVOICE_BOOKING_SELECT = `
  *,
  hotel:hotels(id, name, address_line_1, address_line_2, city, state, postal_code),
  room_type:room_types(name),
  booking_meal_plans(name)
`

/**
 * The booking behind an invoice download, if the caller may see it: their own, their hotel's
 * (admins, via row policies), or a guest checkout made in this browser. Null otherwise.
 */
export async function findInvoiceBooking(bookingReference: string): Promise<any | null> {
  const db = await createClient()
  const { data } = await db.from('bookings').select(INVOICE_BOOKING_SELECT).eq('booking_reference', bookingReference).maybeSingle()
  if (data) return data

  const { data: guestBooking } = await createAdminClient()
    .from('bookings')
    .select(INVOICE_BOOKING_SELECT)
    .eq('booking_reference', bookingReference)
    .maybeSingle()
  return guestBooking && (await isGuestBookingOwner([guestBooking])) ? guestBooking : null
}
