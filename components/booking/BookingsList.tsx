'use client'

import { useState, useEffect, useMemo } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Calendar,
  MapPin,
  Clock,
  X,
  Hotel,
  Download,
  Star,
  MessageSquare,
  RefreshCcw,
  XCircle,
  CheckCircle2,
  KeyRound,
  Headset,
} from '@/components/icons'
import { format, isValid, isPast, startOfToday } from 'date-fns'
import { ReviewDialog } from '@/components/reviews/ReviewDialog'
import { getReviewByBookingId } from '@/lib/actions/reviews'
import { invoiceUrl, isInvoiceable } from '@/lib/utils/invoice'
import { cn, formatRupees } from '@/lib/utils'

/** 'YYYY-MM-DD' as a local calendar date */
function calendarDate(value: string) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function displayDate(value: string, pattern: string, calendar = true) {
  const date = calendar ? calendarDate(value) : new Date(value)
  return isValid(date) ? format(date, pattern) : 'Date unavailable'
}

/** One status per booking, from booking + payment status, most telling first (shown as coloured text) */
const STATUS_STYLES = {
  refund_requested: { label: 'Refund requested', icon: RefreshCcw, cls: 'text-primary' },
  refunded: { label: 'Refunded', icon: RefreshCcw, cls: 'text-secondary' },
  cancelled: { label: 'Cancelled', icon: XCircle, cls: 'text-destructive' },
  payment_pending: { label: 'Payment pending', icon: Clock, cls: 'text-amber-600' },
  checked_in: { label: 'Checked in', icon: KeyRound, cls: 'text-secondary' },
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'text-secondary' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, cls: 'text-primary' },
} as const

function statusOf(b: { booking_status: string; payment_status: string }): keyof typeof STATUS_STYLES {
  if (b.payment_status === 'refund_requested') return 'refund_requested'
  if (b.payment_status === 'refunded' || b.payment_status === 'partially_refunded') return 'refunded'
  if (b.booking_status === 'cancelled') return 'cancelled'
  if (['pending', 'processing', 'failed'].includes(b.payment_status)) return 'payment_pending'
  if (b.booking_status === 'checked_in') return 'checked_in'
  if (b.booking_status === 'checked_out' || b.booking_status === 'completed') return 'completed'
  return 'confirmed'
}

/** The booking's status as bold coloured text with its icon (no pill, by request) */
function StatusLabel({ booking }: { booking: { booking_status: string; payment_status: string } }) {
  const { label, icon: Icon, cls } = STATUS_STYLES[statusOf(booking)]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold ${cls}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  )
}

/** A card action as a plain text link (icon + label), not a pill */
const ACTION_LINK = 'inline-flex items-center gap-1.5 text-sm font-semibold transition-colors'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Refund progress under a booking card */
const REFUND_NOTES: Record<string, { text: string; tone: 'info' | 'error'; icon: typeof Clock }> = {
  refund_requested: { text: "Refund under review — we'll notify you once approved", tone: 'info', icon: Clock },
  refunded: { text: 'Refund initiated — allow 5–7 business days', tone: 'info', icon: RefreshCcw },
  partially_refunded: { text: 'Refund initiated — allow 5–7 business days', tone: 'info', icon: RefreshCcw },
  refund_rejected: { text: 'Refund not approved — contact support for details', tone: 'error', icon: XCircle },
}

interface Booking {
  id: string
  booking_reference: string
  check_in_date: string
  check_out_date: string
  num_nights: number
  num_adults: number
  num_children: number
  num_rooms: number
  total_amount: number
  booking_status: string
  payment_status: string
  created_at: string
  hotel: {
    id: string
    name: string
    city: string
    state: string
    hotel_images?: Array<{ image_url: string; alt_text?: string; is_primary?: boolean; display_order?: number }>
  } | null
  room_type: {
    id: string
    name: string
    room_type_images?: Array<{
      image_url: string
      alt_text?: string
    }>
  } | null
}

interface BookingsListProps {
  bookings: Booking[]
}

