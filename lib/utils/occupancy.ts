/**
 * Room occupancy, MakeMyTrip-style: the guests and rooms are picked up front (search box, or the
 * hotel page's StayGuestsPicker) and each room type works out how many of its rooms the party
 * needs (roomsForParty) and what that costs a night with extra beds (partyNightlyPrice). The
 * review page shows that stay as it is; the booking APIs check occupancyError again.
 *
 * Limits come from room_types.max_adults / max_children / max_occupancy. A room with
 * max_children 0 (the default, often left unset) still takes children in its adult places.
 */
import { calculateGuestCharges, getInclusivePrice } from '@/lib/utils'

export interface OccupancyRoom {
  name?: string
  max_adults?: number | null
  max_children?: number | null
  max_occupancy?: number | null
}

export interface RoomGuests {
  adults: number
  children: number
}

/** The guests and rooms picked up front */
export interface Party extends RoomGuests {
  rooms: number
  /** One per child when picked in the guests picker (null = not yet, priced as 6–11) */
  childAges?: Array<number | null>
}

export function occupancyLimits(room: OccupancyRoom, qty: number) {
  const maxTotal = Math.max(1, Number(room.max_occupancy) || Number(room.max_adults) || 2)
  const adults = Math.min(Number(room.max_adults) || maxTotal, maxTotal)
  const childPlaces = Number(room.max_children) || 0
  // No child places of its own: children take adult places
  const total = childPlaces > 0 ? maxTotal : adults
  const children = childPlaces > 0 ? Math.min(childPlaces, total) : total
  return { adults: adults * qty, children: children * qty, total: total * qty }
}

/** Keeps a room type's guests within what its rooms take (at least one adult) */
export function fitGuests(room: OccupancyRoom, qty: number, guests: RoomGuests): RoomGuests {
  const limits = occupancyLimits(room, qty)
  const adults = Math.min(Math.max(1, Math.floor(guests.adults) || 1), limits.adults)
  const children = Math.max(0, Math.min(Math.floor(guests.children) || 0, limits.children, limits.total - adults))
  return { adults, children }
}

/** Shares the guests across several room types (older links with more than one): one adult each, then in order */
export function splitGuests(
  selections: Array<{ room: OccupancyRoom; qty: number }>,
  adults: number,
  children: number
): RoomGuests[] {
  const split = selections.map(() => ({ adults: 1, children: 0 }))
  let adultsLeft = Math.max(0, adults - selections.length)
  let childrenLeft = Math.max(0, children)
  selections.forEach(({ room, qty }, i) => {
    const limits = occupancyLimits(room, qty)
    const moreAdults = Math.max(0, Math.min(adultsLeft, limits.adults - split[i].adults, limits.total - split[i].adults))
    split[i].adults += moreAdults
    adultsLeft -= moreAdults
  })
  selections.forEach(({ room, qty }, i) => {
    const limits = occupancyLimits(room, qty)
    const kids = Math.max(0, Math.min(childrenLeft, limits.children, limits.total - split[i].adults))
    split[i].children = kids
    childrenLeft -= kids
  })
  return split
}

/** Why these guests don't fit the room type, or null when they do */
export function occupancyError(room: OccupancyRoom, qty: number, guests: RoomGuests): string | null {
  const limits = occupancyLimits(room, qty)
  const name = room.name || 'this room'
  const rooms = `${qty} ${name} ${qty === 1 ? 'room takes' : 'rooms take'}`
  if (!Number.isInteger(guests.adults) || guests.adults < 1) return `Add at least one adult for ${name}`
  if (!Number.isInteger(guests.children) || guests.children < 0) return `Invalid number of children for ${name}`
  if (guests.adults > limits.adults) return `${rooms} up to ${limits.adults} ${limits.adults === 1 ? 'adult' : 'adults'}`
  if (guests.children > limits.children) return `${rooms} up to ${limits.children} children`
  if (guests.adults + guests.children > limits.total) return `${rooms} up to ${limits.total} guests`
  return null
}

/**
 * How many rooms of this type the party needs: the fewest that fit everyone, never fewer than the
 * rooms searched. `error` says why the party can't book this type (not enough rooms left, or more
 * rooms than adults, since every room needs one).
 */
export function roomsForParty(
  room: OccupancyRoom & { num_available_rooms?: number | null },
  party: Party
): { rooms: number; error?: string } {
  const perRoom = occupancyLimits(room, 1)
  const adults = Math.max(1, party.adults)
  const children = Math.max(0, party.children)
  const rooms = Math.max(
    1,
    party.rooms || 1,
    Math.ceil(adults / perRoom.adults),
    Math.ceil(children / perRoom.children),
    Math.ceil((adults + children) / perRoom.total)
  )
  if (rooms > adults) return { rooms, error: `Needs ${rooms} rooms: add an adult for each room` }
  const left = room.num_available_rooms
  if (left != null && rooms > left) {
    return { rooms, error: left <= 0 ? 'Sold out' : `Only ${left} left: your group needs ${rooms}` }
  }
  return { rooms }
}

export interface PricedRoom extends OccupancyRoom {
  base_price: number
  /** Nightly price for the chosen dates (weekend/festival pricing), when known */
  current_price?: number
  standard_occupancy?: number | null
  extra_bed_price?: number | null
  child_price?: number | null
}

/**
 * A night of the party's stay in this room type: the rooms incl. taxes & fees, plus the extra-guest
 * charges (extra beds for adults beyond the included ones, the child price for children aged 6–11,
 * by the ages picked in the guests picker; an unknown age counts as 6–11), as the review page charges them.
 */
export function partyNightlyPrice(room: PricedRoom, rooms: number, party: RoomGuests & { childAges?: Array<number | null> }) {
  const roomsPrice = getInclusivePrice(room.current_price ?? room.base_price) * rooms
  const charges = calculateGuestCharges(
    {
      qty: rooms,
      standardOccupancy: Number(room.standard_occupancy) || Number(room.max_occupancy) || 2,
      extraBedPrice: Number(room.extra_bed_price) || 0,
      childPrice: room.child_price,
    },
    party.adults,
    Array.from({ length: Math.max(0, party.children) }, (_, i) => party.childAges?.[i] ?? null),
    1
  )
  return {
    roomsPrice,
    extraBeds: charges.total,
    extraGuests: charges.extraAdults + charges.extraChildren,
    total: roomsPrice + charges.total,
  }
}

/** "2,6" (the `ages` URL param) → one age per child: 1–11, or null where it's missing */
export function parseChildAges(value: string | null | undefined, children: number): Array<number | null> {
  const parts = (value ?? '').split(',')
  return Array.from({ length: Math.max(0, children) }, (_, i) => {
    const age = Number(parts[i])
    return parts[i] && Number.isInteger(age) && age >= 1 && age <= 11 ? age : null
  })
}

/** One age per child → "2,6" for the URL (a missing one stays empty, "2,"); undefined when none is known */
export function childAgesParam(ages: Array<number | null> | undefined): string | undefined {
  return ages?.some((age) => age != null) ? ages.map((age) => (age == null ? '' : String(age))).join(',') : undefined
}
