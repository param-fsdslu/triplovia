'use client'

/**
 * Stay dates on the hotel page (top of RoomAvailabilityCard): one range calendar for check-in →
 * check-out, from today to getMaxBookableDate() (MAX_BOOKING_MONTHS_AHEAD months ahead). The
 * dates go into useSearchStore only once both are picked, so prices and availability reload
 * once (useHotelBySlug keeps the page on screen meanwhile).
 */
import { useEffect, useState } from 'react'
import { differenceInCalendarDays, format, startOfToday } from 'date-fns'
import { CalendarDays } from '@/components/icons'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSearchStore } from '@/lib/stores/use-search-store'
import { cn, getMaxBookableDate, MAX_BOOKING_MONTHS_AHEAD } from '@/lib/utils'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function StayDatesPicker({ className }: { className?: string }) {
  const checkIn = useSearchStore((s) => s.checkIn)
  const checkOut = useSearchStore((s) => s.checkOut)
  const setDateRange = useSearchStore((s) => s.setDateRange)
  const [open, setOpen] = useState(false)
  // The range being picked; the store keeps the last complete one
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({})
  const [months, setMonths] = useState(1)

  useEffect(() => {
    setMonths(window.matchMedia('(min-width: 768px)').matches ? 2 : 1)
  }, [])

  const onOpenChange = (next: boolean) => {
    if (next) setDraft({ from: checkIn, to: checkOut })
    setOpen(next)
  }

  const pick = (day: Date) => {
    // First click (or one on/before check-in) starts a new range; the next one ends it
    if (!draft.from || draft.to || day <= draft.from) {
      setDraft({ from: day })
      return
    }
    setDraft({ from: draft.from, to: day })
    setDateRange(draft.from, day)
    setOpen(false)
  }

  const hasDates = !!checkIn && !!checkOut
  const nights = hasDates ? differenceInCalendarDays(checkOut, checkIn) : 0
  const draftNights = draft.from && draft.to ? differenceInCalendarDays(draft.to, draft.from) : 0

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] leading-tight text-muted-foreground">
              {hasDates ? plural(nights, 'night') : 'Check-in – Check-out'}
            </span>
            <span className="block truncate text-sm font-semibold text-foreground">
              {hasDates ? `${format(checkIn, 'EEE d MMM')} – ${format(checkOut, 'EEE d MMM')}` : 'Select dates for exact prices'}
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">{hasDates ? 'Change' : 'Add dates'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {!draft.from || draft.to ? 'Select your check-in date' : 'Now select your check-out date'}
          </p>
          {draftNights > 0 && (
            <span className="text-xs font-medium text-muted-foreground">{plural(draftNights, 'night')}</span>
          )}
        </div>
        <Calendar
          mode="range"
          selected={{ from: draft.from, to: draft.to }}
          onSelect={(_range, day) => pick(day)}
          numberOfMonths={months}
          defaultMonth={draft.from ?? checkIn}
          disabled={(date) => date < startOfToday() || date > getMaxBookableDate()}
          toDate={getMaxBookableDate()}
          initialFocus
        />
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Stays can be booked up to {MAX_BOOKING_MONTHS_AHEAD} months ahead.
        </p>
      </PopoverContent>
    </Popover>
  )
}