export function BookingsList({ bookings }: BookingsListProps) {
  const router = useRouter()
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null)
  const [bookingReviews, setBookingReviews] = useState<Record<string, any>>({})

  // Every booking in exactly one tab: cancelled; past (stay over); upcoming (the rest, incl.
  // unpaid and stays in progress). Memoised so the reviews effect below runs once per list.
  const { upcomingBookings, pastBookings, cancelledBookings } = useMemo(() => {
    const today = startOfToday()
    const isOver = (b: Booking) =>
      ['completed', 'checked_out'].includes(b.booking_status) || calendarDate(b.check_out_date) < today
    const cancelled = bookings.filter((b) => b.booking_status === 'cancelled')
    const live = bookings.filter((b) => b.booking_status !== 'cancelled')
    return {
      upcomingBookings: live.filter((b) => !isOver(b)),
      pastBookings: live.filter(isOver),
      cancelledBookings: cancelled,
    }
  }, [bookings])

  // Fetch reviews for past bookings
  useEffect(() => {
    const fetchReviews = async () => {
      const reviews: Record<string, any> = {}
      for (const booking of pastBookings) {
        const result = await getReviewByBookingId(booking.id)
        if (result.review) {
          reviews[booking.id] = result.review
        }
      }
      setBookingReviews(reviews)
    }

    if (pastBookings.length > 0) {
      fetchReviews()
    }
  }, [pastBookings])

  const handleReviewClick = (booking: Booking) => {
    setSelectedBookingForReview(booking)
    setReviewDialogOpen(true)
  }

  const renderBookingCard = (booking: Booking) => {
    // The room's photo, else the hotel's main photo
    const hotel = booking.hotel ?? { id: '', name: 'Property unavailable', city: '', state: '' }
    const room = booking.room_type ?? { id: '', name: 'Room unavailable' }
    const hotelImage = [...(hotel.hotel_images ?? [])].sort(
      (a, b) => Number(!!b.is_primary) - Number(!!a.is_primary) || (a.display_order ?? 0) - (b.display_order ?? 0)
    )[0]
    const image = room.room_type_images?.[0] ?? hotelImage
    const guests = [
      plural(booking.num_adults, 'adult'),
      booking.num_children > 0 ? plural(booking.num_children, 'child', 'children') : null,
    ]
      .filter(Boolean)
      .join(' · ')
    const facts = [
      { label: 'Check-in', value: displayDate(booking.check_in_date, 'EEE, d MMM') },
      { label: 'Check-out', value: displayDate(booking.check_out_date, 'EEE, d MMM') },
      { label: 'Stay', value: plural(booking.num_nights, 'night') },
      { label: 'Guests', value: guests },
    ]

    return (
      <article
        key={booking.id}
        className="group @container relative overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-[0_10px_30px_-14px_rgba(16,127,120,0.35)]"
      >
        {/* The whole card opens the booking; its buttons sit above this link (relative z-10) */}
        <Link
          href={`/bookings/${booking.booking_reference}`}
          className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Open booking ${booking.booking_reference} at ${hotel.name}`}
        />
        <div className="@xl:flex">
          {/* Photo */}
          <div className="relative h-40 shrink-0 overflow-hidden bg-mint @xl:h-auto @xl:w-48">
            {image?.image_url ? (
              <Image
                src={image.image_url}
                alt={image.alt_text || hotel.name}
                fill
                sizes="(min-width: 640px) 192px, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Hotel className="h-10 w-10 text-primary/30" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 p-4 @xl:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <StatusLabel booking={booking} />
                <h3 className="mt-1 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                  {hotel.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">
                    {hotel.city}, {hotel.state} · {room.name}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-heading text-xl font-extrabold text-foreground">
                  {formatRupees(Number(booking.total_amount))}
                </p>
              </div>
            </div>

            {/* Stay facts: plain labels and values, no icons */}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3 @2xl:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                  <dd className="truncate text-sm font-semibold text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Booking ID <span className="font-semibold text-foreground">{booking.booking_reference}</span>
                <span className="mx-1.5">·</span>
                Booked {displayDate(booking.created_at, 'd MMM yyyy', false)}
              </p>
              {/* Actions as plain text links, no pills or View button (the whole card opens the booking), by request */}
              <div className="relative z-10 ml-auto flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
                {(booking.booking_status === 'completed' || isPast(new Date(booking.check_out_date))) &&
                  booking.payment_status === 'paid' && (
                    bookingReviews[booking.id] ? (
                      <button
                        type="button"
                        onClick={() => handleReviewClick(booking)}
                        title="View your review"
                        className={cn(ACTION_LINK, 'text-muted-foreground hover:text-foreground')}
                      >
                        <Star className="h-4 w-4 fill-gold text-gold" />
                        {bookingReviews[booking.id].status === 'approved' ? 'Reviewed' : 'Review pending'}
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleReviewClick(booking)} className={cn(ACTION_LINK, 'text-primary hover:text-primary-hover')}>
                        <MessageSquare className="h-4 w-4" />
                        Write review
                      </button>
                    )
                  )}
                {isInvoiceable(booking) && (
                  <a
                    href={invoiceUrl(booking.booking_reference)}
                    download
                    title="Download the tax invoice (PDF)"
                    className={cn(ACTION_LINK, 'text-primary hover:text-primary-hover')}
                  >
                    <Download className="h-4 w-4" />
                    Invoice
                  </a>
                )}
                <Link href={`/bookings/${booking.booking_reference}#need-help`} className={cn(ACTION_LINK, 'text-primary hover:text-primary-hover')}>
                  <Headset className="h-4 w-4" />
                  Need help?
                </Link>
              </div>
            </div>

            {REFUND_NOTES[booking.payment_status] && (() => {
              const note = REFUND_NOTES[booking.payment_status]
              return (
                <p
                  className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
                    note.tone === 'error' ? 'text-destructive' : 'text-primary'
                  }`}
                >
                  <note.icon className="h-3.5 w-3.5 shrink-0" />
                  {note.text}
                </p>
              )
            })()}
          </div>
        </div>
      </article>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
          <CardDescription>Your hotel reservations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Hotel className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start exploring our hotels and make your first reservation
            </p>
            <Button onClick={() => router.push('/hotels')}>
              Browse Hotels
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Tab label with its count as plain text (no count bubbles)
  const tabLabel = (label: string, count: number) => (
    <>
      {label}
      {count > 0 && <span className="font-medium opacity-60">{count}</span>}
    </>
  )
  // Underlined text tabs, like the hotel page's section tabs (no pill track, by request)
  const TAB =
    '-mb-px h-auto flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0.5 pb-3 pt-1 text-[15px] font-semibold text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none'

  return (
    <>
      {/* Tabs straight on the page (no card around them) */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-5 h-auto w-full justify-start gap-7 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="upcoming" className={TAB}>{tabLabel('Upcoming', upcomingBookings.length)}</TabsTrigger>
          <TabsTrigger value="past" className={TAB}>{tabLabel('Past', pastBookings.length)}</TabsTrigger>
          <TabsTrigger value="cancelled" className={TAB}>{tabLabel('Cancelled', cancelledBookings.length)}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">No upcoming bookings</p>
            </div>
          ) : (
            upcomingBookings.map(renderBookingCard)
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">No past bookings</p>
            </div>
          ) : (
            pastBookings.map(renderBookingCard)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <X className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">No cancelled bookings</p>
            </div>
          ) : (
            cancelledBookings.map(renderBookingCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      {selectedBookingForReview && (
        <ReviewDialog
          booking={{
            id: selectedBookingForReview.id,
            booking_reference: selectedBookingForReview.booking_reference,
            hotel: selectedBookingForReview.hotel ?? { id: '', name: 'Property unavailable' },
            check_in_date: selectedBookingForReview.check_in_date,
            check_out_date: selectedBookingForReview.check_out_date,
          }}
          existingReview={bookingReviews[selectedBookingForReview.id] || null}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
        />
      )}
    </>
  )
}
