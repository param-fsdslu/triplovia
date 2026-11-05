'use client'

/**
 * BookingConfirmation — displays the full detail view for a hotel booking.
 *
 * Fetches the booking server-side via getBookingByReference on mount.
 * The banner header adapts based on the combination of booking_status and payment_status:
 *   cancelled → red cancellation banner
 *   refund_rejected → red refund-rejected banner
 *   pending/processing payment → amber pending-payment banner
 *   refund_requested → teal refund-under-review banner
 *   refunded/partially_refunded → navy refund-processed banner
 *   checked_in → gold current-stay banner
 *   checked_out/completed → grey stay-completed banner
 *   default (confirmed + paid) → teal confirmation banner
 *
 * getBannerConfig() encodes this matrix of states → UI configuration.
 * StatusText() renders booking and payment status as coloured text with a dot (no pills).
 * Sections have plain titles, with contact and cancellation actions in the Need help sidebar.
 */
import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/routing'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  User,
  Users,
  BedDouble,
  Download,
  Home,
  AlertCircle,
  Clock,
  ArrowLeft,
  XCircle,
  RefreshCcw,
  Building2,
  Headset,
  Whatsapp,
  ChevronRight,
  Navigation,
} from '@/components/icons'
import { format, isValid } from 'date-fns'
import { getBookingByReference } from '@/lib/actions/bookings'
import { invoiceUrl, isInvoiceable } from '@/lib/utils/invoice'
import { Link } from '@/i18n/routing'
import { CancellationPolicyNotice } from '@/components/booking/CancellationPolicyNotice'
import { MapPattern } from '@/components/booking/MapPattern'
import { formatRupees } from '@/lib/utils'
import { CONTACT, whatsappUrl } from '@/lib/config/contact'
import { directionsUrl } from '@/lib/utils/maps'
import { BookingCancellation } from '@/components/booking/BookingCancellation'

interface BookingConfirmationProps {
  bookingReference: string
}

type BannerConfig = {
  gradient: string
  Icon: React.ElementType
  title: string
  subtitle: string
  showActions: boolean
  showNextSteps: boolean
}

/**
 * Maps the combination of booking_status and payment_status to banner UI configuration.
 * Evaluated top-to-bottom — more specific states (cancelled, refund_rejected) take priority
 * over general payment states, which take priority over booking phase states.
 */
function getBannerConfig(bookingStatus: string, paymentStatus: string): BannerConfig {
  if (bookingStatus === 'cancelled') {
    return {
      gradient: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
      Icon: XCircle,
      title: 'Booking Cancelled',
      subtitle: 'This reservation has been cancelled. Contact us if you have questions.',
      showActions: false,
      showNextSteps: false,
    }
  }
  if (paymentStatus === 'refund_rejected') {
    return {
      gradient: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
      Icon: XCircle,
      title: 'Refund Not Approved',
      subtitle: 'Your refund request was not approved. Please contact support for assistance.',
      showActions: false,
      showNextSteps: false,
    }
  }
  if (paymentStatus === 'pending' || paymentStatus === 'processing') {
    return {
      gradient: 'linear-gradient(135deg, #78350f 0%, #3c1a05 100%)',
      Icon: Clock,
      title: 'Payment Pending',
      subtitle: 'Your booking is reserved but payment has not been completed. Complete payment to confirm your stay.',
      showActions: false,
      showNextSteps: false,
    }
  }
  if (paymentStatus === 'refund_requested') {
    return {
      gradient: 'linear-gradient(135deg, #107F78 0%, #073F3D 100%)',
      Icon: RefreshCcw,
      title: 'Refund Requested',
      subtitle: 'Your refund request is under review. We\'ll notify you once processed.',
      showActions: true,
      showNextSteps: false,
    }
  }
  if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
    return {
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f2340 100%)',
      Icon: RefreshCcw,
      title: paymentStatus === 'partially_refunded' ? 'Partial Refund Processed' : 'Refund Processed',
      subtitle: 'Your refund has been initiated. Allow 5–7 business days to reflect in your account.',
      showActions: true,
      showNextSteps: false,
    }
  }
  if (bookingStatus === 'checked_in') {
    return {
      gradient: 'linear-gradient(135deg, #D8AA68 0%, #B08A55 100%)',
      Icon: CheckCircle2,
      title: 'Currently Checked In',
      subtitle: 'Welcome! Enjoy your stay.',
      showActions: true,
      showNextSteps: false,
    }
  }
  if (bookingStatus === 'checked_out' || bookingStatus === 'completed') {
    return {
      gradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
      Icon: CheckCircle2,
      title: 'Stay Completed',
      subtitle: 'Thank you for staying with us. We hope to see you again soon.',
      showActions: true,
      showNextSteps: false,
    }
  }
  // Default: confirmed + paid
  return {
    gradient: 'linear-gradient(135deg, #107F78 0%, #073F3D 100%)',
    Icon: CheckCircle2,
    title: 'Booking Confirmed',
    subtitle: 'Your reservation is confirmed — we look forward to hosting you.',
    showActions: true,
    showNextSteps: true,
  }
}

