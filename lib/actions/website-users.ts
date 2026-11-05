'use server'

/**
 * Website users for the admin Users page (super_admin only): everyone with an account on the
 * site, i.e. guests who signed in with a mobile number, Google or email. Panel accounts
 * (super_admin / hotel_admin) are listed under Vendors instead (lib/actions/users.ts).
 *
 * Sources: `_auth_users` (names, phone, role, sign-ins recorded by the site) merged with
 * Firebase Authentication, which also holds accounts whose Google / SMS sign-in never reached
 * the site (no `_auth_users` row; shown as "Sign-in not finished"). Booking figures come from
 * `bookings.user_id`, so guest checkouts only count once claimed by a phone sign-in.
 */
import type { UserRecord } from 'firebase-admin/auth'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/db/server'
import { adminAuth, adminFirestore } from '@/lib/firebase/admin'
import { invalidateSessionUser } from '@/lib/firebase/auth/session-cache'
import type { AuthUserDoc } from '@/lib/firebase/auth/types'
import { AUTH_USERS_COLLECTION } from '@/lib/db/rpc'
import { requireSuperAdmin } from '@/lib/utils/admin'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'
import { logActivity } from '@/lib/services/activity-log.service'
import { accountLabel } from '@/lib/utils/account-label'

export type SignInMethod = 'phone' | 'google' | 'email'

export interface WebsiteUser {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  methods: SignInMethod[]
  emailConfirmed: boolean
  createdAt: string | null
  lastSignIn: string | null
  disabled: boolean
  /** Firebase signed them in but the site never set up their account */
  incomplete: boolean
  bookings: number
  paidBookings: number
  totalPaid: number
}

const FIREBASE_PROVIDERS: Record<string, SignInMethod> = {
  password: 'email',
  'google.com': 'google',
  phone: 'phone',
}

async function listFirebaseAccounts(): Promise<UserRecord[]> {
  const records: UserRecord[] = []
  let pageToken: string | undefined
  do {
    const page = await adminAuth().listUsers(1000, pageToken)
    records.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)
  return records
}

function toIso(value: string | undefined | null) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : new Date(time).toISOString()
}

function latest(...dates: (string | null)[]) {
  const set = dates.filter((d): d is string => !!d).sort()
  return set.length ? set[set.length - 1] : null
}

type BookingStats = Pick<WebsiteUser, 'bookings' | 'paidBookings' | 'totalPaid'>

/** Booking figures per user id */
function bookingStats(rows: Array<{ user_id?: string | null; payment_status?: string | null; total_amount?: unknown }>) {
  const stats = new Map<string, BookingStats>()
  for (const booking of rows) {
    if (!booking.user_id) continue
    const entry = stats.get(booking.user_id) ?? { bookings: 0, paidBookings: 0, totalPaid: 0 }
    entry.bookings += 1
    if (booking.payment_status === 'paid') {
      entry.paidBookings += 1
      entry.totalPaid += Number(booking.total_amount) || 0
    }
    stats.set(booking.user_id, entry)
  }
  return stats
}

/** The site's record of an account (`_auth_users`), as a stored doc or as db.auth returns it */
type SiteAccount = Pick<AuthUserDoc, 'user_metadata' | 'app_metadata' | 'created_at' | 'last_sign_in_at' | 'email_confirmed_at'> & {
  email?: string | null
}

const isAdminRole = (site: SiteAccount | null) =>
  ['super_admin', 'hotel_admin', 'admin'].includes(site?.user_metadata?.role ?? '')

/** Reads `_auth_users` directly: db.auth.admin.getUserById would adopt an account that never finished signing in */
async function readSiteAccount(userId: string): Promise<AuthUserDoc | null> {
  const snap = await adminFirestore().collection(AUTH_USERS_COLLECTION).doc(userId).get()
  return snap.exists ? (snap.data() as AuthUserDoc) : null
}

