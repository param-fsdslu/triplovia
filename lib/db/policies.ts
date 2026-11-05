/**
 * Row-level access rules for user-scoped clients — the Firestore equivalent of the Supabase
 * RLS policies (schema.sql + supabase/migrations). Firestore itself is closed to browsers
 * (firestore.rules denies everything); these rules apply to server code that queries with
 * `createClient()` on behalf of the signed-in user. `createAdminClient()` bypasses them.
 *
 * Semantics match Postgres permissive policies: a row is visible / writable when ANY policy
 * for the command allows it. Tables without an entry here have no row-level restrictions.
 */
import type { DbUser, Row } from './types'

export type PolicyCommand = 'select' | 'insert' | 'update' | 'delete'

export interface PolicyContext {
  user: DbUser | null
  /** Fetches a row by primary key, bypassing policies. Cached per query. */
  lookup(table: string, id: unknown): Promise<Row | null>
}

type Rule = (row: Row, ctx: PolicyContext) => boolean | Promise<boolean>

interface Policy {
  command: PolicyCommand | 'all'
  /** USING: which existing rows the command can see/affect */
  using?: Rule
  /** WITH CHECK: whether a new/updated row is allowed (defaults to `using`) */
  check?: Rule
}

const uid = (ctx: PolicyContext) => ctx.user?.id ?? null
const isSuperAdmin = (ctx: PolicyContext) => ctx.user?.role === 'super_admin' || ctx.user?.role === 'admin'
const isHotelAdmin = (ctx: PolicyContext) => ctx.user?.role === 'hotel_admin'
const isAdmin = (ctx: PolicyContext) => isSuperAdmin(ctx) || isHotelAdmin(ctx)

const always: Rule = () => true
const superAdminOnly: Rule = (_row, ctx) => isSuperAdmin(ctx)
const adminOnly: Rule = (_row, ctx) => isAdmin(ctx)
const ownsRow =
  (column: string): Rule =>
  (row, ctx) =>
    uid(ctx) !== null && row[column] === uid(ctx)

async function ownsHotel(ctx: PolicyContext, hotelId: unknown): Promise<boolean> {
  if (!uid(ctx) || !hotelId) return false
  const hotel = await ctx.lookup('hotels', hotelId)
  return hotel?.owner_id === uid(ctx)
}

async function hotelIsActive(ctx: PolicyContext, hotelId: unknown): Promise<boolean> {
  const hotel = await ctx.lookup('hotels', hotelId)
  return hotel?.status === 'active'
}

async function ownsHotelOfRoomType(ctx: PolicyContext, roomTypeId: unknown): Promise<boolean> {
  const roomType = await ctx.lookup('room_types', roomTypeId)
  return roomType ? ownsHotel(ctx, roomType.hotel_id) : false
}

async function roomTypeIsPublic(ctx: PolicyContext, roomTypeId: unknown): Promise<boolean> {
  const roomType = await ctx.lookup('room_types', roomTypeId)
  return roomType?.status === 'available' && (await hotelIsActive(ctx, roomType.hotel_id))
}

async function ownsBooking(ctx: PolicyContext, bookingId: unknown): Promise<boolean> {
  if (!uid(ctx) || !bookingId) return false
  const booking = await ctx.lookup('bookings', bookingId)
  return booking?.user_id === uid(ctx)
}

async function ownsBoatBooking(ctx: PolicyContext, boatBookingId: unknown): Promise<boolean> {
  if (!uid(ctx) || !boatBookingId) return false
  const booking = await ctx.lookup('boat_bookings', boatBookingId)
  return booking?.user_id === uid(ctx)
}

/** Hotel-scoped admin tables: owner hotel admin manages, public reads rows of active hotels */
const hotelChildPolicies = (hotelColumn: string): Policy[] => [
  { command: 'all', using: superAdminOnly },
  { command: 'all', using: async (row, ctx) => isHotelAdmin(ctx) && ownsHotel(ctx, row[hotelColumn]) },
  { command: 'select', using: (row, ctx) => hotelIsActive(ctx, row[hotelColumn]) },
]

