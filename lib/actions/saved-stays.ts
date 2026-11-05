'use server'

/**
 * Saved stays — the rooms a signed-in guest added to a booking on a hotel page (plus dates and
 * guests), kept on their account: one row per guest per hotel in `saved_stays`. Signing in again
 * with the same mobile number, on any device, brings the rooms back on the hotel page and lists
 * them under My Bookings. The row is removed once that hotel's booking is paid (api/payment/verify).
 */
import { createClient } from '@/lib/db/server'
import { getInclusivePrice } from '@/lib/utils'
import { serverLog } from '@/lib/utils/server-log'

export interface SavedStayRoom {
  roomId: string
  qty: number
}

export interface SavedStay {
  rooms: SavedStayRoom[]
  checkIn?: string
  checkOut?: string
  adults: number
  children: number
  pets: boolean
}

export interface SavedStayInput {
  hotelId: string
  rooms: SavedStayRoom[]
  /** yyyy-MM-dd */
  checkIn?: string
  checkOut?: string
  adults?: number
  children?: number
  pets?: boolean
}

export interface SavedStaySummary extends SavedStay {
  id: string
  hotelId: string
  hotelName: string
  slug: string
  city: string
  imageUrl: string | null
  roomLines: Array<{ roomId: string; name: string; qty: number }>
  /** Sum of the rooms' base nightly prices incl. taxes (dates may change the real price) */
  nightlyPrice: number
}

type Result = { success: true } | { success: false; error: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_ROOM_TYPES = 10
const MAX_QTY = 20

/** Drops malformed entries and merges duplicates, so a client can't store junk */
function cleanRooms(rooms: unknown): SavedStayRoom[] {
  if (!Array.isArray(rooms)) return []
  const merged = new Map<string, number>()
  for (const entry of rooms) {
    const roomId = typeof entry?.roomId === 'string' ? entry.roomId.trim() : ''
    const qty = Number(entry?.qty)
    if (!roomId || roomId.length > 64 || !Number.isInteger(qty) || qty < 1) continue
    merged.set(roomId, Math.min((merged.get(roomId) ?? 0) + qty, MAX_QTY))
  }
  return Array.from(merged, ([roomId, qty]) => ({ roomId, qty })).slice(0, MAX_ROOM_TYPES)
}

function cleanInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value)
  return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback
}

function cleanDate(value: unknown) {
  return typeof value === 'string' && DATE_RE.test(value) ? value : null
}

function toSavedStay(row: any): SavedStay {
  return {
    rooms: (Array.isArray(row.rooms) ? row.rooms : []).map((r: any) => ({ roomId: r.room_type_id, qty: r.qty })),
    checkIn: row.check_in_date ?? undefined,
    checkOut: row.check_out_date ?? undefined,
    adults: row.num_adults ?? 1,
    children: row.num_children ?? 0,
    pets: row.with_pets === true,
  }
}

async function signedIn() {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  return { db, user }
}

/** The signed-in guest's saved rooms for one hotel, or null */
export async function getSavedStay(hotelId: string): Promise<SavedStay | null> {
  const { db, user } = await signedIn()
  if (!user || typeof hotelId !== 'string' || !hotelId) return null

  const { data } = await db
    .from('saved_stays')
    .select('rooms, check_in_date, check_out_date, num_adults, num_children, with_pets')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle()
  return data ? toSavedStay(data) : null
}

