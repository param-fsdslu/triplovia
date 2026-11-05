/** Recovery for paid hotel confirmations. Immediate delivery runs on payment success. */
export default async function bookingConfirmations() {
  if (!process.env.CRON_SECRET || !process.env.URL) throw new Error('URL and CRON_SECRET are required')
  const response = await fetch(new URL('/api/cron/booking-confirmations', process.env.URL), {
    headers: { Authorization: 'Bearer ' + process.env.CRON_SECRET },
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok) throw new Error('Booking confirmation recovery failed: HTTP ' + response.status)
  console.log('booking-confirmations:', await response.text())
}
export const config = { schedule: '*/5 * * * *' }
