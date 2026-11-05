/**
 * ReviewRoomCard — a picked room type on the review page, read-only (MakeMyTrip-style): its details
 * and the rooms and guests it was booked with on the hotel page, where the rooms needed for the
 * party were worked out (lib/utils/occupancy.ts), with the children's ages from the guests picker.
 * "Back to hotel" above the page changes them; an age that never came is priced as 6–11, and said so.
 */
import { BedDouble, Users } from '@/components/icons'
import { occupancyLimits, type RoomGuests } from '@/lib/utils/occupancy'

export interface ReviewRoom {
  id: string
  name: string
  base_price: number
  max_adults: number
  max_children: number
  max_occupancy: number
  bed_configuration?: string
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function ReviewRoomCard({
  room,
  qty,
  guests,
  childAges = [],
}: {
  room: ReviewRoom
  qty: number
  guests: RoomGuests
  /** This room type's children's ages (null = not given) */
  childAges?: Array<number | null>
}) {
  const perRoom = occupancyLimits(room, 1)
  const knownAges = childAges.filter((age): age is number => age != null)
  const agesMissing = guests.children > 0 && knownAges.length < guests.children

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <p className="truncate text-sm font-semibold text-foreground">{room.name}</p>
      <p className="text-xs text-muted-foreground">
        ₹{room.base_price.toLocaleString('en-IN')}/night · up to {plural(perRoom.total, 'guest')} per room
        {room.bed_configuration ? ` · ${room.bed_configuration}` : ''}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-foreground">
        <span className="flex items-center gap-1.5">
          <BedDouble className="h-4 w-4 text-primary" />
          {plural(qty, 'room')}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" />
          {plural(guests.adults, 'adult')}
          {guests.children > 0 ? ` · ${plural(guests.children, 'child', 'children')}` : ''}
          {knownAges.length > 0 && (
            <span className="font-normal text-muted-foreground">({knownAges.join(', ')} yrs)</span>
          )}
        </span>
      </p>
      {agesMissing && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Children&apos;s ages weren&apos;t given, so they&apos;re priced at the 6–11 rate. Change them on the hotel page.
        </p>
      )}
    </div>
  )
}