/** Booking or payment status as coloured text with a dot (no pill); neutral for unknown ones */
function StatusText({ status, type }: { status: string; type: 'booking' | 'payment' }) {
  const bookingCls: Record<string, string> = {
    confirmed: 'text-primary',
    checked_in: 'text-secondary',
    checked_out: 'text-muted-foreground',
    completed: 'text-muted-foreground',
    cancelled: 'text-destructive',
    pending: 'text-amber-600',
  }
  const paymentCls: Record<string, string> = {
    paid: 'text-primary',
    pending: 'text-amber-600',
    processing: 'text-amber-600',
    refunded: 'text-muted-foreground',
    partially_refunded: 'text-secondary',
    refund_requested: 'text-primary',
    refund_rejected: 'text-destructive',
  }
  const cls = (type === 'booking' ? bookingCls : paymentCls)[status] ?? 'text-muted-foreground'
  const label = status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  )
}

/** A card's title row: plain heading, no gold eyebrow (by request) */
function SectionHead({ title }: { title: string }) {
  return (
    <div className="border-b border-border px-4 py-4 sm:px-5">
      <h2 className="font-heading text-base font-bold text-foreground">{title}</h2>
    </div>
  )
}

function PriceRow({ label, value }: { label: React.ReactNode; value: string }) {
  return <div className="flex items-start justify-between gap-4 text-sm">
    <span className="min-w-0 break-words text-muted-foreground">{label}</span>
    <span className="shrink-0 text-right font-medium tabular-nums text-foreground">{value}</span>
  </div>
}