/** Stores (or replaces) the guest's rooms for a hotel; an empty list removes the saved stay */
export async function saveStay(input: SavedStayInput): Promise<Result> {
  const { db, user } = await signedIn()
  if (!user) return { success: false, error: 'Please sign in to save your rooms' }
  const hotelId = typeof input?.hotelId === 'string' ? input.hotelId : ''
  if (!hotelId) return { success: false, error: 'Missing hotel' }

  const rooms = cleanRooms(input.rooms)
  if (rooms.length === 0) return removeSavedStay(hotelId)

  // Keep only room types that really belong to this hotel
  const { data: roomTypes, error: roomsError } = await db
    .from('room_types')
    .select('id')
    .eq('hotel_id', hotelId)
    .in(
      'id',
      rooms.map((r) => r.roomId)
    )
  if (roomsError) return { success: false, error: 'Could not save your rooms' }
  const known = new Set((roomTypes ?? []).map((rt: any) => rt.id))
  const kept = rooms.filter((r) => known.has(r.roomId))
  if (kept.length === 0) return { success: false, error: 'These rooms are no longer available' }

  const checkIn = cleanDate(input.checkIn)
  const checkOut = cleanDate(input.checkOut)
  const row = {
    rooms: kept.map((r) => ({ room_type_id: r.roomId, qty: r.qty })),
    check_in_date: checkIn && checkOut && checkOut > checkIn ? checkIn : null,
    check_out_date: checkIn && checkOut && checkOut > checkIn ? checkOut : null,
    num_adults: cleanInt(input.adults, 1, 30, 1),
    num_children: cleanInt(input.children, 0, 20, 0),
    with_pets: input.pets === true,
  }

  const update = () => db.from('saved_stays').update(row).eq('user_id', user.id).eq('hotel_id', hotelId)

  const { data: existing } = await db
    .from('saved_stays')
    .select('id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle()

  let { error } = existing
    ? await update()
    : await db.from('saved_stays').insert({ user_id: user.id, hotel_id: hotelId, ...row })
  // Two tabs saving at once: the other insert won, so update that row instead
  if (error?.code === '23505') ({ error } = await update())
  if (error) {
    serverLog.error('saveStay failed:', error)
    return { success: false, error: 'Could not save your rooms' }
  }
  return { success: true }
}

export async function removeSavedStay(hotelId: string): Promise<Result> {
  const { db, user } = await signedIn()
  if (!user) return { success: false, error: 'Please sign in' }
  if (typeof hotelId !== 'string' || !hotelId) return { success: false, error: 'Missing hotel' }

  const { error } = await db.from('saved_stays').delete().eq('user_id', user.id).eq('hotel_id', hotelId)
  if (error) {
    serverLog.error('removeSavedStay failed:', error)
    return { success: false, error: 'Could not remove the saved rooms' }
  }
  return { success: true }
}

/** Every saved stay of the signed-in guest, newest first, with hotel and room details for My Bookings */
export async function getSavedStays(): Promise<SavedStaySummary[]> {
  const { db, user } = await signedIn()
  if (!user) return []

  const { data: stays, error } = await db
    .from('saved_stays')
    .select(
      'id, hotel_id, rooms, check_in_date, check_out_date, num_adults, num_children, with_pets, updated_at, ' +
        'hotel:hotels(id, name, slug, city, status, hotel_images!hotel_images_hotel_id_fkey(image_url, is_primary, display_order))'
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  if (error || !stays?.length) return []

  const roomIds = Array.from(
    new Set(stays.flatMap((s: any) => (Array.isArray(s.rooms) ? s.rooms : []).map((r: any) => r.room_type_id)))
  )
  const { data: roomTypes } = await db.from('room_types').select('id, name, base_price').in('id', roomIds)
  const roomMap = new Map((roomTypes ?? []).map((rt: any) => [rt.id, rt]))

  return stays.flatMap((s: any) => {
    const hotel = s.hotel
    if (!hotel || hotel.status !== 'active') return []

    const saved = toSavedStay(s)
    const roomLines = saved.rooms.flatMap(({ roomId, qty }) => {
      const room = roomMap.get(roomId)
      return room ? [{ roomId, name: room.name as string, qty, price: Number(room.base_price) || 0 }] : []
    })
    if (roomLines.length === 0) return []

    const photo = [...(hotel.hotel_images ?? [])].sort(
      (a: any, b: any) => Number(!!b.is_primary) - Number(!!a.is_primary) || (a.display_order ?? 0) - (b.display_order ?? 0)
    )[0]

    return [
      {
        ...saved,
        rooms: roomLines.map(({ roomId, qty }) => ({ roomId, qty })),
        id: s.id,
        hotelId: s.hotel_id,
        hotelName: hotel.name,
        slug: hotel.slug,
        city: hotel.city,
        imageUrl: photo?.image_url ?? null,
        roomLines: roomLines.map(({ roomId, name, qty }) => ({ roomId, name, qty })),
        nightlyPrice: roomLines.reduce((sum, { price, qty }) => sum + getInclusivePrice(price) * qty, 0),
      },
    ]
  })
}