async function readFirebaseAccount(userId: string): Promise<UserRecord | null> {
  try {
    return await adminAuth().getUser(userId)
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') return null
    throw err
  }
}

function toWebsiteUser(id: string, site: SiteAccount | null, record: UserRecord | null, stats?: BookingStats): WebsiteUser {
  const meta = site?.user_metadata ?? {}
  const methods = new Set<SignInMethod>()
  for (const provider of site?.app_metadata?.providers ?? []) {
    if (provider === 'phone' || provider === 'google' || provider === 'email') methods.add(provider)
  }
  for (const info of record?.providerData ?? []) {
    const method = FIREBASE_PROVIDERS[info.providerId]
    if (method) methods.add(method)
  }

  const name =
    meta.full_name?.trim() ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim() ||
    record?.displayName?.trim() ||
    null

  return {
    id,
    name,
    email: site?.email ?? record?.email ?? null,
    phone: meta.phone ?? record?.phoneNumber ?? null,
    methods: (['phone', 'google', 'email'] as const).filter((m) => methods.has(m)),
    emailConfirmed: site ? site.email_confirmed_at != null : !!record?.emailVerified,
    createdAt: toIso(site?.created_at) ?? toIso(record?.metadata.creationTime),
    lastSignIn: latest(toIso(site?.last_sign_in_at), toIso(record?.metadata.lastSignInTime)),
    disabled: record?.disabled ?? false,
    incomplete: !site,
    ...(stats ?? { bookings: 0, paidBookings: 0, totalPaid: 0 }),
  }
}

export async function getWebsiteUsers(): Promise<{ success: boolean; error?: string; users: WebsiteUser[] }> {
  try {
    await requireSuperAdmin()
    const db = createAdminClient()

    const [{ data: siteData, error: siteError }, firebaseAccounts, { data: bookings, error: bookingsError }] =
      await Promise.all([
        db.auth.admin.listUsers(),
        listFirebaseAccounts(),
        db.from('bookings').select('user_id, payment_status, total_amount'),
      ])
    if (siteError) throw new Error(siteError.message)
    if (bookingsError) throw new Error(bookingsError.message)

    const stats = bookingStats(bookings ?? [])
    const siteUsers = new Map(siteData.users.map((user) => [user.id, user]))
    const records = new Map(firebaseAccounts.map((record) => [record.uid, record]))
    const ids = new Set([...siteUsers.keys(), ...records.keys()])

    const users: WebsiteUser[] = []
    for (const id of ids) {
      const site = siteUsers.get(id) ?? null
      if (isAdminRole(site)) continue
      users.push(toWebsiteUser(id, site, records.get(id) ?? null, stats.get(id)))
    }

    users.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    return { success: true, users }
  } catch (error: any) {
    serverLog.error('Error fetching website users:', error)
    return { success: false, error: error.message || 'Failed to fetch users', users: [] }
  }
}

export interface WebsiteUserBooking {
  id: string
  reference: string
  hotelId: string | null
  hotelName: string | null
  hotelCity: string | null
  roomType: string | null
  checkIn: string
  checkOut: string
  nights: number
  rooms: number
  adults: number
  children: number
  withPets: boolean
  total: number
  bookingStatus: string
  paymentStatus: string
  invoiceNumber: string | null
  specialRequests: string | null
  createdAt: string | null
}

