/**
 * How long an unpaid booking holds its rooms: after this the cancel-stale-bookings job cancels it
 * (app/api/cron/cancel-stale-bookings). The review page quotes it when a payment is cancelled.
 */
export const STALE_BOOKING_MINUTES = 30
