/**
 * Tests for the Firestore-backed query layer, run against MemoryStore (same transaction
 * semantics as Firestore). Run with: npm run test:db
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DbClient } from '../client'
import { MemoryStore } from '../store'
import type { DbActor, DbUser } from '../types'
import { assignInvoiceNumber, financialYear } from '../invoice-numbers'
import { claimOnce } from '../claims'

function setup() {
  const store = new MemoryStore()
  const client = (actor: DbActor) => new DbClient({ store, resolveActor: async () => actor, auth: null, storage: null })
  const admin = client({ kind: 'service' })
  const asUser = (user: DbUser | null) => client({ kind: 'user', user })
  return { store, admin, asUser }
}

const guest: DbUser = { id: 'user-1', email: 'guest@example.com', role: null, hotelIds: [] }
const otherGuest: DbUser = { id: 'user-2', email: 'other@example.com', role: null, hotelIds: [] }
const hotelAdmin: DbUser = { id: 'owner-1', email: 'owner@example.com', role: 'hotel_admin', hotelIds: ['h1'] }
const superAdmin: DbUser = { id: 'root', email: 'root@example.com', role: 'super_admin', hotelIds: [] }

async function seedHotels(admin: DbClient) {
  await admin.from('hotels').insert([
    { id: 'h1', name: 'Sea View', slug: 'sea-view', address_line_1: 'a', city: 'Honnavar', state: 'KA', country: 'IN', owner_id: 'owner-1', location_rating: 8 },
    { id: 'h2', name: 'Hill Top', slug: 'hill-top', address_line_1: 'b', city: 'Gokarna', state: 'KA', country: 'IN', status: 'inactive' },
    { id: 'h3', name: 'River Side', slug: 'river-side', address_line_1: 'c', city: 'Honnavar', state: 'KA', country: 'IN' },
  ])
  await admin.from('room_types').insert([
    { id: 'rt1', hotel_id: 'h1', name: 'Deluxe', max_occupancy: 2, max_adults: 2, base_price: '2500' },
    { id: 'rt2', hotel_id: 'h1', name: 'Suite', max_occupancy: 4, max_adults: 3, base_price: 6000 },
    { id: 'rt3', hotel_id: 'h3', name: 'Basic', max_occupancy: 2, max_adults: 2, base_price: 1200 },
  ])
  await admin.from('hotel_images').insert([
    { hotel_id: 'h1', image_url: 'https://img/1.jpg', is_primary: true, display_order: 1 },
    { hotel_id: 'h1', image_url: 'https://img/2.jpg', display_order: 0 },
  ])
}

test('insert applies defaults, casts values and returns the row', async () => {
  const { admin } = setup()
  await seedHotels(admin)
  const { data, error } = await admin
    .from('room_types')
    .select('id, base_price, status, num_available_rooms, created_at')
    .eq('id', 'rt1')
    .single()
  assert.equal(error, null)
  assert.equal(data.base_price, 2500)
  assert.equal(data.status, 'available')
  assert.equal(data.num_available_rooms, 0)
  assert.match(data.created_at, /^\d{4}-\d{2}-\d{2}T/)

  const inserted = await admin
    .from('profiles')
    .insert({ id: 'p1', first_name: 'Asha', last_name: 'Rao', preferences: { lang: ['en', 'kn'] } })
    .select()
    .single()
  assert.equal(inserted.error, null)
  assert.equal(inserted.data.full_name, 'Asha Rao')
  assert.deepEqual(inserted.data.preferences, { lang: ['en', 'kn'] })
  assert.equal(inserted.data.phone, null)
})

test('filters, ordering, paging and counts', async () => {
  const { admin } = setup()
  await seedHotels(admin)

  const byCity = await admin.from('hotels').select('id').ilike('city', '%honn%').order('name')
  assert.deepEqual(byCity.data.map((h: any) => h.id), ['h3', 'h1'])

  const priced = await admin.from('room_types').select('id').gte('base_price', '2000').lte('base_price', 7000)
  assert.deepEqual(priced.data.map((r: any) => r.id).sort(), ['rt1', 'rt2'])

  const or = await admin.from('hotels').select('id').or('city.ilike.%gok%,name.eq.Sea View').order('id')
  assert.deepEqual(or.data.map((h: any) => h.id), ['h1', 'h2'])

  const page = await admin.from('hotels').select('id', { count: 'exact' }).order('name', { ascending: false }).range(1, 1)
  assert.equal(page.count, 3)
  assert.deepEqual(page.data.map((h: any) => h.id), ['h3'])

  const head = await admin.from('hotels').select('*', { count: 'exact', head: true }).eq('status', 'active')
  assert.equal(head.data, null)
  assert.equal(head.count, 2)

  const nulls = await admin.from('hotels').select('id').order('location_rating', { ascending: false, nullsFirst: false })
  assert.equal(nulls.data[0].id, 'h1')

  const notIn = await admin.from('hotels').select('id').not('status', 'in', '(inactive,pending)').order('id')
  assert.deepEqual(notIn.data.map((h: any) => h.id), ['h1', 'h3'])
})

test('single and maybeSingle follow PostgREST', async () => {
  const { admin } = setup()
  await seedHotels(admin)
  const none = await admin.from('hotels').select('*').eq('slug', 'missing').single()
  assert.equal(none.error?.code, 'PGRST116')
  assert.equal(none.data, null)
  const many = await admin.from('hotels').select('*').eq('city', 'Honnavar').single()
  assert.equal(many.error?.code, 'PGRST116')
  const maybe = await admin.from('hotels').select('*').eq('slug', 'missing').maybeSingle()
  assert.equal(maybe.error, null)
  assert.equal(maybe.data, null)
})

test('embedded resources: many-to-one, one-to-many, one-to-one, nested, inner', async () => {
  const { admin } = setup()
  await seedHotels(admin)
  await admin.from('bookings').insert({
    id: 'b1', user_id: 'user-1', guest_email: 'g@x.com', guest_first_name: 'G', guest_last_name: 'X', guest_phone: '1',
    hotel_id: 'h1', room_type_id: 'rt1', check_in_date: '2026-11-01', check_out_date: '2026-11-04',
    num_adults: 2, price_per_night: 2500, total_amount: 7500, booking_reference: 'BK-1',
  })
  await admin.from('reviews').insert({ id: 'rv1', hotel_id: 'h1', booking_id: 'b1', user_id: 'user-1', overall_rating: 9, status: 'approved' })
  await admin.from('review_responses').insert({ review_id: 'rv1', hotel_id: 'h1', response_text: 'Thanks!' })

  const booking = await admin
    .from('bookings')
    .select('*, hotel:hotels!hotel_id(name, city), room_types!bookings_room_type_id_fkey(name)')
    .eq('id', 'b1')
    .single()
  assert.equal(booking.error, null)
  assert.deepEqual(booking.data.hotel, { name: 'Sea View', city: 'Honnavar' })
  assert.deepEqual(booking.data.room_types, { name: 'Deluxe' })
  assert.equal(booking.data.num_nights, 3)
  assert.equal(booking.data.subtotal, 7500)

  const hotel = await admin
    .from('hotels')
    .select('id, hotel_images(image_url, display_order), room_types(name, base_price), reviews(id, review_response:review_responses(response_text))')
    .eq('id', 'h1')
    .order('display_order', { referencedTable: 'hotel_images' })
    .single()
  assert.equal(hotel.data.hotel_images.length, 2)
  assert.equal(hotel.data.hotel_images[0].display_order, 0)
  assert.equal(hotel.data.room_types.length, 2)
  assert.deepEqual(hotel.data.reviews[0].review_response, { response_text: 'Thanks!' })

  // !inner + embedded filter: only hotels with a room type in range; arrays filtered too
  const search = await admin
    .from('hotels')
    .select('id, room_types!inner(base_price)', { count: 'exact' })
    .gte('room_types.base_price', 2000)
    .order('room_types.base_price', { ascending: true })
  assert.equal(search.count, 1)
  assert.equal(search.data[0].id, 'h1')
  assert.equal(search.data[0].room_types.length, 2)

  const sorted = await admin.from('hotels').select('id, room_types!inner(base_price)').order('room_types.base_price', { ascending: true })
  assert.deepEqual(sorted.data.map((h: any) => h.id), ['h3', 'h1'])

  const missing = await admin.from('bookings').select('*, booking_guests(*)')
  assert.equal(missing.error?.code, 'PGRST200')
})

test('unique constraints are enforced, NULL keys are not', async () => {
  const { admin } = setup()
  await seedHotels(admin)
  const dup = await admin.from('hotels').insert({ name: 'Dup', slug: 'sea-view', address_line_1: 'x', city: 'c', state: 's', country: 'IN' })
  assert.equal(dup.error?.code, '23505')

  const p1 = await admin.from('payments').insert({ booking_id: null, amount: 10, payment_gateway_payment_id: 'pay_1' })
  assert.equal(p1.error, null)
  const p2 = await admin.from('payments').insert({ booking_id: null, amount: 10, payment_gateway_payment_id: 'pay_1' })
  assert.equal(p2.error?.code, '23505')
  const p3 = await admin.from('payments').insert([{ amount: 1 }, { amount: 2 }])
  assert.equal(p3.error, null)

  // Changing a unique column moves its key: the old slug becomes free again
  const renamed = await admin.from('hotels').update({ slug: 'sea-view-2' }).eq('id', 'h1').select('slug').single()
  assert.equal(renamed.data.slug, 'sea-view-2')
  const reuse = await admin.from('hotels').insert({ name: 'New', slug: 'sea-view', address_line_1: 'x', city: 'c', state: 's', country: 'IN' })
  assert.equal(reuse.error, null)
  const clash = await admin.from('hotels').update({ slug: 'sea-view' }).eq('id', 'h3')
  assert.equal(clash.error?.code, '23505')
})

test('conditional updates only touch matching rows and run triggers', async () => {
  const { admin } = setup()
  await seedHotels(admin)
  await admin.from('bookings').insert({
    id: 'b1', guest_email: 'g@x.com', guest_first_name: 'G', guest_last_name: 'X', guest_phone: '1',
    hotel_id: 'h1', room_type_id: 'rt1', check_in_date: '2026-11-01', check_out_date: '2026-11-02',
    num_adults: 1, price_per_night: 2500, total_amount: 2500, booking_reference: 'BK-1',
  })
  const first = await admin
    .from('bookings')
    .update({ payment_status: 'paid', booking_status: 'confirmed', check_out_date: '2026-11-05T10:00:00.000Z' })
    .eq('id', 'b1')
    .eq('payment_status', 'pending')
    .select()
  assert.equal(first.data.length, 1)
  assert.equal(first.data[0].check_out_date, '2026-11-05')
  assert.equal(first.data[0].num_nights, 4)
  assert.equal(first.data[0].subtotal, 10000)

  const second = await admin.from('bookings').update({ payment_status: 'paid' }).eq('id', 'b1').eq('payment_status', 'pending').select()
  assert.deepEqual(second.data, [])

  const audit = await admin.from('payments').insert({ amount: 5, status: 'success' }).select('id').single()
  const log = await admin.from('payment_audit_log').select('*').eq('payment_id', audit.data.id)
  assert.equal(log.data.length, 1)
  assert.equal(log.data[0].event_type, 'INSERT')
  assert.equal(log.data[0].success, true)
})

test('deletes cascade, set null and restrict', async () => {
  const { admin } = setup()
  await seedHotels(admin)
  await admin.from('room_type_images').insert({ room_type_id: 'rt1', image_url: 'x' })
  await admin.from('amenity_categories').insert({ id: 'c1', name: 'General' })
  await admin.from('amenities').insert({ id: 'a1', name: 'Wifi', category_id: 'c1' })

  const delCat = await admin.from('amenity_categories').delete().eq('id', 'c1')
  assert.equal(delCat.error, null)
  const amenity = await admin.from('amenities').select('category_id').eq('id', 'a1').single()
  assert.equal(amenity.data.category_id, null)

  await admin.from('bookings').insert({
    id: 'b1', guest_email: 'g@x.com', guest_first_name: 'G', guest_last_name: 'X', guest_phone: '1',
    hotel_id: 'h1', room_type_id: 'rt1', check_in_date: '2026-11-01', check_out_date: '2026-11-02',
    num_adults: 1, price_per_night: 2500, total_amount: 2500, booking_reference: 'BK-1',
  })
  await admin.from('payments').insert({ booking_id: 'b1', amount: 2500 })
  const blocked = await admin.from('hotels').delete().eq('id', 'h1')
  assert.equal(blocked.error?.code, '23503')

  const ok = await admin.from('hotels').delete().eq('id', 'h3').select('id')
  assert.deepEqual(ok.data, [{ id: 'h3' }])
  const orphans = await admin.from('room_types').select('id').eq('hotel_id', 'h3')
  assert.deepEqual(orphans.data, [])
  // The deleted hotel's slug is free again
  const again = await admin.from('hotels').insert({ name: 'River', slug: 'river-side', address_line_1: 'x', city: 'c', state: 's', country: 'IN' })
  assert.equal(again.error, null)
})

test('upsert updates on conflict and inserts otherwise', async () => {
  const { admin } = setup()
  await admin.from('hotel_admin_permissions').upsert({ permission_key: 'pricing', enabled: true })
  await admin.from('hotel_admin_permissions').upsert({ permission_key: 'pricing', enabled: false }, { onConflict: 'permission_key' })
  await admin.from('hotel_admin_permissions').upsert([{ permission_key: 'photos', enabled: 'true' }])
  const { data } = await admin.from('hotel_admin_permissions').select('permission_key, enabled').order('permission_key')
  assert.deepEqual(data, [
    { permission_key: 'photos', enabled: true },
    { permission_key: 'pricing', enabled: false },
  ])
})

test('row policies for user-scoped clients', async () => {
  const { admin, asUser } = setup()
  await seedHotels(admin)
  const base = {
    guest_email: 'g@x.com', guest_first_name: 'G', guest_last_name: 'X', guest_phone: '1',
    room_type_id: 'rt1', check_in_date: '2026-11-01', check_out_date: '2026-11-02',
    num_adults: 1, price_per_night: 2500, total_amount: 2500,
  }
  await admin.from('bookings').insert([
    { ...base, id: 'mine', user_id: 'user-1', hotel_id: 'h1', booking_reference: 'BK-A' },
    { ...base, id: 'theirs', user_id: 'user-2', hotel_id: 'h3', booking_reference: 'BK-B', room_type_id: 'rt3' },
    { ...base, id: 'guest', user_id: null, hotel_id: 'h3', booking_reference: 'BK-C', room_type_id: 'rt3' },
  ])

  const anonHotels = await asUser(null).from('hotels').select('id').order('id')
  assert.deepEqual(anonHotels.data.map((h: any) => h.id), ['h1', 'h3'])

  // Guest checkouts (no user_id) are hidden from everyone but admins: they hold a stranger's details
  const mine = await asUser(guest).from('bookings').select('id').order('id')
  assert.deepEqual(mine.data.map((b: any) => b.id), ['mine'])
  const anonBookings = await asUser(null).from('bookings').select('id')
  assert.deepEqual(anonBookings.data, [])

  const owner = await asUser(hotelAdmin).from('bookings').select('id, hotel:hotels(name)').order('id')
  assert.deepEqual(owner.data.map((b: any) => b.id), ['mine'])

  const all = await asUser(superAdmin).from('bookings').select('id')
  assert.equal(all.data.length, 3)

  // UPDATE silently skips rows the policy hides
  const sneaky = await asUser(guest).from('bookings').update({ special_requests: 'x' }).eq('id', 'theirs').select()
  assert.deepEqual(sneaky.data, [])

  // INSERT that fails WITH CHECK is an error
  const forged = await asUser(guest).from('bookings').insert({ ...base, user_id: 'user-2', hotel_id: 'h1', booking_reference: 'BK-D' })
  assert.equal(forged.error?.code, '42501')

  // Embedded rows follow the embedded table's policies too
  const embedded = await asUser(null).from('room_types').select('id, hotel:hotels(name)').eq('id', 'rt1').single()
  assert.equal(embedded.data.hotel.name, 'Sea View')

  const wish = await asUser(otherGuest).from('wishlists').insert({ user_id: 'user-2', hotel_id: 'h1' }).select().single()
  assert.equal(wish.error, null)
  const peek = await asUser(guest).from('wishlists').select('*')
  assert.deepEqual(peek.data, [])
})

test('saved stays: one per guest per hotel, private, gone with the hotel', async () => {
  const { admin, asUser } = setup()
  await seedHotels(admin)
  const rooms = [{ room_type_id: 'rt1', qty: 2 }]

  const saved = await asUser(guest)
    .from('saved_stays')
    .insert({ user_id: 'user-1', hotel_id: 'h1', rooms, check_in_date: '2026-11-01', check_out_date: '2026-11-03' })
    .select()
    .single()
  assert.equal(saved.error, null)
  assert.deepEqual(saved.data.rooms, rooms)
  assert.equal(saved.data.num_adults, 1)

  const again = await asUser(guest).from('saved_stays').insert({ user_id: 'user-1', hotel_id: 'h1', rooms })
  assert.equal(again.error?.code, '23505')

  // Nobody else can read, change or forge them
  const peek = await asUser(otherGuest).from('saved_stays').select('*')
  assert.deepEqual(peek.data, [])
  const sneaky = await asUser(otherGuest).from('saved_stays').update({ rooms: [] }).eq('user_id', 'user-1').select()
  assert.deepEqual(sneaky.data, [])
  const forged = await asUser(otherGuest).from('saved_stays').insert({ user_id: 'user-1', hotel_id: 'h3', rooms })
  assert.equal(forged.error?.code, '42501')

  const updated = await asUser(guest)
    .from('saved_stays')
    .update({ rooms: [{ room_type_id: 'rt2', qty: 1 }] })
    .eq('user_id', 'user-1')
    .eq('hotel_id', 'h1')
    .select('rooms, updated_at')
    .single()
  assert.deepEqual(updated.data.rooms, [{ room_type_id: 'rt2', qty: 1 }])
  assert.ok(updated.data.updated_at >= saved.data.updated_at)

  // Guest checkouts keep rooms under the mobile number (no user_id): one per number per hotel, hidden from users
  const guestStay = await admin.from('saved_stays').insert({ guest_phone: '+919876543210', hotel_id: 'h1', rooms }).select('id').single()
  assert.equal(guestStay.error, null)
  const dupe = await admin.from('saved_stays').insert({ guest_phone: '+919876543210', hotel_id: 'h1', rooms })
  assert.equal(dupe.error?.code, '23505')
  const anonPeek = await asUser(null).from('saved_stays').select('*')
  assert.deepEqual(anonPeek.data, [])
  const ownOnly = await asUser(guest).from('saved_stays').select('hotel_id')
  assert.deepEqual(ownOnly.data, [{ hotel_id: 'h1' }])

  await admin.from('hotels').delete().eq('id', 'h1')
  const left = await admin.from('saved_stays').select('id')
  assert.deepEqual(left.data, [])
})

test('invoice numbers: consecutive per financial year, one per booking, no gaps', async () => {
  const { store, admin } = setup()
  await seedHotels(admin)
  const base = {
    guest_first_name: 'G', guest_last_name: 'X', guest_phone: '1', hotel_id: 'h1', room_type_id: 'rt1',
    check_in_date: '2026-11-01', check_out_date: '2026-11-02', num_adults: 1, price_per_night: 2500, total_amount: 2500,
  }
  await admin.from('bookings').insert([
    { ...base, id: 'b1', booking_reference: 'BK-1' },
    { ...base, id: 'b2', booking_reference: 'BK-2' },
    { ...base, id: 'b3', booking_reference: 'BK-3' },
  ])
  const numbering = { prefix: 'TRV', digits: 5 }
  const oct = new Date('2026-10-21T10:00:00Z')

  const first = await assignInvoiceNumber(store, 'b1', numbering, oct)
  assert.deepEqual(first, { invoiceNumber: 'TRV/26-27/00001', invoiceDate: '2026-10-21', created: true })
  // Same booking again: keeps its number, the counter doesn't move
  const again = await assignInvoiceNumber(store, 'b1', numbering, oct)
  assert.equal(again?.invoiceNumber, 'TRV/26-27/00001')
  assert.equal(again?.created, false)

  // Two payments confirming at once still get distinct consecutive numbers
  const [second, third] = await Promise.all([
    assignInvoiceNumber(store, 'b2', numbering, oct),
    assignInvoiceNumber(store, 'b3', numbering, oct),
  ])
  assert.deepEqual([second?.invoiceNumber, third?.invoiceNumber].sort(), ['TRV/26-27/00002', 'TRV/26-27/00003'])

  // Stored on the row, which still reads normally through the query layer
  const row = await admin.from('bookings').select('booking_reference, invoice_number, invoice_date, total_amount').eq('id', 'b1').single()
  assert.deepEqual(row.data, { booking_reference: 'BK-1', invoice_number: 'TRV/26-27/00001', invoice_date: '2026-10-21', total_amount: 2500 })

  // A new financial year starts a new series; 31 Mar 23:00 IST is still the old year
  await admin.from('bookings').insert([{ ...base, id: 'b4', booking_reference: 'BK-4' }, { ...base, id: 'b5', booking_reference: 'BK-5' }])
  assert.equal((await assignInvoiceNumber(store, 'b4', numbering, new Date('2027-03-31T17:30:00Z')))?.invoiceNumber, 'TRV/26-27/00004')
  assert.equal((await assignInvoiceNumber(store, 'b5', numbering, new Date('2027-04-01T00:00:00Z')))?.invoiceNumber, 'TRV/27-28/00001')

  // Payment verify and the webhook numbering the same booking at once: one number, no gap after it
  await admin.from('bookings').insert([{ ...base, id: 'b6', booking_reference: 'BK-6' }, { ...base, id: 'b7', booking_reference: 'BK-7' }])
  const april = new Date('2027-04-02T06:00:00Z')
  const [viaVerify, viaWebhook] = await Promise.all([
    assignInvoiceNumber(store, 'b6', numbering, april),
    assignInvoiceNumber(store, 'b6', numbering, april),
  ])
  assert.equal(viaVerify?.invoiceNumber, 'TRV/27-28/00002')
  assert.equal(viaWebhook?.invoiceNumber, 'TRV/27-28/00002')
  assert.equal((await assignInvoiceNumber(store, 'b7', numbering, april))?.invoiceNumber, 'TRV/27-28/00003')

  assert.equal(await assignInvoiceNumber(store, 'missing', numbering, oct), null)
  assert.equal(financialYear('2027-01-15'), '26-27')
})

test('booking confirmation is claimed once, even when verify and the webhook race', async () => {
  const { store, admin } = setup()
  await seedHotels(admin)
  await admin.from('bookings').insert({
    id: 'paid-1', booking_reference: 'BK-PAID', guest_first_name: 'G', guest_last_name: 'X', guest_phone: '+919876543210',
    hotel_id: 'h1', room_type_id: 'rt1', check_in_date: '2026-11-01', check_out_date: '2026-11-02', num_adults: 1,
    price_per_night: 1, total_amount: 1.07, payment_status: 'paid', booking_status: 'confirmed',
  })
  const claim = () => claimOnce(store, 'booking-confirmed_paid-1', { booking_id: 'paid-1' })

  const [viaVerify, viaWebhook] = await Promise.all([claim(), claim()])
  assert.equal([viaVerify, viaWebhook].filter(Boolean).length, 1)
  assert.equal(await claim(), false)
  assert.ok(store.paths().includes('_claims/booking-confirmed_paid-1'))
  await assert.rejects(claimOnce(store, 'bad/key'))

  // Opt-in defaults to no: only a ticked checkbox lets us WhatsApp the guest
  const row = await admin.from('bookings').select('whatsapp_opt_in').eq('id', 'paid-1').single()
  assert.equal(row.data.whatsapp_opt_in, false)
})

test('nested layout: child rows live under their parent document', async () => {
  const { store, admin } = setup()
  await seedHotels(admin)
  await admin.from('room_type_images').insert({ id: 'img1', room_type_id: 'rt1', image_url: 'x' })

  const paths = store.paths()
  assert.ok(paths.includes('hotels/h1'))
  assert.ok(paths.includes('hotels/h1/room_types/rt1'))
  assert.ok(paths.includes('hotels/h1/room_types/rt1/room_type_images/img1'))
  assert.ok(paths.some((p) => /^hotels\/h1\/hotel_images\/[^/]+$/.test(p)))
  assert.ok(!paths.some((p) => p.startsWith('room_types/')))

  // NULL columns are not stored, but read back as null
  assert.equal('website' in store.raw('hotels/h1')!, false)
  const hotel = await admin.from('hotels').select('website').eq('id', 'h1').single()
  assert.equal(hotel.data.website, null)

  // Lookups without the parent id (collection group) and with it (subcollection)
  const byId = await admin.from('room_type_images').select('id, room_type_id').eq('id', 'img1').single()
  assert.deepEqual(byId.data, { id: 'img1', room_type_id: 'rt1' })
  const byParent = await admin.from('room_types').select('id').eq('hotel_id', 'h1').order('id')
  assert.deepEqual(byParent.data.map((r: any) => r.id), ['rt1', 'rt2'])
  const all = await admin.from('room_types').select('id').order('id')
  assert.deepEqual(all.data.map((r: any) => r.id), ['rt1', 'rt2', 'rt3'])

  // A child needs an existing parent (foreign key)
  const orphan = await admin.from('room_types').insert({ hotel_id: 'missing', name: 'X', max_occupancy: 1, max_adults: 1, base_price: 1 })
  assert.equal(orphan.error?.code, '23503')

  // Updating a nested row keeps it in place; moving it to another parent is refused
  const renamed = await admin.from('room_types').update({ name: 'Deluxe King' }).eq('id', 'rt1').select('name').single()
  assert.equal(renamed.data.name, 'Deluxe King')
  assert.equal(store.raw('hotels/h1/room_types/rt1')!.name, 'Deluxe King')
  const moved = await admin.from('room_types').update({ hotel_id: 'h3' }).eq('id', 'rt1')
  assert.equal(moved.error?.code, '0A000')

  // Deleting the hotel removes its whole subtree
  await admin.from('hotels').delete().eq('id', 'h1')
  assert.ok(!store.paths().some((p) => p.startsWith('hotels/h1')))

  // An id re-created under another parent is still found (remembered paths aren't trusted blindly)
  await admin.from('room_types').insert({ id: 'rt1', hotel_id: 'h3', name: 'Reborn', max_occupancy: 1, max_adults: 1, base_price: 1 })
  const reborn = await admin.from('room_types').select('name, hotel_id').eq('id', 'rt1').single()
  assert.deepEqual(reborn.data, { name: 'Reborn', hotel_id: 'h3' })
})

test('rpc get_blogs_with_author joins author emails', async () => {
  const { store, admin } = setup()
  await store.transaction(async (tx) => tx.set('_auth_users/author-1', { id: 'author-1', email: 'a@x.com' }))
  await admin.from('blogs').insert({ title: 'Hello', slug: 'hello', content: '<p>x</p>', author_id: 'author-1' })
  const { data, error } = await admin.rpc('get_blogs_with_author')
  assert.equal(error, null)
  assert.equal(data[0].author_email, 'a@x.com')
  assert.equal(data[0].status, 'draft')
})