export interface WebsiteUserDetails {
  user: WebsiteUser
  avatarUrl: string | null
  profile: {
    firstName: string | null
    lastName: string | null
    dateOfBirth: string | null
    nationality: string | null
    bio: string | null
    updatedAt: string | null
  } | null
  /** How they sign in, with the address or number each method uses */
  signIns: Array<{ method: SignInMethod; identifier: string | null }>
  bookings: WebsiteUserBooking[]
  payments: Array<{
    id: string
    bookingReference: string | null
    amount: number
    status: string
    method: string | null
    gatewayPaymentId: string | null
    paidAt: string | null
    refundAmount: number
  }>
  refunds: Array<{
    id: string
    bookingReference: string | null
    amount: number
    cancellationCharge: number
    status: string
    reason: string | null
    createdAt: string | null
  }>
  wishlist: Array<{ id: string; hotelId: string; hotelName: string | null; city: string | null; addedAt: string | null }>
  savedStays: Array<{
    id: string
    hotelId: string
    hotelName: string | null
    city: string | null
    rooms: Array<{ name: string; qty: number }>
    checkIn: string | null
    checkOut: string | null
    adults: number
    children: number
    pets: boolean
    updatedAt: string | null
  }>
  reviews: Array<{
    id: string
    hotelId: string
    hotelName: string | null
    /** Stars out of 5 (stored 0-10) */
    stars: number
    title: string | null
    comment: string | null
    status: string
    createdAt: string | null
  }>
}

/**
 * Everything the site holds about one website user, for their admin profile page: account and
 * profile, sign-in methods, hotel bookings with payments and refunds, wishlist, saved rooms and
 * reviews. `notFound` when there is no such account; `vendor` for panel accounts.
 */
