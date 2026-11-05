'use client'

/**
 * The hotel admin dashboard's booking calendar: a month of weeks (Monday first) with each stay
 * as a bar from check-in through its last night, coloured by booking status: the guest in bold,
 * then room type ×rooms · check-in time · dates, and the whole stay in a hover card. A bar opens
 * the booking; a day with more stays than fit shows "+N more" with the full list. Each month
 * loads on demand through `load` (getBookingCalendar: only the admin's own hotels).
 *
 * The month is picked after mount, so "today" is the admin's own day, not the server's.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2 } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getBookingCalendar, type CalendarBooking } from '@/lib/actions/admin'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { cn } from '@/lib/utils'
import { statusColor } from './status-colors'

export type CalendarLoader = (range: {
  from: string
  to: string
  hotelId?: string
  includeCancelled?: boolean
}) => Promise<{ success: boolean; bookings: CalendarBooking[]; error?: string }>

/** The legend's statuses, in order */
const LEGEND: [status: string, label: string][] = [
  ['confirmed', 'Confirmed'],
  ['pending', 'Pending'],
  ['checked_in', 'Checked in'],
  ['checked_out', 'Checked out'],
  ['cancelled', 'Cancelled'],
]
const LABELS = Object.fromEntries(LEGEND)

/**
 * A bar's look by booking status (status-colors.ts, shared with StatusPill): a solid fill with
 * white text and a darker left edge where the stay starts (the edge width is set on the bar)
 */
const styleOf = (status: string) => {
  const color = statusColor(status)
  return {
    bar: cn(
      color.fill,
      color.hover,
      color.edge,
      'text-white',
      status === 'cancelled' && 'line-through decoration-white/70'
    ),
    dot: color.dot,
    label: LABELS[status] ?? status.replace(/_/g, ' '),
  }
}

/** Booking rows that fit in a week before "+N more" */
const MAX_LANES = 3

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')
/** 'YYYY-MM-DD' as a local date (no timezone shift) */
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
/** The stay's last night: the day before check-out (check-in itself for a same-day booking) */
const lastNight = (b: CalendarBooking) =>
  b.check_out_date > b.check_in_date ? dayKey(addDays(parseDay(b.check_out_date), -1)) : b.check_in_date
const guestName = (b: CalendarBooking) =>
  [b.guest_first_name, b.guest_last_name].filter(Boolean).join(' ') || b.booking_reference
const rooms = (b: CalendarBooking) => b.num_rooms || 1
/** "14:00" from a time column ("14:00:00") */
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null)
const stayDates = (b: CalendarBooking) =>
  `${format(parseDay(b.check_in_date), 'd MMM')} → ${format(parseDay(b.check_out_date), 'd MMM')}`
/** "Deluxe Double Room ×2" */
const roomLabel = (b: CalendarBooking) =>
  [b.room_type?.name || 'Room', rooms(b) > 1 ? `×${rooms(b)}` : null].filter(Boolean).join(' ')
/** The bar's second line: room ×n · In 14:00 · dates */
const barDetails = (b: CalendarBooking) =>
  [roomLabel(b), hhmm(b.hotel?.check_in_from_time) && `In ${hhmm(b.hotel?.check_in_from_time)}`, stayDates(b)]
    .filter(Boolean)
    .join(' · ')
/** Hotel · room · dates */
const details = (b: CalendarBooking) => [b.hotel?.name, roomLabel(b), stayDates(b)].filter(Boolean).join(' · ')
const describe = (b: CalendarBooking) => `${guestName(b)} · ${details(b)}`
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const bookingHref = (b: CalendarBooking) => `${ADMIN_PATH}/bookings/${b.booking_reference}`
const nightsOf = (b: CalendarBooking) =>
  Math.max(1, Math.round((parseDay(b.check_out_date).getTime() - parseDay(b.check_in_date).getTime()) / 86_400_000))
