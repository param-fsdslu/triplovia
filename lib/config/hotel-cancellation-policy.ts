import { calculateGatewayFee } from './cancellation-policy'

export type HotelCancellationPolicy = 'flexible' | 'moderate' | 'strict'
export type BookingCancellationPolicy = HotelCancellationPolicy | 'legacy'
export const HOTEL_CANCELLATION_POLICIES: Record<HotelCancellationPolicy, { title: string; rows: [string, string][]; commission: string }> = {
  flexible: { title: 'Policy 1: Flexible', rows: [
    ['Cancellation made 24 hours or more before scheduled check-in time', '100% refund'],
    ['Cancellation within 24 hours of check-in, or no-show', 'No refund (100% retained by Vendor)'],
  ], commission: 'Triplovia’s commission shall apply only to the amount retained by the Vendor.' },
  moderate: { title: 'Policy 2: Moderate', rows: [
    ['Cancellation made 72 hours or more before scheduled check-in time', '100% refund'],
    ['Cancellation made less than 72 hours and at least 24 hours before check-in', '50% refund'],
    ['Cancellation within 24 hours of check-in, or no-show', 'No refund'],
  ], commission: 'Triplovia’s commission shall apply only to the amount retained by the Vendor.' },
  strict: { title: 'Policy 3: Strict', rows: [['Any cancellation, irrespective of timing, or no-show', 'Non-refundable']], commission: 'Triplovia’s commission shall be payable in full immediately upon confirmation of the booking.' },
}
export const VENDOR_CANCELLATION_TERMS = 'If the Vendor cancels a confirmed booking, the Vendor must refund 100% of any advance booking amount to the Guest within 48 hours and pay Triplovia the full commission that would have been payable for the booking.'
export function isHotelCancellationPolicy(value: unknown): value is HotelCancellationPolicy {
  return typeof value === 'string' && Object.hasOwn(HOTEL_CANCELLATION_POLICIES, value)
}
export function hotelPolicyText(policy: HotelCancellationPolicy): string {
  const p = HOTEL_CANCELLATION_POLICIES[policy]
  return [p.title, ...p.rows.map(([timing, refund]) => timing + ': ' + refund), VENDOR_CANCELLATION_TERMS].join('\n')
}
/** Missing snapshots always retain the old 48-hour terms, never today's hotel policy. */
export function calculateHotelRefund(booking: { total_amount: number | string; check_in_date: string; cancellation_policy?: string | null; cancellation_check_in_time?: string | null; booking_status?: string }, now = new Date(), vendorCancelled = false) {
  const total = Number(booking.total_amount)
  if (!Number.isFinite(total) || total < 0) throw new Error('Invalid booking amount')
  const policy = isHotelCancellationPolicy(booking.cancellation_policy) ? booking.cancellation_policy : 'legacy'
  // Legacy bookings previously used midnight UTC. New bookings snapshot the property's local time.
  const checkIn = booking.cancellation_check_in_time
    ? new Date(booking.check_in_date.slice(0, 10) + 'T' + booking.cancellation_check_in_time.slice(0, 5) + ':00+05:30')
    : new Date(booking.check_in_date)
  if (!Number.isFinite(checkIn.getTime())) throw new Error('Invalid check-in date')
  const hours = (checkIn.getTime() - now.getTime()) / 3_600_000
  let percent = 0
  if (vendorCancelled) percent = 100
  else if (booking.booking_status !== 'no_show') {
    if (policy === 'flexible' && hours >= 24) percent = 100
    if (policy === 'moderate') percent = hours >= 72 ? 100 : hours >= 24 ? 50 : 0
    if (policy === 'legacy' && hours >= 48) percent = 100
  }
  const fee = policy === 'legacy' && percent && !vendorCancelled ? calculateGatewayFee(total) : 0
  const refundAmount = Math.max(0, Math.round((total * percent / 100 - fee) * 100) / 100)
  return {
    refundAmount, cancellationCharge: Math.round((total - refundAmount) * 100) / 100,
    isFullRefund: percent === 100 && fee === 0, isEligible: refundAmount > 0,
    hoursUntilCheckIn: Math.max(0, Math.floor(hours)), refundPercentage: percent,
    policyApplied: vendorCancelled ? 'vendor-cancellation-full-refund' : policy + '-' + percent + '-percent',
    message: vendorCancelled ? 'Vendor cancellation: 100% refund of the amount paid, due within 48 hours.' : percent ? percent + '% refund under the ' + policy + ' policy' + (fee ? ', minus payment gateway fee.' : '. No gateway fee deducted.') : 'No refund under the ' + policy + ' cancellation policy.',
  }
}
