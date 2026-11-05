import { isHotelCancellationPolicy } from '@/lib/config/hotel-cancellation-policy'
import { CancellationPolicyNotice } from './CancellationPolicyNotice'
/**
 * BookingSuccess — the booking confirmation shown after payment (/payment/success).
 *
 * Minimal and centred: an animated check (pops in, draws its tick, one soft ripple and a small
 * burst of dots), the headline, one ticket-style card (hotel, dates, rooms, guests, booking ID,
 * total paid), two actions, and one line on the cancellation deadline. The price breakup lives in
 * the invoice PDF. Animations play once and are skipped for prefers-reduced-motion.
 *
 * `group` holds every booking paid in the same Razorpay order (multi-room checkout), `booking`
 * first. Rows come from the page's BOOKING_SELECT (hotel with photos, room type).
 */
import type { ReactNode } from 'react'
import Image from 'next/image'
import { ArrowRight, Check, Download, Hotel, Mail, Smartphone } from '@/components/icons'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { EFFECTIVE_GATEWAY_FEE_PERCENT, FREE_CANCELLATION_HOURS, freeCancellationDeadline } from '@/lib/config/cancellation-policy'
import { cn, formatRupees } from '@/lib/utils'
import { formatPhone } from '@/lib/utils/phone'
import { invoiceUrl, isInvoiceable } from '@/lib/utils/invoice'
import { ClearPaidCart } from './ClearPaidCart'

