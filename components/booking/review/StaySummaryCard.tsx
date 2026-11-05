'use client'

/**
 * StaySummaryCard — top of the "Review your booking" page (MakeMyTrip-style): hotel photo,
 * name and address, then one row with check-in → nights → check-out (each opens a date picker)
 * and the guests summary. Room details and guest/room selectors go in as children.
 * The price lives only in PriceBreakupCard on the right, so nothing here repeats it.
 */
import type { ReactNode } from 'react'
import Image from 'next/image'
import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns'
import { CalendarDays, Hotel, MapPin, Star, Users } from '@/components/icons'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, getMaxBookableDate } from '@/lib/utils'

export interface StaySummaryHotel {
  name: string
  address_line_1?: string
  city: string
  state: string
  star_rating?: number | null
  image_url?: string | null
  check_in_from_time?: string
  check_out_time?: string
}

interface StaySummaryCardProps {
  hotel: StaySummaryHotel
  checkIn?: Date
  checkOut?: Date
  onCheckInChange: (date: Date | undefined) => void
  onCheckOutChange: (date: Date | undefined) => void
  /** e.g. "2 Adults · 1 Child · 1 Room" */
  guestsLabel: string
  /** Dates can't change once the booking has been created (payment step) */
  locked?: boolean
  children?: ReactNode
}

function DateTile({
  label,
  date,
  time,
  align = 'left',
  locked,
  calendar,
}: {
  label: string
  date?: Date
  time?: string
  align?: 'left' | 'right'
  locked?: boolean
  calendar: ReactNode
}) {
  const body = (
    <>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      {date ? (
        <span className="mt-0.5 block whitespace-nowrap font-heading text-foreground">
          <span className="text-base font-extrabold sm:text-lg">{format(date, 'EEE, d MMM')}</span>
          <span className="hidden text-sm font-bold text-muted-foreground sm:inline"> {format(date, "''yy")}</span>
        </span>
      ) : (
        <span className="mt-0.5 block text-base font-bold text-primary">Add date</span>
      )}
      {time && <span className="block text-xs text-muted-foreground">{label === 'Check-in' ? `From ${time}` : `Until ${time}`}</span>}
    </>
  )

  const classes = cn('min-w-0 rounded-lg px-2 py-1.5 -mx-2 text-left', align === 'right' && 'text-right')
  if (locked) return <div className={classes}>{body}</div>

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn(classes, 'transition-colors hover:bg-mint/60 data-[state=open]:bg-mint')}>
          {body}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align === 'right' ? 'end' : 'start'}>
        {calendar}
      </PopoverContent>
    </Popover>
  )
}

export function StaySummaryCard({
  hotel,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  guestsLabel,
  locked,
  children,
}: StaySummaryCardProps) {
  const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0
  const address = [hotel.address_line_1, hotel.city, hotel.state].filter(Boolean).join(', ')

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Hotel */}
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-mint sm:h-24 sm:w-32">
          {hotel.image_url ? (
            <Image src={hotel.image_url} alt={hotel.name} fill sizes="128px" className="object-cover" />
          ) : (
            <Hotel className="absolute inset-0 m-auto h-8 w-8 text-primary/40" />
          )}
        </div>
        <div className="min-w-0">
          {!!hotel.star_rating && (
            <span className="mb-1 inline-flex items-center gap-0.5" aria-label={`${hotel.star_rating} star property`}>
              {Array.from({ length: hotel.star_rating }, (_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
              ))}
            </span>
          )}
          <h2 className="font-heading text-lg font-bold leading-snug text-foreground sm:text-xl">{hotel.name}</h2>
          {address && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{address}</span>
            </p>
          )}
        </div>
      </div>

      {/* Check-in → nights → check-out | guests */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-y border-border bg-mint/30 px-4 py-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:gap-4 sm:px-5">
        <DateTile
          label="Check-in"
          date={checkIn}
          time={hotel.check_in_from_time}
          locked={locked}
          calendar={
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={onCheckInChange}
              disabled={(date) => date < startOfDay(new Date()) || date > getMaxBookableDate()}
              toDate={getMaxBookableDate()}
              initialFocus
            />
          }
        />
        <span className="flex flex-col items-center gap-1">
          <span className="whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
            {nights > 0 ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : '— nights'}
          </span>
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
        </span>
        <DateTile
          label="Check-out"
          date={checkOut}
          time={hotel.check_out_time}
          align="right"
          locked={locked}
          calendar={
            <Calendar
              mode="single"
              selected={checkOut}
              onSelect={onCheckOutChange}
              disabled={(date) => date < (checkIn ? addDays(checkIn, 1) : new Date()) || date > getMaxBookableDate()}
              toDate={getMaxBookableDate()}
              initialFocus
            />
          }
        />
        <div className="col-span-3 flex items-center gap-2 border-t border-border pt-2.5 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <Users className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-semibold text-foreground sm:max-w-[9rem]">{guestsLabel}</span>
        </div>
      </div>

      {children && <div className="space-y-4 p-4 sm:p-5">{children}</div>}
    </section>
  )
}