export async function getWebsiteUserDetails(
  userId: string
): Promise<{ success: true; details: WebsiteUserDetails } | { success: false; error: string; notFound?: boolean; vendor?: boolean }> {
  try {
    await requireSuperAdmin()
    if (!userId) return { success: false, error: 'User ID is required', notFound: true }
    const db = createAdminClient()

    const [site, record] = await Promise.all([readSiteAccount(userId), readFirebaseAccount(userId)])
    if (!site && !record) return { success: false, error: 'User not found', notFound: true }
    if (isAdminRole(site)) return { success: false, error: 'This is a vendor account', vendor: true }

    const [profileRes, bookingsRes, wishlistRes, savedRes, reviewsRes] = await Promise.all([
      db
        .from('profiles')
        .select('first_name, last_name, phone, date_of_birth, nationality, bio, profile_image, updated_at')
        .eq('id', userId)
        .maybeSingle(),
      db
        .from('bookings')
        .select(
          'id, booking_reference, check_in_date, check_out_date, num_nights, num_rooms, num_adults, num_children, ' +
            'with_pets, total_amount, booking_status, payment_status, invoice_number, special_requests, created_at, user_id, ' +
            'hotel:hotels(id, name, city), room_type:room_types(name)'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      db.from('wishlists').select('id, hotel_id, created_at, hotel:hotels(name, city)').eq('user_id', userId),
      db
        .from('saved_stays')
        .select('id, hotel_id, rooms, check_in_date, check_out_date, num_adults, num_children, with_pets, updated_at, hotel:hotels(name, city)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      db
        .from('reviews')
        .select('id, hotel_id, overall_rating, title, comment, status, created_at, hotel:hotels(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ])
    for (const res of [profileRes, bookingsRes, wishlistRes, savedRes, reviewsRes]) {
      if (res.error) throw new Error(res.error.message)
    }

    const bookingRows: any[] = bookingsRes.data ?? []
    const bookingIds = bookingRows.map((b) => b.id)
    const referenceOf = new Map(bookingRows.map((b) => [b.id, b.booking_reference as string]))

    const savedRows: any[] = savedRes.data ?? []
    const roomTypeIds = Array.from(
      new Set(savedRows.flatMap((s) => (Array.isArray(s.rooms) ? s.rooms : []).map((r: any) => r.room_type_id)))
    ).filter(Boolean)

    const [paymentsRes, refundsRes, roomTypesRes] = await Promise.all([
      bookingIds.length
        ? db
            .from('payments')
            .select('id, booking_id, amount, status, payment_method, payment_gateway_payment_id, paid_at, created_at, refund_amount')
            .in('booking_id', bookingIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      bookingIds.length
        ? db
            .from('refund_transactions')
            .select('id, booking_id, refund_amount, cancellation_charge, status, refund_reason, created_at')
            .in('booking_id', bookingIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      roomTypeIds.length
        ? db.from('room_types').select('id, name').in('id', roomTypeIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    for (const res of [paymentsRes, refundsRes, roomTypesRes]) {
      if (res.error) throw new Error(res.error.message)
    }
    const roomName = new Map(((roomTypesRes.data ?? []) as any[]).map((rt) => [rt.id, rt.name as string]))

    const profile: any = profileRes.data
    const signIns: WebsiteUserDetails['signIns'] = []
    for (const info of record?.providerData ?? []) {
      const method = FIREBASE_PROVIDERS[info.providerId]
      if (method) signIns.push({ method, identifier: method === 'phone' ? info.phoneNumber ?? null : info.email ?? null })
    }
    const user = toWebsiteUser(userId, site, record, bookingStats(bookingRows).get(userId))
    for (const method of user.methods) {
      if (!signIns.some((s) => s.method === method)) {
        signIns.push({ method, identifier: method === 'phone' ? user.phone : user.email })
      }
    }

    return {
      success: true,
      details: {
        user,
        avatarUrl: profile?.profile_image || site?.user_metadata?.avatar_url || record?.photoURL || null,
        profile: profile
          ? {
              firstName: profile.first_name ?? null,
              lastName: profile.last_name ?? null,
              dateOfBirth: profile.date_of_birth ?? null,
              nationality: profile.nationality ?? null,
              bio: profile.bio ?? null,
              updatedAt: profile.updated_at ?? null,
            }
          : null,
        signIns,
        bookings: bookingRows.map((b) => ({
          id: b.id,
          reference: b.booking_reference,
          hotelId: b.hotel?.id ?? null,
          hotelName: b.hotel?.name ?? null,
          hotelCity: b.hotel?.city ?? null,
          roomType: b.room_type?.name ?? null,
          checkIn: b.check_in_date,
          checkOut: b.check_out_date,
          nights: Number(b.num_nights) || 0,
          rooms: Number(b.num_rooms) || 1,
          adults: Number(b.num_adults) || 0,
          children: Number(b.num_children) || 0,
          withPets: !!b.with_pets,
          total: Number(b.total_amount) || 0,
          bookingStatus: b.booking_status,
          paymentStatus: b.payment_status,
          invoiceNumber: b.invoice_number ?? null,
          specialRequests: b.special_requests ?? null,
          createdAt: b.created_at ?? null,
        })),
        payments: ((paymentsRes.data ?? []) as any[]).map((p) => ({
          id: p.id,
          bookingReference: referenceOf.get(p.booking_id) ?? null,
          amount: Number(p.amount) || 0,
          status: p.status,
          method: p.payment_method ?? null,
          gatewayPaymentId: p.payment_gateway_payment_id ?? null,
          paidAt: p.paid_at ?? p.created_at ?? null,
          refundAmount: Number(p.refund_amount) || 0,
        })),
        refunds: ((refundsRes.data ?? []) as any[]).map((r) => ({
          id: r.id,
          bookingReference: referenceOf.get(r.booking_id) ?? null,
          amount: Number(r.refund_amount) || 0,
          cancellationCharge: Number(r.cancellation_charge) || 0,
          status: r.status,
          reason: r.refund_reason ?? null,
          createdAt: r.created_at ?? null,
        })),
        wishlist: ((wishlistRes.data ?? []) as any[]).map((w) => ({
          id: w.id,
          hotelId: w.hotel_id,
          hotelName: w.hotel?.name ?? null,
          city: w.hotel?.city ?? null,
          addedAt: w.created_at ?? null,
        })),
        savedStays: savedRows.map((s) => ({
          id: s.id,
          hotelId: s.hotel_id,
          hotelName: s.hotel?.name ?? null,
          city: s.hotel?.city ?? null,
          rooms: (Array.isArray(s.rooms) ? s.rooms : []).map((r: any) => ({
            name: roomName.get(r.room_type_id) ?? 'Room no longer listed',
            qty: Number(r.qty) || 1,
          })),
          checkIn: s.check_in_date ?? null,
          checkOut: s.check_out_date ?? null,
          adults: Number(s.num_adults) || 0,
          children: Number(s.num_children) || 0,
          pets: !!s.with_pets,
          updatedAt: s.updated_at ?? null,
        })),
        reviews: ((reviewsRes.data ?? []) as any[]).map((r) => ({
          id: r.id,
          hotelId: r.hotel_id,
          hotelName: r.hotel?.name ?? null,
          stars: Math.round((Number(r.overall_rating) || 0) / 2 * 10) / 10,
          title: r.title ?? null,
          comment: r.comment ?? null,
          status: r.status,
          createdAt: r.created_at ?? null,
        })),
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching website user details:', error)
    return { success: false, error: error.message || 'Failed to load user' }
  }
}

/** The Users page acts on website accounts only; panel accounts are changed under Vendors. Returns how to name the account */
async function assertWebsiteUser(userId: string): Promise<string> {
  if (!userId) throw new Error('User ID is required')
  const site = await readSiteAccount(userId)
  if (isAdminRole(site)) {
    throw new Error('This is a vendor account: change it under Vendors')
  }
  const label = site ? accountLabel(site) : ''
  return label && label !== 'My account' ? label : 'a website user'
}

/**
 * Blocks or allows sign-in. Disabling also revokes their sessions, so a signed-in guest is
 * signed out on their next request (sessions are verified with revocation checks).
 */
export async function setWebsiteUserDisabled(userId: string, disabled: boolean) {
  try {
    await requireSuperAdmin()
    const who = await assertWebsiteUser(userId)

    await adminAuth().updateUser(userId, { disabled })
    if (disabled) await adminAuth().revokeRefreshTokens(userId)
    invalidateSessionUser(userId)

    revalidatePath(`${ADMIN_PATH}/users`)
    await logActivity({
      entity: 'user',
      action: disabled ? 'disabled' : 'enabled',
      entityId: userId,
      label: who,
      summary: disabled ? `Blocked sign-in for ${who}` : `Allowed sign-in again for ${who}`,
      href: `/users/${userId}`,
    })
    return { success: true }
  } catch (error: any) {
    serverLog.error('Error updating website user:', error)
    return { success: false, error: error.message || 'Failed to update user' }
  }
}

/**
 * Deletes a website account, with the same clean-up as a guest deleting their own account
 * (deleteAccount in lib/actions/profile.ts): wishlist and saved rooms go; reviews and boat
 * bookings stay without the account. Hotel bookings stay for accounts and invoices and are
 * unlinked by the user delete itself (bookings.user_id ON DELETE SET NULL).
 */
export async function deleteWebsiteUser(userId: string) {
  try {
    await requireSuperAdmin()
    const who = await assertWebsiteUser(userId)
    const db = createAdminClient()

    const steps = [
      () => db.from('wishlists').delete().eq('user_id', userId),
      () => db.from('saved_stays').delete().eq('user_id', userId),
      () => db.from('reviews').update({ user_id: null }).eq('user_id', userId),
      () => db.from('boat_reviews').update({ user_id: null }).eq('user_id', userId),
      () => db.from('boat_bookings').update({ user_id: null }).eq('user_id', userId),
    ]
    for (const step of steps) {
      const { error } = await step()
      if (error) throw new Error(error.message)
    }

    const { error } = await db.auth.admin.deleteUser(userId)
    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/users`)
    await logActivity({
      entity: 'user',
      action: 'deleted',
      entityId: userId,
      label: who,
      summary: `Deleted the website account of ${who} (bookings kept)`,
    })
    return { success: true }
  } catch (error: any) {
    serverLog.error('Error deleting website user:', error)
    return { success: false, error: error.message || 'Failed to delete user' }
  }
}
