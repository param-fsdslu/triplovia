'use client'

/**
 * The guests pickers' "Good to know" notes (search/HotelSearchBox, hotel/StayGuestsPicker), kept
 * behind an (i) button beside "Who's travelling?" and shown in a small popup, by request.
 */
import { Info } from '@/components/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CONTACT } from '@/lib/config/contact'
import { CHILD_MAX_AGE, CHILD_PRICE_MIN_AGE } from '@/lib/utils'

export function GuestsGoodToKnow() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Good to know"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-mint data-[state=open]:bg-mint"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[calc(100vw-2rem)] p-3">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-secondary">
          <Info className="h-3.5 w-3.5 text-primary" />
          Good to know
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11.5px] leading-relaxed text-muted-foreground marker:text-primary/60">
          <li>Guests aged 12 and above count as adults.</li>
          <li>
            Children aged 1–{CHILD_PRICE_MIN_AGE - 1} stay free; {CHILD_PRICE_MIN_AGE}–{CHILD_MAX_AGE} pay the property&apos;s
            child rate.
          </li>
          <li>Pet rules (size, number, extra fees) vary by stay. Check the property&apos;s pet policy.</li>
          <li>Extra beds and child policies vary by stay. Check the property rules before booking.</li>
          <li>
            Booking more than 8 rooms or a large group? Call{' '}
            <a href={`tel:${CONTACT.phone}`} className="font-semibold text-primary hover:underline">
              {CONTACT.phoneDisplay}
            </a>
            .
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  )
}
