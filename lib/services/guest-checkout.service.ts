/**
 * Guest checkout — booking a hotel with just a name and mobile number, no sign-in.
 *
 * - A guest booking has no user_id. The browser that made it gets a random token in an httpOnly
 *   cookie and the booking stores its SHA-256 (guest_access_hash), so only that browser can pay
 *   for it or open its confirmation page (findPayableBookings / isGuestBookingOwner).
 * - guest_phone is stored in E.164, the form Firebase phone sign-in reports. When someone signs in
 *   with that number via SMS code (which proves they own it), claimGuestRecords moves the guest
 *   bookings and saved rooms onto their account, so they show up under My Bookings.
 *
 * Server-only (uses the admin client): never import from a 'use server' file's exports or the browser.
 */
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createAdminClient, createClient } from '@/lib/db/server'
import { serverLog } from '@/lib/utils/server-log'

export const GUEST_BOOKING_COOKIE = 'ht_guest_booking'
/** Long enough to come back and finish paying; pending bookings are cancelled well before */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 2

type BookingTable = 'bookings' | 'boat_bookings'

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')

/**
 * The hash to store on a new guest booking. Reuses this browser's token (or creates one) and
 * refreshes the cookie. Only callable where cookies can be set: route handlers and server actions.
 */
export async function guestAccessHash(): Promise<string> {
  const store = await cookies()
  let token = store.get(GUEST_BOOKING_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) token = crypto.randomBytes(32).toString('hex')
  store.set(GUEST_BOOKING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  return hashToken(token)
}

/** True when every row is a guest booking (no account) made in this browser */
export async function isGuestBookingOwner(rows: Array<{ user_id?: string | null; guest_access_hash?: string | null }>) {
  const token = (await cookies()).get(GUEST_BOOKING_COOKIE)?.value
  if (!token || rows.length === 0) return false
  const expected = Buffer.from(hashToken(token), 'hex')
  return rows.every((row) => {
    if (row.user_id || typeof row.guest_access_hash !== 'string') return false
    const stored = Buffer.from(row.guest_access_hash, 'hex')
    return stored.length === expected.length && crypto.timingSafeEqual(stored, expected)
  })
}

/**
 * Bookings the caller may pay for: their own when signed in, otherwise hotel guest bookings made
 * in this browser. Null unless every id is accessible. `writer` is the client to update them with:
 * the user's own (row policies apply) or, for checked guest bookings, the admin client.
 */
export async function findPayableBookings<T = any>(table: BookingTable, ids: string[], columns: string) {
  if (ids.length === 0) return null
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()

  if (user) {
    const { data } = await db.from(table).select(columns).in('id', ids).eq('user_id', user.id)
    if (data?.length === ids.length) return { rows: data as T[], user, writer: db }
  }

  if (table !== 'bookings') return null
  const admin = createAdminClient()
  const { data } = await admin.from(table).select(`${columns}, user_id, guest_access_hash`).in('id', ids)
  if (data?.length !== ids.length || !(await isGuestBookingOwner(data))) return null
  return { rows: data as T[], user: null, writer: admin }
}

export interface GuestStayInput {
  phone: string
  hotelId: string
  rooms: Array<{ roomId: string; qty: number }>
  checkIn?: string
  checkOut?: string
  adults?: number
  children?: number
  pets?: boolean
}

/** Keeps a guest's rooms under their mobile number (saved_stays without user_id) until paid or claimed */
export async function saveGuestStay(input: GuestStayInput) {
  const admin = createAdminClient()
  const row = {
    rooms: input.rooms.map((r) => ({ room_type_id: r.roomId, qty: r.qty })),
    check_in_date: input.checkIn ?? null,
    check_out_date: input.checkOut ?? null,
    num_adults: input.adults ?? 1,
    num_children: input.children ?? 0,
    with_pets: input.pets === true,
  }
  const { data: existing } = await admin
    .from('saved_stays')
    .select('id')
    .eq('guest_phone', input.phone)
    .eq('hotel_id', input.hotelId)
    .is('user_id', null)
    .maybeSingle()
  const { error } = existing
    ? await admin.from('saved_stays').update(row).eq('id', existing.id)
    : await admin.from('saved_stays').insert({ guest_phone: input.phone, hotel_id: input.hotelId, ...row })
  if (error) serverLog.error('saveGuestStay failed:', error)
}

/** Paid: drop the guest's saved rooms for that hotel */
export async function clearGuestStay(phone: string | null | undefined, hotelId: string | null | undefined) {
  if (!phone || !hotelId) return
  const { error } = await createAdminClient()
    .from('saved_stays')
    .delete()
    .eq('guest_phone', phone)
    .eq('hotel_id', hotelId)
    .is('user_id', null)
  if (error) serverLog.error('clearGuestStay failed:', error)
}

/**
 * After a sign-in that proved ownership of `phone` (SMS code): moves guest bookings and saved
 * rooms made under that number onto the account. Where the account already has saved rooms for a
 * hotel, those win and the guest copy is dropped.
 */
export async function claimGuestRecords(userId: string, phone: string | null | undefined) {
  if (!phone) return
  const admin = createAdminClient()
  try {
    const { data: bookings } = await admin.from('bookings').select('id').eq('guest_phone', phone).is('user_id', null)
    if (bookings?.length) {
      await admin
        .from('bookings')
        .update({ user_id: userId, guest_access_hash: null })
        .eq('guest_phone', phone)
        .is('user_id', null)
        .in(
          'id',
          bookings.map((b: any) => b.id)
        )
    }

    const { data: stays } = await admin.from('saved_stays').select('id, hotel_id').eq('guest_phone', phone).is('user_id', null)
    for (const stay of stays ?? []) {
      const { data: own } = await admin
        .from('saved_stays')
        .select('id')
        .eq('user_id', userId)
        .eq('hotel_id', stay.hotel_id)
        .maybeSingle()
      if (own) await admin.from('saved_stays').delete().eq('id', stay.id).is('user_id', null)
      else await admin.from('saved_stays').update({ user_id: userId, guest_phone: null }).eq('id', stay.id).is('user_id', null)
    }
  } catch (error) {
    // Never block a sign-in over this; the next sign-in with the number tries again
    serverLog.error('claimGuestRecords failed:', error)
  }
}