/** 'YYYY-MM-DD' as a calendar date, not shifted by the server's time zone */
function calendarDate(value: string) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const shortDate = (value: string) =>
  calendarDate(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Fades content up in sequence after the check animation (no motion when reduced) */
const enter = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both'

/** Check badge keyframes: pop, tick draw, one ripple, a burst of dots */
const CELEBRATE_CSS = `
.bs-dot { opacity: 0; }
@keyframes bs-pop { 0% { transform: scale(.4); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
@keyframes bs-draw { to { stroke-dashoffset: 0 } }
@keyframes bs-ripple { 0% { transform: scale(.85); opacity: .45 } 100% { transform: scale(2.2); opacity: 0 } }
@keyframes bs-burst {
  0% { transform: rotate(var(--bs-angle)) translateY(0) scale(.5); opacity: 0 }
  20% { opacity: 1 }
  100% { transform: rotate(var(--bs-angle)) translateY(-58px) scale(1); opacity: 0 }
}
@media (prefers-reduced-motion: no-preference) {
  .bs-pop { animation: bs-pop .55s cubic-bezier(.2,.9,.3,1.25) both }
  .bs-tick { stroke-dasharray: 24; stroke-dashoffset: 24; animation: bs-draw .4s .4s ease-out forwards }
  .bs-ripple { animation: bs-ripple 1.4s .35s ease-out both }
  .bs-dot { animation: bs-burst .9s .4s ease-out both }
}
`

const DOT_COLORS = ['bg-gold', 'bg-primary', 'bg-mint', 'bg-gold', 'bg-primary', 'bg-gold', 'bg-mint', 'bg-primary']

function CelebrationCheck() {
  return (
    <div className="relative mx-auto h-20 w-20" aria-hidden="true">
      <span className="bs-ripple absolute inset-0 rounded-full bg-primary/30 opacity-0" />
      {DOT_COLORS.map((color, i) => (
        <span
          key={i}
          className={cn('bs-dot absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full', color)}
          style={{ ['--bs-angle' as string]: `${i * 45 + 22}deg` }}
        />
      ))}
      <span className="bs-pop relative flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-[0_14px_34px_-14px_rgba(16,127,120,0.75)]">
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path className="bs-tick" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-foreground">{children}</dd>
    </div>
  )
}

export function BookingSuccess({ booking, group }: { booking: any; group: any[] }) {
  const isGuestCheckout = !booking.user_id
  const hotel = booking.hotel ?? {}
  const photo = [...(hotel.hotel_images ?? [])].sort(
    (a: any, b: any) => Number(!!b.is_primary) - Number(!!a.is_primary) || (a.display_order ?? 0) - (b.display_order ?? 0)
  )[0]

  const nights = Number(booking.num_nights) || 0
  const totalPaid = group.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)
  // Each room type's booking holds its own guests, so the party is their sum
  const adults = group.reduce((sum, b) => sum + (Number(b.num_adults) || 0), 0)
  const children = group.reduce((sum, b) => sum + (Number(b.num_children) || 0), 0)
  const guestsLabel = [
    plural(adults, 'adult', 'adults'),
    children ? plural(children, 'child', 'children') : '',
    booking.with_pets ? 'with pets' : '',
  ]
    .filter(Boolean)
    .join(', ')
  const deadline = freeCancellationDeadline(booking.check_in_date, hotel.check_in_from_time)
  const invoiceable = group.filter(isInvoiceable)
  const manageHref = isGuestCheckout ? '/auth/login?redirect=/bookings' : `/bookings/${booking.booking_reference}`

  return (
    <main className="pt-16 sm:pt-[72px]">
      <style href="booking-success-celebrate" precedence="default">
        {CELEBRATE_CSS}
      </style>
      <ClearPaidCart hotelId={booking.hotel_id} />

      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
        {/* ── Headline ──────────────────────────────────────────────────── */}
        <div className="text-center">
          <CelebrationCheck />
          <p className={cn('mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-gold', enter, 'motion-safe:delay-300')}>
            Booking confirmed
          </p>
          <h1 className={cn('mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl', enter, 'motion-safe:delay-[400ms]')}>
            You&apos;re all set!
          </h1>
          <p className={cn('mt-2 text-muted-foreground', enter, 'motion-safe:delay-500')}>
            Your stay at <span className="font-semibold text-foreground">{hotel.name ?? 'the property'}</span> is booked.
          </p>
          <p className={cn('mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground', enter, 'motion-safe:delay-500')}>
            {booking.guest_email ? (
              <>
                <Mail className="h-4 w-4 text-primary" />
                Confirmation sent to <span className="font-medium text-foreground">{booking.guest_email}</span>
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4 text-primary" />
                Saved under <span className="font-medium text-foreground">{formatPhone(booking.guest_phone ?? '')}</span>
              </>
            )}
          </p>
        </div>

        {/* ── Ticket ────────────────────────────────────────────────────── */}
        <section
          className={cn(
            'relative mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_34px_-20px_rgba(7,63,61,0.4)]',
            enter,
            'motion-safe:slide-in-from-bottom-6 motion-safe:duration-700 motion-safe:delay-[600ms]'
          )}
        >
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mint">
              {photo?.image_url ? (
                <Image src={photo.image_url} alt={hotel.name ?? 'Hotel'} fill sizes="56px" className="object-cover" />
              ) : (
                <Hotel className="absolute inset-0 m-auto h-6 w-6 text-primary/40" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-heading text-base font-bold text-foreground sm:text-lg">{hotel.name}</h2>
              <p className="truncate text-sm text-muted-foreground">{[hotel.city, hotel.state].filter(Boolean).join(', ')}</p>
            </div>
          </div>

          {/* Check-in → nights → check-out */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-border bg-mint/30 px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Check-in</p>
              <p className="whitespace-nowrap font-heading text-base font-extrabold text-foreground">{shortDate(booking.check_in_date)}</p>
              {hotel.check_in_from_time && <p className="text-xs text-muted-foreground">From {hotel.check_in_from_time}</p>}
            </div>
            <span className="whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
              {plural(nights, 'night', 'nights')}
            </span>
            <div className="min-w-0 text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Check-out</p>
              <p className="whitespace-nowrap font-heading text-base font-extrabold text-foreground">{shortDate(booking.check_out_date)}</p>
              {hotel.check_out_time && <p className="text-xs text-muted-foreground">Until {hotel.check_out_time}</p>}
            </div>
          </div>

          <dl className="divide-y divide-border/70 px-4 sm:px-5">
            <Row label={group.length > 1 || (Number(booking.num_rooms) || 1) > 1 ? 'Rooms' : 'Room'}>
              {group.map((b) => (
                <span key={b.id} className="block">
                  {b.room_type?.name ?? 'Room'} <span className="text-muted-foreground">× {b.num_rooms || 1}</span>
                </span>
              ))}
            </Row>
            <Row label="Guests">{guestsLabel}</Row>
            <Row label="Booking ID">
              <span className="font-semibold tracking-wide">{booking.booking_reference}</span>
            </Row>
            {group.length === 1 && booking.invoice_number && (
              <Row label="Invoice no.">
                <span className="font-semibold tracking-wide">{booking.invoice_number}</span>
              </Row>
            )}
            {booking.gst_number && (
              <Row label="GST invoice">
                {booking.gst_company_name}
                <span className="block font-mono text-xs text-muted-foreground">{booking.gst_number}</span>
              </Row>
            )}
          </dl>

          {/* Perforation: a dashed line with notches, like a ticket stub */}
          <div className="relative mt-1" aria-hidden="true">
            <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-border bg-background" />
            <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-border bg-background" />
            <div className="mx-5 border-t-2 border-dashed border-border" />
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div>
              <p className="text-sm text-muted-foreground">Total paid</p>
              <p className="font-heading text-2xl font-extrabold text-foreground">{formatRupees(totalPaid)}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-primary">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Paid
            </span>
          </div>
        </section>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className={cn('mt-6 flex flex-col gap-3 sm:flex-row', enter, 'motion-safe:delay-[800ms]')}>
          {invoiceable.length === 1 && (
            <Button asChild className="h-12 flex-1 rounded-full font-bold">
              <a href={invoiceUrl(invoiceable[0].booking_reference)} download>
                <Download className="h-4 w-4" />
                Download invoice
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="h-12 flex-1 rounded-full font-semibold">
            <Link href={manageHref}>{isGuestCheckout ? 'Sign in to manage' : 'View booking'}</Link>
          </Button>
        </div>
        {invoiceable.length > 1 && (
          <p className={cn('mt-3 text-center text-sm', enter, 'motion-safe:delay-[800ms]')}>
            {invoiceable.map((b, i) => (
              <span key={b.id}>
                {i > 0 && <span className="mx-2 text-border">|</span>}
                <a href={invoiceUrl(b.booking_reference)} download className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  <Download className="h-3.5 w-3.5" />
                  Invoice: {b.room_type?.name ?? b.booking_reference}
                </a>
              </span>
            ))}
          </p>
        )}

        {isHotelCancellationPolicy(booking.cancellation_policy) && <div className="mt-8 text-left"><CancellationPolicyNotice policy={booking.cancellation_policy} /></div>}

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        <div className={cn('mt-8 space-y-2 text-center text-sm text-muted-foreground', enter, 'motion-safe:delay-[900ms]')}>
          <p>
            {isHotelCancellationPolicy(booking.cancellation_policy) ? null : deadline.passed ? (
              <>Check-in is within {FREE_CANCELLATION_HOURS} hours, so cancelling now isn&apos;t refunded.</>
            ) : (
              <>
                Cancel by <span className="font-medium text-foreground">{deadline.label}</span> for a refund, minus the{' '}
                {EFFECTIVE_GATEWAY_FEE_PERCENT.toFixed(2)}% payment gateway fee.
              </>
            )}{' '}
            <Link href="/refund-policy" className="font-medium text-primary hover:underline">
              Policy
            </Link>
          </p>
          {isGuestCheckout && (
            <p>
              Sign in with <span className="font-medium text-foreground">{formatPhone(booking.guest_phone ?? '')}</span> any time to see or
              cancel this booking.
            </p>
          )}
          <p className="pt-4">
            <Link href="/hotels" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Browse more stays
              <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
