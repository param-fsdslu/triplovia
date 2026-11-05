import { isHotelCancellationPolicy, hotelPolicyText } from '@/lib/config/hotel-cancellation-policy'
/**
 * The facts of a paid booking (or a multi-room payment, `group`), formatted once for every
 * confirmation channel: the guest email, the guest WhatsApp message and the hotel WhatsApp alert
 * (lib/services/booking-notifications.service.ts). Rows are bookings with `hotel` and `room_type`.
 */
import { EFFECTIVE_GATEWAY_FEE_PERCENT, FREE_CANCELLATION_HOURS, freeCancellationDeadline } from '@/lib/config/cancellation-policy'
import { formatRupees } from '@/lib/utils'
import { formatPhone } from '@/lib/utils/phone'

export interface BookingSummary {
  /** The booking the guest sees first (multi-room payments have one per room type) */
  reference: string
  references: string[]
  guestName: string
  guestFirstName: string
  guestPhone: string | null
  hotelName: string
  hotelAddress: string
  /** "Sat, 14 Nov 2026" */
  checkIn: string
  checkOut: string
  /** "2:00 pm" */
  checkInTime: string | null
  checkOutTime: string | null
  nights: number
  /** "Deluxe Double Room × 1, Family Suite × 1" */
  roomsLabel: string
  mealPlansLabel?: string
  roomCount: number
  /** "2 adults, 1 child" (plus ", with pets" when travelling with pets) */
  guestsLabel: string
  totalPaid: number
  /** "₹1.07" */
  totalPaidLabel: string
  paymentId: string | null
  specialRequests: string | null
  gst: { number: string; companyName: string; companyAddress: string } | null
  /** Booked without an account: managed by signing in with the mobile number */
  isGuestCheckout: boolean
  /** "Cancel by Thu, 12 Nov, 12:00 pm for a refund, minus the 2.36% payment gateway fee." */
  cancellationNote: string
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** 'YYYY-MM-DD' → "Sat, 14 Nov 2026" (as a calendar date, whatever the server's time zone) */
export function stayDate(value: string) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** 'HH:MM[:SS]' → "2:00 pm" (null when missing or not a time) */
export function stayTime(value: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ''))
  if (!match) return null
  const h = Number(match[1])
  return `${h % 12 || 12}:${match[2]} ${h < 12 ? 'am' : 'pm'}`
}

export function buildBookingSummary(group: any[], now: Date = new Date()): BookingSummary {
  const first = group[0]
  const hotel = first.hotel ?? {}
  // Each room type's booking holds its own guests (multi-room checkout), so the party is their sum
  const adults = group.reduce((sum, b) => sum + (Number(b.num_adults) || 0), 0)
  const children = group.reduce((sum, b) => sum + (Number(b.num_children) || 0), 0)
  // Rounded to the paisa: adding floats leaves tails like 3.0700000000000003
  const totalPaid = Math.round(group.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) * 100) / 100
  const deadline = freeCancellationDeadline(first.check_in_date, hotel.check_in_from_time, now)
  const guestName = [first.guest_first_name, first.guest_last_name].filter(Boolean).join(' ') || 'Guest'

  return {
    reference: first.booking_reference,
    references: group.map((b) => b.booking_reference),
    guestName,
    guestFirstName: first.guest_first_name || 'there',
    guestPhone: first.guest_phone || null,
    hotelName: hotel.name || 'your hotel',
    hotelAddress: [hotel.address_line_1, hotel.address_line_2, hotel.city, hotel.state, hotel.postal_code].filter(Boolean).join(', '),
    checkIn: stayDate(first.check_in_date),
    checkOut: stayDate(first.check_out_date),
    checkInTime: stayTime(first.cancellation_check_in_time || hotel.check_in_from_time),
    checkOutTime: stayTime(hotel.check_out_time),
    nights: Number(first.num_nights) || 0,
    roomsLabel: group.map((b) => `${b.room_type?.name ?? 'Room'} × ${b.num_rooms || 1}`).join(', '),
    mealPlansLabel: [...new Set(group.flatMap(b => (b.booking_meal_plans ?? []).map((meal: any) => meal.name)).filter(Boolean))].join(', '),
    roomCount: group.reduce((sum, b) => sum + (Number(b.num_rooms) || 1), 0),
    guestsLabel: [
      plural(adults, 'adult', 'adults'),
      children ? plural(children, 'child', 'children') : '',
      group.some((b) => b.with_pets) ? 'with pets' : '',
    ]
      .filter(Boolean)
      .join(', '),
    totalPaid,
    totalPaidLabel: formatRupees(totalPaid),
    paymentId: first.razorpay_payment_id || null,
    specialRequests: group.map((b) => b.special_requests).find(Boolean) || null,
    gst: first.gst_number
      ? { number: first.gst_number, companyName: first.gst_company_name, companyAddress: first.gst_company_address }
      : null,
    isGuestCheckout: !first.user_id,
    cancellationNote: isHotelCancellationPolicy(first.cancellation_policy) ? hotelPolicyText(first.cancellation_policy) : deadline.passed
      ? `Check-in is within ${FREE_CANCELLATION_HOURS} hours, so cancelling now isn't refunded.`
      : `Cancel by ${deadline.label} for a refund, minus the ${EFFECTIVE_GATEWAY_FEE_PERCENT.toFixed(2)}% payment gateway fee.`,
  }
}

/**
 * A WhatsApp template value: Meta rejects empty values and ones with line breaks, tabs or more than
 * three spaces in a row, and caps them at 1,024 characters
 */
export function whatsAppValue(value: unknown): string {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {4,}/g, '   ')
    .trim()
  return (text || '-').slice(0, 1024)
}

const withTime = (date: string, prefix: string, time: string | null) => (time ? `${date} (${prefix} ${time})` : date)

/** Variables {{1}}–{{8}} of the guest "booking confirmed" template (docs/WHATSAPP_TEMPLATES.md) */
export function guestWhatsAppVariables(s: BookingSummary): Record<string, string> {
  const values = [
    s.guestFirstName,
    s.hotelName,
    s.references.join(', '),
    withTime(s.checkIn, 'from', s.checkInTime),
    withTime(s.checkOut, 'until', s.checkOutTime),
    s.roomsLabel,
    s.guestsLabel,
    s.totalPaidLabel,
  ]
  return Object.fromEntries(values.map((v, i) => [String(i + 1), whatsAppValue(v)]))
}

/** Variables {{1}}–{{10}} of the hotel "new booking" template (docs/WHATSAPP_TEMPLATES.md) */
export function hotelWhatsAppVariables(s: BookingSummary): Record<string, string> {
  const values = [
    s.hotelName,
    s.references.join(', '),
    s.guestName,
    s.guestPhone ? formatPhone(s.guestPhone) : 'Not given',
    withTime(s.checkIn, 'from', s.checkInTime),
    withTime(s.checkOut, 'until', s.checkOutTime),
    s.roomsLabel,
    s.guestsLabel,
    s.totalPaidLabel,
    s.specialRequests || 'None',
  ]
  return Object.fromEntries(values.map((v, i) => [String(i + 1), whatsAppValue(v)]))
}
