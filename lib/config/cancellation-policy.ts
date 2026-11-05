/**
 * Legacy hotel and boat cancellation policy.
 * New hotel matrices and refunds live in hotel-cancellation-policy.ts.
 *
 * Both the backend refund calculation (app/api/payment/refund/route.ts) and every
 * customer-facing display of the policy (booking page, confirmation, refund-policy
 * page, cancel dialogs) must read these values from here. Never hardcode the hours
 * or percentages anywhere else — that's exactly how the displayed policy and the
 * actual refund math drifted apart before.
 *
 * Policy: >= FREE_CANCELLATION_HOURS before check-in/trip → full refund minus the
 * gateway fee (never reversed by Razorpay). Within that window → no refund.
 */
export const FREE_CANCELLATION_HOURS = 48

export const CANCELLATION_FEE_CONFIG = {
  GATEWAY_FEE_PERCENTAGE: 2, // % of total transaction amount
  GATEWAY_FEE_GST: 18, // % GST applied on the gateway fee
  EXTRA_FEE: 0, // flat INR amount (configurable for future)
} as const

/** Effective % of the transaction deducted as the gateway fee (fee + GST on fee), excluding EXTRA_FEE. */
export const EFFECTIVE_GATEWAY_FEE_PERCENT =
  CANCELLATION_FEE_CONFIG.GATEWAY_FEE_PERCENTAGE *
  (1 + CANCELLATION_FEE_CONFIG.GATEWAY_FEE_GST / 100)

/**
 * When free cancellation ends for a stay: FREE_CANCELLATION_HOURS before the property's check-in
 * time (default 12:00), in India time. `label` reads like "Thu, 12 Nov, 12:00 pm".
 */
export function freeCancellationDeadline(checkInDate: string, checkInTime?: string | null, now: Date = new Date()) {
  const [y, m, d] = checkInDate.slice(0, 10).split('-').map(Number)
  const [hh, mm] = (checkInTime || '12:00').split(':').map((n) => Number(n) || 0)
  const checkInUtc = Date.UTC(y, m - 1, d, hh, mm) - 330 * 60_000
  const deadline = new Date(checkInUtc - FREE_CANCELLATION_HOURS * 3_600_000)
  return {
    passed: now.getTime() > deadline.getTime(),
    label: deadline.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
}

export function calculateGatewayFee(totalAmount: number): number {
  const gatewayFee = (totalAmount * CANCELLATION_FEE_CONFIG.GATEWAY_FEE_PERCENTAGE) / 100
  const gst = (gatewayFee * CANCELLATION_FEE_CONFIG.GATEWAY_FEE_GST) / 100
  return Math.round((gatewayFee + gst + CANCELLATION_FEE_CONFIG.EXTRA_FEE) * 100) / 100
}
