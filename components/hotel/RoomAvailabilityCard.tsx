'use client'

/**
 * RoomAvailabilityCard — beside the hotel page photos: room types as large full-photo cards
 * (name, nightly price incl. taxes, capacity and availability for the searched dates over the
 * room photo). Desktop stacks two beside the gallery; phones swipe through all of them.
 * "Select" jumps to that room in the rooms list. StayDatesPicker and StayGuestsPicker above them
 * set the dates and the party; prices are for the rooms that party needs (lib/utils/occupancy.ts).
 */
import Image from 'next/image'
import { ArrowRight, BedDouble, Users } from '@/components/icons'
import { cn, formatCurrency } from '@/lib/utils'
import { partyNightlyPrice, roomsForParty, type Party } from '@/lib/utils/occupancy'
import { StayDatesPicker } from './StayDatesPicker'
import { StayGuestsPicker } from './StayGuestsPicker'

export interface AvailabilityRoom {
  id: string
  name: string
  base_price: number
  /** Price for the searched dates (weekend/festival pricing), when dates are known */
  current_price?: number
  max_occupancy: number
  max_adults?: number
  max_children?: number
  standard_occupancy?: number
  extra_bed_price?: number
  child_price?: number | null
  num_available_rooms: number
  status: string
  room_type_images?: Array<{ image_url: string; alt_text?: string }>
}

/** Big cards shown beside the gallery on desktop; the rest are one click away */
const DESKTOP_CARDS = 2

/** The label is white text on the photo; the dot carries the colour */
function availability(room: AvailabilityRoom, party: Party) {
  if (room.status !== 'available' || room.num_available_rooms === 0) {
    return { label: 'Sold out', soldOut: true, dot: 'bg-white/60' }
  }
  if (roomsForParty(room, party).error) {
    return { label: 'Not for your group', soldOut: true, dot: 'bg-white/60' }
  }
  if (room.num_available_rooms <= 3) {
    return { label: `Only ${room.num_available_rooms} left`, soldOut: false, dot: 'bg-red-500' }
  }
  return { label: 'Available', soldOut: false, dot: 'bg-emerald-400' }
}

interface RoomAvailabilityCardProps {
  rooms: AvailabilityRoom[]
  /** The guests and rooms picked up front */
  party: Party
  /** e.g. "Sat 17 Oct – Sun 18 Oct · 2 guests"; undefined when no dates were searched */
  stayLabel?: string
  onSelectRoom: (roomId: string) => void
  onViewAll: () => void
  className?: string
}

/** A picker as a row of the shared box: no border of its own */
const PICKER_ROW = 'rounded-none border-0 py-2.5 hover:bg-mint/40'

export function RoomAvailabilityCard({ rooms, party, stayLabel, onSelectRoom, onViewAll, className }: RoomAvailabilityCardProps) {
  const openCount = rooms.filter((room) => !availability(room, party).soldOut).length
  const hiddenOnDesktop = Math.max(rooms.length - DESKTOP_CARDS, 0)

  return (
    <section aria-label="Room availability" className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold leading-tight text-foreground">Availability</h2>
          <p className="text-xs text-muted-foreground">
            {stayLabel ? 'Prices for your dates and group' : 'Nightly prices for your group'}
          </p>
        </div>
        {/* Plain bold text, no pill (by request) */}
        <span className="shrink-0 text-xs font-bold text-primary">
          {openCount} of {rooms.length} available
        </span>
      </div>

      {/* Dates and guests as two rows of one box. Picking dates reloads the prices and availability
          below; the party sets the rooms each type needs */}
      <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
        <StayDatesPicker className={PICKER_ROW} />
        <StayGuestsPicker className={PICKER_ROW} />
      </div>

      {/* Phones: swipe sideways; desktop: big cards stacked to the gallery's height */}
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:flex-1 lg:snap-none lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {rooms.map((room, index) => {
          const status = availability(room, party)
          const photo = room.room_type_images?.[0]
          const roomsNeeded = roomsForParty(room, party).rooms
          const price = partyNightlyPrice(room, roomsNeeded, party)
          return (
            <article
              key={room.id}
              className={cn(
                'group relative isolate flex h-56 w-[85%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl bg-secondary p-4 text-white',
                'sm:w-[60%] lg:h-auto lg:min-h-[200px] lg:w-auto lg:flex-1',
                index >= DESKTOP_CARDS && 'lg:hidden'
              )}
            >
              {photo ? (
                <Image
                  src={photo.image_url}
                  alt={photo.alt_text || room.name}
                  fill
                  sizes="(min-width: 1024px) 380px, 85vw"
                  className={cn(
                    '-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105',
                    status.soldOut && 'grayscale'
                  )}
                />
              ) : (
                <div className="absolute inset-0 -z-10 flex items-center justify-center bg-linear-to-br from-primary to-secondary">
                  <BedDouble className="h-12 w-12 text-white/25" />
                </div>
              )}
              {/* Legibility: dark at the bottom for the details, light at the top for the chips */}
              <div className="absolute inset-0 -z-10 bg-linear-to-t from-secondary via-secondary/45 to-transparent" />
              <div className="absolute inset-x-0 top-0 -z-10 h-20 bg-linear-to-b from-black/35 to-transparent" />

              {/* Top: availability + capacity, straight on the photo (no pills, by request) */}
              <div className="flex items-start justify-between gap-2 text-xs font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full ring-2 ring-white/80', status.dot)} />
                  {status.label}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                  Up to {room.max_occupancy} guests
                </span>
              </div>

              {/* Bottom: name, price, select */}
              <div>
                <h3 className="text-xl font-extrabold leading-tight tracking-tight text-balance">{room.name}</h3>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="leading-tight">
                    <span className="font-heading text-2xl font-extrabold">{formatCurrency(price.total)}</span>
                    <span className="ml-1 text-xs text-white/75">/ night</span>
                    <span className="block text-[10px] text-white/65">
                      {roomsNeeded} {roomsNeeded === 1 ? 'room' : 'rooms'} · incl. taxes &amp; fees
                    </span>
                  </p>
                  <button
                    type="button"
                    disabled={status.soldOut}
                    onClick={() => onSelectRoom(room.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-muted-foreground"
                  >
                    {status.soldOut ? (status.label === 'Sold out' ? 'Sold out' : 'Not available') : 'Select'}
                    {!status.soldOut && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {hiddenOnDesktop > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="hidden items-center justify-center gap-1.5 rounded-full border border-border bg-card py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary/30 hover:bg-mint/50 lg:flex"
        >
          View all {rooms.length} room types
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  )
}
