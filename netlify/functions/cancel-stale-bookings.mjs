/**
 * Netlify scheduled function: every 15 minutes, cancels bookings left unpaid for 30+
 * minutes by calling /api/cron/cancel-stale-bookings (replaces the Vercel cron in vercel.json).
 * Set CRON_SECRET in Netlify's environment variables; the route requires it when set.
 * Scheduled functions only run on published production deploys.
 */
const cancelStaleBookings = async () => {
  const res = await fetch(`${process.env.URL}/api/cron/cancel-stale-bookings`, {
    headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  })
  console.log(`cancel-stale-bookings → ${res.status} ${await res.text()}`)
}

export default cancelStaleBookings

export const config = {
  schedule: '*/15 * * * *',
}