/** Room-type-scoped admin tables (images, amenities) */
const roomTypeChildPolicies: Policy[] = [
  { command: 'all', using: superAdminOnly },
  { command: 'all', using: async (row, ctx) => isHotelAdmin(ctx) && ownsHotelOfRoomType(ctx, row.room_type_id) },
  { command: 'select', using: (row, ctx) => roomTypeIsPublic(ctx, row.room_type_id) },
]

/** Boat tables: public read, any admin manages */
const boatPublicPolicies: Policy[] = [
  { command: 'select', using: always },
  { command: 'all', using: adminOnly },
]

export const POLICIES: Record<string, Policy[]> = {
  blogs: [
    { command: 'select', using: (row) => row.status === 'published' },
    { command: 'all', using: superAdminOnly },
  ],
  blog_images: [
    {
      command: 'select',
      using: async (row, ctx) => (await ctx.lookup('blogs', row.blog_id))?.status === 'published',
    },
    { command: 'all', using: superAdminOnly },
  ],

  boats: [
    { command: 'select', using: (row) => row.status === 'active' },
    { command: 'all', using: adminOnly },
  ],
  boat_amenities: boatPublicPolicies,
  boat_images: boatPublicPolicies,
  trip_types: boatPublicPolicies,
  trip_type_images: boatPublicPolicies,
  trip_time_slots: boatPublicPolicies,
  boat_bookings: [
    { command: 'all', using: adminOnly },
    { command: 'insert', check: always },
    { command: 'select', using: ownsRow('user_id') },
    { command: 'update', using: ownsRow('user_id'), check: ownsRow('user_id') },
  ],
  boat_reviews: [
    { command: 'all', using: adminOnly },
    { command: 'select', using: (row) => row.status === 'approved' },
    { command: 'insert', check: ownsRow('user_id') },
  ],

  hotels: [
    { command: 'all', using: superAdminOnly },
    {
      command: 'all',
      using: (row, ctx) => isHotelAdmin(ctx) && row.owner_id === uid(ctx),
    },
    { command: 'select', using: (row) => row.status === 'active' },
  ],
  hotel_images: hotelChildPolicies('hotel_id'),
  hotel_panoramas: hotelChildPolicies('hotel_id'),
  hotel_amenities: hotelChildPolicies('hotel_id'),
  room_types: [
    { command: 'all', using: superAdminOnly },
    { command: 'all', using: async (row, ctx) => isHotelAdmin(ctx) && ownsHotel(ctx, row.hotel_id) },
    {
      command: 'select',
      using: async (row, ctx) => row.status === 'available' && hotelIsActive(ctx, row.hotel_id),
    },
  ],
  rooms: [
    { command: 'all', using: superAdminOnly },
    { command: 'all', using: async (row, ctx) => isHotelAdmin(ctx) && ownsHotel(ctx, row.hotel_id) },
    {
      command: 'select',
      using: async (row, ctx) => row.status === 'available' && hotelIsActive(ctx, row.hotel_id),
    },
  ],
  room_type_images: roomTypeChildPolicies,
  room_type_panoramas: roomTypeChildPolicies,
  room_type_amenities: roomTypeChildPolicies,
  price_rules: [
    { command: 'select', using: always },
    { command: 'all', using: superAdminOnly },
    { command: 'all', using: async (row, ctx) => isHotelAdmin(ctx) && ownsHotelOfRoomType(ctx, row.room_type_id) },
  ],
  meal_plans: [
    { command: 'select', using: (row) => row.status === 'active' },
    {
      command: 'all',
      using: (row, ctx) =>
        isSuperAdmin(ctx) || (isHotelAdmin(ctx) && (ctx.user?.hotelIds ?? []).includes(String(row.hotel_id))),
    },
  ],
  hotel_admin_permissions: [
    { command: 'all', using: superAdminOnly },
    { command: 'select', using: adminOnly },
  ],

  bookings: [
    // Guest checkouts (user_id NULL) hold a guest's name and number: they're only reachable through
    // the admin client after the browser's token is checked (lib/services/guest-checkout.service.ts)
    { command: 'insert', check: (row, ctx) => row.user_id === null || row.user_id === uid(ctx) },
    { command: 'all', using: ownsRow('user_id') },
    { command: 'select', using: superAdminOnly },
    { command: 'update', using: superAdminOnly },
    { command: 'select', using: async (row, ctx) => isHotelAdmin(ctx) && ownsHotel(ctx, row.hotel_id) },
    { command: 'update', using: async (row, ctx) => isHotelAdmin(ctx) && ownsHotel(ctx, row.hotel_id) },
  ],
  booking_meal_plans: [
    { command: 'select', using: adminOnly },
    { command: 'select', using: (row, ctx) => ownsBooking(ctx, row.booking_id) },
    { command: 'insert', check: always },
  ],
  payments: [
    { command: 'select', using: superAdminOnly },
    {
      command: 'select',
      using: async (row, ctx) => {
        if (!isHotelAdmin(ctx) || !row.booking_id) return false
        const booking = await ctx.lookup('bookings', row.booking_id)
        return booking ? ownsHotel(ctx, booking.hotel_id) : false
      },
    },
    { command: 'select', using: (row, ctx) => ownsBooking(ctx, row.booking_id) },
    {
      command: 'insert',
      check: async (row, ctx) =>
        (await ownsBooking(ctx, row.booking_id)) || (await ownsBoatBooking(ctx, row.boat_booking_id)),
    },
  ],
  refund_transactions: [
    { command: 'all', using: superAdminOnly },
    {
      command: 'select',
      using: async (row, ctx) =>
        (await ownsBooking(ctx, row.booking_id)) || (await ownsBoatBooking(ctx, row.boat_booking_id)),
    },
    {
      command: 'insert',
      check: async (row, ctx) =>
        (await ownsBooking(ctx, row.booking_id)) || (await ownsBoatBooking(ctx, row.boat_booking_id)),
    },
  ],
  payment_anomalies: [{ command: 'all', using: superAdminOnly }],
  payment_audit_log: [{ command: 'all', using: superAdminOnly }],

  profiles: [
    { command: 'select', using: ownsRow('id') },
    { command: 'insert', check: ownsRow('id') },
    { command: 'update', using: ownsRow('id'), check: ownsRow('id') },
    { command: 'select', using: superAdminOnly },
    { command: 'update', using: superAdminOnly },
  ],
  wishlists: [
    { command: 'select', using: ownsRow('user_id') },
    { command: 'insert', check: ownsRow('user_id') },
    { command: 'delete', using: ownsRow('user_id') },
  ],
  saved_stays: [{ command: 'all', using: ownsRow('user_id') }],
  notifications: [
    { command: 'select', using: ownsRow('user_id') },
    { command: 'update', using: ownsRow('user_id'), check: ownsRow('user_id') },
    { command: 'select', using: superAdminOnly },
    { command: 'insert', check: superAdminOnly },
  ],
}

export function hasPolicies(table: string): boolean {
  return table in POLICIES
}

async function anyAllows(
  table: string,
  command: PolicyCommand,
  pick: (p: Policy) => Rule | undefined,
  row: Row,
  ctx: PolicyContext
): Promise<boolean> {
  const policies = POLICIES[table]
  if (!policies) return true
  for (const policy of policies) {
    if (policy.command !== command && policy.command !== 'all') continue
    const rule = pick(policy)
    if (rule && (await rule(row, ctx))) return true
  }
  return false
}

/** USING clause: may the command see / affect this existing row? */
export function allowsExisting(table: string, command: PolicyCommand, row: Row, ctx: PolicyContext) {
  return anyAllows(table, command, (p) => p.using, row, ctx)
}

/** WITH CHECK clause: may this new or updated row be written? */
export function allowsNew(table: string, command: 'insert' | 'update', row: Row, ctx: PolicyContext) {
  return anyAllows(table, command, (p) => p.check ?? p.using, row, ctx)
}