const guestCount = (b: CalendarBooking) => (b.num_adults || 0) + (b.num_children || 0)
/** "Out 9 Nov · 11:00" */
const checkOutLabel = (b: CalendarBooking) => {
  const time = hhmm(b.hotel?.check_out_time)
  return `Out ${format(parseDay(b.check_out_date), 'd MMM')}${time ? ` · ${time}` : ''}`
}

/** The hover card on a bar: everything about the stay */
function StayDetails({ booking: b }: { booking: CalendarBooking }) {
  const checkIn = parseDay(b.check_in_date)
  const checkOut = parseDay(b.check_out_date)
  const nights = nightsOf(b)
  const inTime = hhmm(b.hotel?.check_in_from_time)
  const outTime = hhmm(b.hotel?.check_out_time)
  const guests = [
    b.num_adults ? plural(b.num_adults, 'adult') : null,
    b.num_children ? plural(b.num_children, 'child', 'children') : null,
  ].filter(Boolean)
  const rows: [string, string][] = [
    ['Room', `${b.room_type?.name || 'Room'} · ${plural(rooms(b), 'room')}`],
    ...(guests.length ? ([['Guests', guests.join(', ')]] as [string, string][]) : []),
    ['Check-in', `${format(checkIn, 'EEE, d MMM yyyy')}${inTime ? ` · from ${inTime}` : ''}`],
    ['Check-out', `${format(checkOut, 'EEE, d MMM yyyy')}${outTime ? ` · by ${outTime}` : ''}`],
    ['Nights', String(nights)],
    ['Status', `${styleOf(b.booking_status).label} · ${b.payment_status.replace(/_/g, ' ')}`],
    ['Ref', b.booking_reference],
  ]
  return (
    <div className="w-[260px] text-left">
      <p className="text-[13px] font-bold leading-tight">{guestName(b)}</p>
      {b.hotel?.name && <p className="mt-0.5 opacity-75">{b.hotel.name}</p>}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="opacity-65">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** A booking's piece of one week: columns start..end (0–6), its row, and whether it carries on */
interface Segment {
  booking: CalendarBooking
  start: number
  end: number
  lane: number
  fromBefore: boolean
  toAfter: boolean
}

function weekSegments(weekKeys: string[], bookings: CalendarBooking[]): Segment[] {
  const first = weekKeys[0]
  const last = weekKeys[6]
  const segments: Segment[] = []
  for (const booking of bookings) {
    const final = lastNight(booking)
    if (final < first || booking.check_in_date > last) continue
    segments.push({
      booking,
      start: weekKeys.indexOf(booking.check_in_date < first ? first : booking.check_in_date),
      end: weekKeys.indexOf(final > last ? last : final),
      lane: -1,
      fromBefore: booking.check_in_date < first,
      toAfter: final > last,
    })
  }
  // Earliest first, longer stays first on the same day, then the first row that is free
  segments.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
  const laneEnds: number[] = []
  for (const segment of segments) {
    let lane = laneEnds.findIndex((end) => end < segment.start)
    if (lane === -1) lane = laneEnds.push(segment.end) - 1
    else laneEnds[lane] = segment.end
    segment.lane = lane
  }
  return segments
}

function DayList({ day, bookings }: { day: Date; bookings: CalendarBooking[] }) {
  return (
    <div className="space-y-1">
      <p className="px-1 pb-1 text-xs font-semibold text-muted-foreground">{format(day, 'EEEE, d MMMM')}</p>
      {bookings.map((b) => (
        <Link
          key={b.id}
          href={bookingHref(b)}
          className="flex items-start gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-mint/60"
        >
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', styleOf(b.booking_status).dot)} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{guestName(b)}</span>
            <span className="block truncate text-xs text-muted-foreground">{details(b)}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}

interface BookingCalendarProps {
  /** The admin's hotels; a filter appears when there is more than one */
  hotels: { id: string; name: string }[]
  load?: CalendarLoader
}

export function BookingCalendar({ hotels, load = getBookingCalendar }: BookingCalendarProps) {
  const [month, setMonth] = useState<Date | null>(null)
  const [today, setToday] = useState('')
  const [hotelId, setHotelId] = useState('all')
  const [showCancelled, setShowCancelled] = useState(false)

  useEffect(() => {
    const now = new Date()
    setMonth(startOfMonth(now))
    setToday(dayKey(now))
  }, [])

  const grid = useMemo(() => {
    if (!month) return null
    const start = startOfWeek(month, { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })
    const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7))
    return { weeks, from: dayKey(start), to: dayKey(addDays(end, 1)), monthKey: format(month, 'yyyy-MM') }
  }, [month])

  const { data, isFetching, isError } = useQuery({
    queryKey: ['admin', 'booking-calendar', grid?.from, grid?.to, hotelId, showCancelled],
    queryFn: () =>
      load({
        from: grid!.from,
        to: grid!.to,
        hotelId: hotelId === 'all' ? undefined : hotelId,
        includeCancelled: showCancelled,
      }),
    enabled: grid !== null,
    placeholderData: keepPreviousData,
  })
  const bookings = useMemo(() => data?.bookings ?? [], [data])

  // Stays with at least one night in the shown month
  const monthCount = useMemo(() => {
    if (!month) return 0
    const first = dayKey(month)
    const last = dayKey(endOfMonth(month))
    return bookings.filter((b) => b.check_in_date <= last && lastNight(b) >= first).length
  }, [bookings, month])

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(7,63,61,0.06)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-heading text-[15px] font-semibold text-foreground">
            Booking Calendar
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {month ? `${monthCount} ${monthCount === 1 ? 'stay' : 'stays'} in ${format(month, 'MMMM yyyy')}` : ' '}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {hotels.length > 1 && (
            <Select value={hotelId} onValueChange={setHotelId}>
              <SelectTrigger size="sm" className="w-[190px] bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hotels</SelectItem>
                {hotels.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm text-muted-foreground">
            <Checkbox checked={showCancelled} onCheckedChange={(v) => setShowCancelled(v === true)} />
            Show cancelled
          </label>
          <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))} disabled={!month}>
            Today
          </Button>
          <div className="flex items-center rounded-full border border-border">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => month && setMonth(addMonths(month, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-l-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[124px] border-x border-border px-2 text-center text-sm font-semibold text-foreground">
              {month ? format(month, 'MMMM yyyy') : ' '}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => month && setMonth(addMonths(month, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-r-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {(isError || data?.success === false) && (
        <p className="border-b border-border bg-red-50 px-5 py-2 text-sm text-red-700">
          {data?.error || 'Failed to load bookings'}
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Weekdays (same columns and gaps as the day tiles) */}
          <div className="grid grid-cols-7 gap-x-1.5 border-b border-border bg-muted/60 px-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {!grid ? (
            <div className="flex h-[520px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1.5 p-3">
            {grid.weeks.map((week) => {
              const weekKeys = week.map(dayKey)
              const segments = weekSegments(weekKeys, bookings)
              const hidden = weekKeys.map((_, col) =>
                segments.filter((s) => s.lane >= MAX_LANES && s.start <= col && s.end >= col)
              )
              const hasOverflow = hidden.some((list) => list.length > 0)
              // Only the rows this week uses (a quiet week stays short)
              const rows = Math.max(1, Math.min(MAX_LANES, segments.reduce((most, s) => Math.max(most, s.lane + 1), 0)))

              return (
                <div
                  key={weekKeys[0]}
                  className="grid grid-cols-7 gap-x-1.5 gap-y-1"
                  style={{
                    // date, bar rows, "+N more" when needed, and a little room under the last bar
                    gridTemplateRows: `28px repeat(${rows}, 36px)${hasOverflow ? ' 18px' : ''} 2px`,
                  }}
                >
                  {/* Day tiles (behind the bars) */}
                  {week.map((day, col) => {
                    const k = weekKeys[col]
                    const inMonth = k.slice(0, 7) === grid.monthKey
                    return (
                      <div
                        key={k}
                        className={cn(
                          'rounded-lg border px-2 pt-1.5',
                          k === today
                            ? 'border-primary/40 bg-mint/50'
                            : inMonth
                              ? 'border-border bg-card'
                              : 'border-transparent bg-muted/50'
                        )}
                        style={{ gridColumn: col + 1, gridRow: '1 / -1' }}
                      >
                        <span
                          className={cn(
                            'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold',
                            k === today
                              ? 'bg-primary text-primary-foreground'
                              : inMonth
                                ? 'text-foreground'
                                : 'text-muted-foreground/60'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>
                    )
                  })}

                  {/* Stays */}
                  {segments
                    .filter((s) => s.lane < MAX_LANES)
                    .map((s) => (
                      <Tooltip key={`${s.booking.id}-${weekKeys[0]}`}>
                        <TooltipTrigger asChild>
                          <Link
                            href={bookingHref(s.booking)}
                            aria-label={describe(s.booking)}
                            className={cn(
                              '@container relative z-10 flex min-w-0 items-center gap-3 px-2 transition-colors',
                              styleOf(s.booking.booking_status).bar,
                              s.fromBefore ? 'rounded-l-none' : 'ml-1 rounded-l-md border-l-[3px]',
                              s.toAfter ? 'rounded-r-none' : 'mr-1 rounded-r-md'
                            )}
                            style={{ gridColumn: `${s.start + 1} / ${s.end + 2}`, gridRow: s.lane + 2 }}
                          >
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[12px] font-bold leading-tight">
                                {guestName(s.booking)}
                              </span>
                              <span className="truncate text-[10.5px] font-medium leading-tight opacity-90">
                                {barDetails(s.booking)}
                              </span>
                            </span>
                            {/* The far end of a longer bar: the stay's length and check-out, or an arrow if it carries on */}
                            {s.toAfter ? (
                              <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                            ) : (
                              s.end - s.start >= 1 && (
                                <span className="hidden shrink-0 flex-col items-end text-right @[260px]:flex">
                                  <span className="text-[11px] font-bold leading-tight">
                                    {plural(nightsOf(s.booking), 'night')}
                                    {guestCount(s.booking) > 0 && ` · ${plural(guestCount(s.booking), 'guest')}`}
                                  </span>
                                  <span className="text-[10.5px] font-medium leading-tight opacity-90">
                                    {checkOutLabel(s.booking)}
                                  </span>
                                </span>
                              )
                            )}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6} className="px-3 py-2.5">
                          <StayDetails booking={s.booking} />
                        </TooltipContent>
                      </Tooltip>
                    ))}

                  {/* "+N more" per day */}
                  {hidden.map((list, col) => {
                    if (list.length === 0) return null
                    const dayBookings = segments
                      .filter((s) => s.start <= col && s.end >= col)
                      .map((s) => s.booking)
                    return (
                      <Popover key={`more-${weekKeys[col]}`}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="relative z-10 mx-1 truncate rounded px-1 text-left text-[11px] font-semibold text-primary hover:bg-mint"
                            style={{ gridColumn: col + 1, gridRow: rows + 2 }}
                          >
                            +{list.length} more
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72 p-2">
                          <DayList day={week[col]} bookings={dayBookings} />
                        </PopoverContent>
                      </Popover>
                    )
                  })}
                </div>
              )
            })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-5 py-2.5">
        {LEGEND.filter(([status]) => showCancelled || status !== 'cancelled').map(([status, label]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-2.5 w-2.5 rounded-sm', statusColor(status).dot)} />
            {label}
          </span>
        ))}
      </footer>
    </section>
  )
}