/** 'YYYY-MM-DD' as a local calendar date (no time-zone shift) */
function calendarDate(value: string) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** A stay date as a calendar tile (month strip + big day) beside the weekday, year and time */
function DateHighlight({
  label,
  date,
  time,
  tone,
  align = 'left',
}: {
  label: string
  date: string
  time?: string
  tone: 'primary' | 'gold'
  align?: 'left' | 'right'
}) {
  const day = calendarDate(date)
  if (!isValid(day)) return <div className={align === 'right' ? 'text-right' : ''}>
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-2 text-sm text-muted-foreground">Date unavailable</p>
  </div>
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className={`flex min-w-0 flex-col gap-2 @xl:flex-row @xl:items-center @xl:gap-3 ${align === 'right' ? 'items-end @xl:flex-row-reverse' : 'items-start'}`}>
        <div className="w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-card text-center shadow-[0_4px_14px_-8px_rgba(7,63,61,0.35)]">
          <div
            className={`py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              tone === 'gold' ? 'bg-gold text-secondary' : 'bg-primary text-white'
            }`}
          >
            {format(day, 'MMM')}
          </div>
          <div className="py-1.5 font-heading text-2xl font-extrabold leading-none text-foreground">{format(day, 'd')}</div>
        </div>
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold leading-tight text-foreground @xl:text-base">{format(day, 'EEEE')}</p>
          <p className="text-xs text-muted-foreground">
            {format(day, 'yyyy')}
            {time && <span className="mt-0.5 block">{time}</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

/** An info row's icon, plain (no tinted box); `accent` is kept for the callers */
function InfoIcon({ children }: { children: React.ReactNode; accent?: 'teal' | 'gold' }) {
  return <span className="flex w-5 shrink-0 items-center justify-center">{children}</span>
}

export function BookingConfirmation({ bookingReference }: BookingConfirmationProps) {
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getBookingByReference(bookingReference)
      .then((result) => {
        if (!result.success) {
          setError(result.error || 'Booking not found')
        } else {
          setBooking(result.booking)
        }
      })
      .catch((err: any) => setError(err.message || 'Failed to load booking'))
      .finally(() => setLoading(false))
  }, [bookingReference])

  useEffect(() => {
    if (!loading && booking?.id && window.location.hash === '#need-help') {
      document.getElementById('need-help')?.scrollIntoView({ block: 'start' })
    }
  }, [loading, booking?.id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(16,127,120,0.07)] p-12 text-center">
        <div className="h-14 w-14 rounded-full bg-destructive/8 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2
          className="text-xl font-bold text-foreground mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Booking Not Found
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {error || 'This booking does not exist or has been removed.'}
        </p>
        <Button
          onClick={() => router.push('/')}
          className="rounded-full bg-primary hover:bg-primary-hover shadow-none font-semibold"
        >
          <Home className="mr-2 h-4 w-4" />
          Return to Home
        </Button>
      </div>
    )
  }

  const hotel = booking.hotel ?? { name: 'Property unavailable' }
  const room = booking.room_type ?? { name: 'Room unavailable' }
  const location = [hotel.address_line_1, hotel.address_line_2, hotel.city, hotel.state, hotel.postal_code].filter(Boolean).join(', ')
  const banner = getBannerConfig(booking.booking_status, booking.payment_status)
  const BannerIcon = banner.Icon
  const isPaid = booking.payment_status === 'paid'

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6" id="booking-details">

      {/* ── Back nav ─────────────────────────────────────────── */}
      <Link
        href="/bookings"
        className="inline-flex items-center gap-1.5 text-xs font-semibold
                   text-muted-foreground hover:text-primary transition-colors group"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to My Bookings
      </Link>

      {/* ── Dynamic status hero banner (status gradient under a travel-map pattern) ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: banner.gradient }}>
        <MapPattern />
        <div className="relative px-5 py-6 sm:px-7 sm:py-8">
          <div className="max-w-xl mx-auto text-center">

            {/* Status icon */}
            <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-white/15 flex items-center justify-center">
              <BannerIcon className="h-9 w-9 text-white" />
            </div>

            <h1
              className="text-2xl sm:text-3xl font-bold text-white mb-1"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {banner.title}
            </h1>
            <p className="text-sm text-white/65 mb-6 max-w-sm mx-auto leading-relaxed">
              {banner.subtitle}
            </p>

            {/* Reference pill */}
            <div className="flex justify-center mb-6">
              <div className="flex max-w-full flex-col items-center rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm sm:px-6">
                <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/50 mb-0.5">
                  Booking Reference
                </span>
                <span
                  className="break-all text-base font-bold tracking-wide text-white sm:text-xl"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {booking.booking_reference}
                </span>
                {booking.invoice_number && (
                  <span className="mt-1 text-[11px] font-medium tracking-wide text-white/60">
                    Invoice {booking.invoice_number}
                  </span>
                )}
              </div>
            </div>

            {/* Actions — only shown for actionable statuses */}
            {banner.showActions && (
              <div className="flex flex-wrap gap-2 justify-center">
                {isInvoiceable(booking) && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white font-medium text-xs"
                  >
                    <a href={invoiceUrl(booking.booking_reference)} download>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download invoice
                    </a>
                  </Button>
                )}
                <Button
                  onClick={() => router.push('/bookings')}
                  size="sm"
                  className="rounded-full bg-white/90 hover:bg-white font-semibold text-xs shadow-none text-foreground"
                >
                  <Home className="mr-1.5 h-3.5 w-3.5" />
                  My Bookings
                </Button>
              </div>
            )}

            {/* Cancelled/pending: just a link back to the bookings list */}
            {!banner.showActions && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  onClick={() => router.push('/bookings')}
                  size="sm"
                  className="rounded-full bg-white/90 hover:bg-white font-semibold text-xs shadow-none text-foreground"
                >
                  <Home className="mr-1.5 h-3.5 w-3.5" />
                  Back to My Bookings
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shared rows keep short cards from leaving a tall empty column on desktop. */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)] xl:gap-6">
        {/* Accommodation */}
        <div className="@container overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Card header */}
          <SectionHead title="Stay details" />

          <div className="space-y-5 p-4 sm:p-5">
            {/* Hotel + room image */}
            <div className="flex flex-col gap-4 @md:flex-row">
              {room.room_type_images?.[0]?.image_url && (
                <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl @md:h-28 @md:w-40">
                  <Image
                    src={room.room_type_images[0].image_url}
                    alt={room.room_type_images[0].alt_text || room.name}
                    fill
                    sizes="(min-width: 768px) 160px, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3
                  className="text-lg font-bold text-foreground mb-1 leading-snug"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {hotel.name}
                </h3>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-3">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {location || 'Location unavailable'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <BedDouble className="h-4 w-4 text-primary" />
                    {room.name}
                  </p>
                  {/* Google Maps directions to the hotel (the Maps app on phones) */}
                  {(location || (hotel.latitude != null && hotel.longitude != null)) && <a
                    href={directionsUrl(hotel)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <Navigation className="h-4 w-4" />
                    Get directions
                  </a>}
                </div>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* Check-in → nights → check-out, highlighted */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-primary/15 bg-mint/50 p-3 sm:gap-4 sm:p-4">
              <DateHighlight
                label="Check-in"
                date={booking.check_in_date}
                time={hotel.check_in_from_time ? `From ${hotel.check_in_from_time.slice(0, 5)}` : undefined}
                tone="primary"
              />
              <div className="flex flex-col items-center gap-1.5 text-primary">
                <span className="whitespace-nowrap text-sm font-bold text-primary">
                  {booking.num_nights} {booking.num_nights === 1 ? 'night' : 'nights'}
                </span>
                <span className="hidden h-px w-14 border-t-2 border-dashed border-primary/30 sm:block" />
              </div>
              <DateHighlight
                label="Check-out"
                date={booking.check_out_date}
                time={hotel.check_out_time ? `Until ${hotel.check_out_time.slice(0, 5)}` : undefined}
                tone="gold"
                align="right"
              />
            </div>

            {/* Guests / rooms, side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="contents">
                <div className="flex items-center gap-3">
                  <InfoIcon accent="teal">
                    <Users className="h-4 w-4 text-primary" />
                  </InfoIcon>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Guests
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {booking.num_adults} {booking.num_adults === 1 ? 'Adult' : 'Adults'}
                      {booking.num_children > 0 &&
                        `, ${booking.num_children} ${booking.num_children === 1 ? 'Child' : 'Children'}`}
                      {booking.with_pets && ', with pets'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <InfoIcon accent="gold">
                    <BedDouble className="h-4 w-4 text-gold" />
                  </InfoIcon>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Rooms
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {booking.num_rooms} {booking.num_rooms === 1 ? 'Room' : 'Rooms'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {booking.num_nights} {booking.num_nights === 1 ? 'night' : 'nights'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {room.bed_configuration && (
              <>
                <div className="h-px bg-border/60" />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BedDouble className="h-3.5 w-3.5 shrink-0" />
                  {room.bed_configuration}
                </div>
              </>
            )}

            {booking.special_requests && (
              <>
                <div className="h-px bg-border/60" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Special Requests
                  </p>
                  <p className="text-sm text-foreground bg-muted/40 rounded-xl p-3 leading-relaxed">
                    {booking.special_requests}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    * Subject to availability
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Payment summary */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <SectionHead title="Price summary" />

          <div className="space-y-4 p-4 sm:p-5">
            <div className="space-y-2.5 text-sm">
              <PriceRow label={<>
                  {formatRupees(booking.price_per_night)} × {booking.num_nights}{' '}
                  night{booking.num_nights > 1 ? 's' : ''} × {booking.num_rooms} room
                  {booking.num_rooms > 1 ? 's' : ''}
              </>} value={formatRupees(booking.subtotal)} />
              <PriceRow label="Taxes & fees" value={formatRupees(booking.tax_amount)} />
              <PriceRow label="Service fee" value={formatRupees(booking.service_fee)} />
              {booking.booking_meal_plans?.length > 0 &&
                booking.booking_meal_plans.map((mp: any) => (
                  <PriceRow key={mp.id} label={mp.name} value={formatRupees(mp.total_amount)} />
                ))}
              {booking.extra_bed_charge > 0 && (
                <PriceRow label="Extra bed / guest charge" value={formatRupees(booking.extra_bed_charge)} />
              )}
            </div>

            <div className="h-px bg-border/60" />

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-foreground">
                {isPaid ? 'Total Paid' : 'Total'}
              </span>
              <div className="text-right">
                <div
                  className="text-2xl font-bold text-primary"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {formatRupees(booking.total_amount)}
                </div>
                <p className="text-[11px] text-muted-foreground">Incl. all taxes</p>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground text-xs">Payment</span>
                <StatusText status={booking.payment_status} type="payment" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground text-xs">Booking</span>
                <StatusText status={booking.booking_status} type="booking" />
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-4 xl:col-span-2">
          {/* Guest Information */}
          <div className="@container overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <SectionHead title="Guest information" />

            <div className="grid gap-5 p-4 @sm:grid-cols-2 @2xl:grid-cols-3 sm:p-5">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Name
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {booking.guest_first_name} {booking.guest_last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="text-sm font-medium text-foreground break-all">
                  {booking.guest_email || <span className="text-muted-foreground">Not given</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Phone
                </p>
                <p className="text-sm font-medium text-foreground">{booking.guest_phone}</p>
              </div>
              {booking.gst_number && (
                <div className="col-span-full border-t border-border/60 pt-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> GST invoice details
                  </p>
                  <p className="text-sm font-semibold text-foreground">{booking.gst_company_name}</p>
                  <p className="font-mono text-xs tracking-wide text-foreground">GSTIN {booking.gst_number}</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line mt-0.5">{booking.gst_company_address}</p>
                </div>
              )}
            </div>
          </div>
          {/* Email notice — only for confirmed+paid bookings with an email to send to */}
          {isPaid && booking.booking_status !== 'cancelled' && booking.guest_email && (
            <div className="rounded-xl bg-primary/8 border border-primary/15 px-4 py-3 flex items-start gap-3">
              <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary leading-relaxed">
                <strong>Confirmation sent.</strong> A booking confirmation email has been sent to{' '}
                <strong>{booking.guest_email}</strong>. Present this reference or the email at check-in.
              </p>
            </div>
          )}

          {/* Payment pending notice */}
          {(booking.payment_status === 'pending' || booking.payment_status === 'processing') && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
              <Clock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Action required.</strong> Your booking is reserved but payment is not complete.
                Return to your booking to complete payment and secure your reservation.
              </p>
            </div>
          )}
        </div>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <SectionHead title="Cancellation & refunds" />
          <div className="p-4 sm:p-5"><CancellationPolicyNotice policy={booking.cancellation_policy} /></div>
        </div>
        {/* Need help? Triplovia support, with this booking's reference filled in */}
        <div id="need-help" className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
            <Headset className="h-4 w-4 text-primary" />
            Need help?
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Questions about this booking, changes or a refund? Our team will help.
          </p>
          <div className="mt-3 divide-y divide-border/60">
            {[
              {
                href: `tel:${CONTACT.phone}`,
                icon: Phone,
                label: 'Call us',
                value: CONTACT.phoneDisplay,
              },
              {
                href: whatsappUrl(`Hi Triplovia, I need help with my booking ${booking.booking_reference}.`),
                icon: Whatsapp,
                label: 'WhatsApp',
                value: 'Chat with us',
                external: true,
              },
              {
                href: `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Help with booking ${booking.booking_reference}`)}`,
                icon: Mail,
                label: 'Email',
                value: CONTACT.email,
              },
            ].map(({ href, icon: Icon, label, value, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex items-center gap-3 py-2.5 first:pt-1 last:pb-0"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground group-hover:text-primary">{label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{value}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
            <BookingCancellation booking={booking} onCancelled={() => {
              setBooking((current: any) => current ? { ...current, booking_status: 'cancelled', payment_status: current.payment_status === 'paid' ? 'refund_requested' : current.payment_status } : current)
              router.refresh()
            }} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Booking ID <span className="font-semibold text-foreground">{booking.booking_reference}</span>
          </p>
        </div>
        {/* Contact hotel */}
        {(hotel.phone || hotel.email) && (
          <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 xl:col-span-2">
            <h3
              className="text-sm font-bold text-foreground mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Contact Hotel
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {hotel.phone && (
                <div className="flex items-center gap-2.5">
                  <InfoIcon accent="teal">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                  </InfoIcon>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${hotel.phone}`}
                      className="text-sm font-medium text-primary hover:text-gold transition-colors"
                    >
                      {hotel.phone}
                    </a>
                  </div>
                </div>
              )}
              {hotel.email && (
                <div className="flex items-center gap-2.5">
                  <InfoIcon accent="gold">
                    <Mail className="h-3.5 w-3.5 text-gold" />
                  </InfoIcon>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${hotel.email}`}
                      className="text-sm font-medium text-primary hover:text-gold transition-colors break-all"
                    >
                      {hotel.email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* What's next — only for confirmed+paid */}
        {banner.showNextSteps && <div
          className="overflow-hidden rounded-2xl xl:col-span-2"
          style={{ background: 'linear-gradient(135deg, #107F78 0%, #073F3D 100%)' }}
        >
          <div className="p-5">
            <h3
              className="text-sm font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              What&apos;s Next?
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: CheckCircle2,
                  title: 'Confirmation Email',
                  sub: 'Check your inbox for booking details',
                  accent: 'gold' as const,
                },
                {
                  icon: Clock,
                  title: 'Prepare for Check-in',
                  sub: 'Bring a valid ID and this reference',
                  accent: 'teal' as const,
                },
                {
                  icon: Phone,
                  title: 'Contact Hotel',
                  sub: 'For special requests or changes',
                  accent: 'gold' as const,
                },
              ].map(({ icon: Icon, title, sub, accent }) => (
                <div key={title} className="flex items-start gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                      accent === 'gold' ? 'bg-gold/20' : 'bg-white/15'
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${accent === 'gold' ? 'text-gold' : 'text-white'}`}
                    />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{title}</p>
                    <p className="text-[11px] text-white/55 leading-relaxed">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}
