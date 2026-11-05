import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { getUserBookings } from '@/lib/actions/bookings'
import { getSavedStays } from '@/lib/actions/saved-stays'
import { SavedStaysList } from '@/components/account/SavedStaysList'
import { BookingsList } from '@/components/booking/BookingsList'
import { Button } from '@/components/ui/button'
import { Hotel } from '@/components/icons'

/**
 * My Bookings — the account's home for trips: rooms picked but not paid for (saved stays), then
 * every booking in Upcoming / Past / Cancelled tabs with view, invoice, cancel and review actions.
 */
export default async function MyBookingsPage() {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) redirect('/auth/login')

  const [{ bookings = [] }, savedStays] = await Promise.all([getUserBookings(user.id), getSavedStays()])

  return (
    <div>
      {/* ── Page header ─────────────────────────────────── */}
      <div className="mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          My Bookings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {bookings.length === 0
            ? 'Your reservations will appear here'
            : `${bookings.length} reservation${bookings.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* ── Rooms picked but not paid for (saved on the account) ── */}
      <SavedStaysList stays={savedStays} />

      {bookings.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(16,127,120,0.08)] p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
            <Hotel className="h-7 w-7 text-primary/40" />
          </div>
          <h3
            className="text-base font-bold text-foreground mb-1"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            No bookings yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Your hotel reservations will appear here once you book
          </p>
          <Button
            asChild
            className="rounded-full bg-primary hover:bg-primary-hover shadow-none font-semibold"
          >
            <Link href="/hotels">Browse Hotels</Link>
          </Button>
        </div>
      ) : (
        <BookingsList bookings={bookings} />
      )}
    </div>
  )
}
