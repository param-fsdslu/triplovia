'use client'

/**
 * SavedStaysList — on My Bookings: rooms the guest added to a booking but hasn't paid for,
 * kept on their account (lib/actions/saved-stays.ts) so they show up on any device after
 * signing in with the same mobile number. "Continue booking" goes straight to the review page
 * when the saved dates are still ahead, otherwise to the hotel page to pick new dates.
 */
import { useState, useTransition } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ArrowRight, BedDouble, Calendar, Hotel, MapPin, Trash2 } from '@/components/icons'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { removeSavedStay, type SavedStaySummary } from '@/lib/actions/saved-stays'
import { formatCurrency } from '@/lib/utils'

function continueHref(stay: SavedStaySummary, today: string) {
  if (!stay.checkIn || !stay.checkOut || stay.checkIn < today) return `/hotels/${stay.slug}`
  const params = new URLSearchParams({
    rooms: stay.rooms.map((r) => `${r.roomId}:${r.qty}`).join(','),
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: String(stay.adults),
  })
  if (stay.children) params.set('children', String(stay.children))
  if (stay.pets) params.set('pets', '1')
  return `/hotels/${stay.slug}/book?${params.toString()}`
}

const day = (value: string) => format(new Date(`${value}T00:00:00`), 'EEE d MMM')

export function SavedStaysList({ stays: initialStays }: { stays: SavedStaySummary[] }) {
  const [stays, setStays] = useState(initialStays)
  const [removing, startRemoving] = useTransition()
  const today = format(new Date(), 'yyyy-MM-dd')

  if (stays.length === 0) return null

  const remove = (hotelId: string) =>
    startRemoving(async () => {
      const result = await removeSavedStay(hotelId)
      if (result.success) setStays((prev) => prev.filter((s) => s.hotelId !== hotelId))
    })

  return (
    <section aria-labelledby="saved-stays-heading" className="mb-10">
      <div className="mb-4">
        <h2 id="saved-stays-heading" className="text-lg font-bold text-foreground">
          Saved stays
        </h2>
        <p className="text-sm text-muted-foreground">Rooms you picked but haven't paid for yet.</p>
      </div>

      <div className="flex flex-col gap-4">
        {stays.map((stay) => {
          const datesAhead = !!stay.checkIn && !!stay.checkOut && stay.checkIn >= today
          const guests = stay.adults + stay.children
          const roomCount = stay.rooms.reduce((sum, r) => sum + r.qty, 0)

          return (
            <article
              key={stay.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_16px_rgba(16,127,120,0.08)] sm:flex-row"
            >
              <div className="relative h-36 shrink-0 bg-mint sm:h-auto sm:w-44">
                {stay.imageUrl ? (
                  <Image src={stay.imageUrl} alt={stay.hotelName} fill sizes="(min-width: 640px) 176px, 100vw" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-primary/40">
                    <Hotel className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-[15px] font-bold text-foreground">{stay.hotelName}</h3>
                    {stay.city && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {stay.city}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-heading text-[15px] font-bold text-foreground">{formatCurrency(stay.nightlyPrice)}</p>
                    <p className="text-[10px] text-muted-foreground">per night · incl. taxes</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <p className="flex items-start gap-1.5">
                    <BedDouble className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>
                      {roomCount} {roomCount === 1 ? 'room' : 'rooms'}:{' '}
                      {stay.roomLines.map((r) => `${r.name} × ${r.qty}`).join(', ')}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {datesAhead
                      ? `${day(stay.checkIn!)} → ${day(stay.checkOut!)} · ${guests} ${guests === 1 ? 'guest' : 'guests'}${stay.pets ? ' · with pets' : ''}`
                      : stay.checkIn
                        ? 'Those dates have passed. Pick new ones.'
                        : 'No dates picked yet'}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removing}
                    onClick={() => remove(stay.hotelId)}
                    className="gap-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                  <Button asChild size="sm" className="gap-1.5 rounded-full px-4 font-semibold shadow-none">
                    <Link href={continueHref(stay, today)}>
                      {datesAhead ? 'Continue booking' : 'Pick dates'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
