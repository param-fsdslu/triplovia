/**
 * Adds clearly labelled test hotels to Firestore: the demo hotel (two room types, photos, a
 * breakfast plan, links to existing amenities) and a ₹1 payment test hotel, for trying a real
 * Razorpay payment end to end for about ₹1.07 (₹1 room + 6% service charge + 18% GST on it).
 * It goes through the app's data layer, so defaults, type casts and unique keys match what the
 * admin panel writes.
 *
 *   npm run seed:demo                add or refresh both test hotels (safe to re-run)
 *   npm run seed:demo -- --remove    delete them again (rooms, photos, amenities cascade)
 *   npm run seed:demo -- --dry-run   check the data against an in-memory store; writes nothing
 *
 * The hotels are active, so they are publicly listed and bookable — remove them before real
 * customers use this Firebase project.
 */
import { DbClient } from '../lib/db/client'
import { FirestoreStore } from '../lib/db/firestore-store'
import { MemoryStore, type DocStore } from '../lib/db/store'
import type { DbResponse } from '../lib/db/types'
import { adminFirestore } from '../lib/firebase/admin'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const REMOVE = args.has('--remove')

// Fixed ids so re-running updates the same documents instead of adding copies
const HOTEL_ID = 'a0de0000-0000-4000-8000-000000000001'
const DELUXE_ID = 'a0de0000-0000-4000-8000-000000000002'
const SUITE_ID = 'a0de0000-0000-4000-8000-000000000003'
// ₹1 payment test hotel
const TEST_HOTEL_ID = 'a0de0000-0000-4000-8000-000000000101'
const TEST_ROOM_ID = 'a0de0000-0000-4000-8000-000000000102'

const photo = (id: string) => `https://images.unsplash.com/${id}?w=1600&q=80`

const AMENITY_NAMES = [
  'Free WiFi',
  'Air Conditioning',
  '24-Hour Front Desk',
  'Daily Housekeeping',
  'Power Backup',
  'Flat Screen TV',
]

function must<T>(result: DbResponse<T>, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message} (${result.error.code})`)
  return result.data
}

async function main() {
  const store: DocStore = DRY_RUN ? new MemoryStore() : new FirestoreStore(adminFirestore)
  const db = new DbClient({ store, resolveActor: async () => ({ kind: 'service' }), auth: null, storage: null })

  if (REMOVE) {
    const deleted = must(await db.from('hotels').delete().in('id', [HOTEL_ID, TEST_HOTEL_ID]).select('name'), 'delete hotels')
    if (deleted.length === 0) console.log('Test hotels not found.')
    for (const hotel of deleted) console.log(`Removed "${hotel.name}" and its rooms, photos and amenities.`)
    return
  }

  must(
    await db.from('hotels').upsert({
      id: HOTEL_ID,
      name: 'Demo Stay Honnavar (Test Hotel)',
      slug: 'demo-stay-honnavar-test',
      description:
        'A demo property for testing bookings and payments. Riverside rooms a short walk from Honnavar beach, ' +
        'with breakfast, Wi-Fi and backwater boat trips nearby. Not a real hotel.',
      star_rating: 3,
      property_type: 'hotel',
      address_line_1: 'Demo Road, Near Honnavar Port',
      city: 'Honnavar',
      state: 'Karnataka',
      country: 'India',
      postal_code: '581334',
      latitude: 14.2798,
      longitude: 74.4439,
      location_rating: 8.5,
      phone: '+91 90000 00000',
      email: 'demo-hotel@example.com',
      check_in_from_time: '12:00',
      check_in_to_time: '22:00',
      check_out_time: '11:00',
      cancellation_policy_text: 'Free cancellation up to 48 hours before check-in.',
      child_policy_text: 'Children of all ages are welcome.',
      pet_policy_text: 'Pets are not allowed.',
      parking_available: true,
      parking_type: 'on-site',
      parking_free: true,
      status: 'active',
    }),
    'hotel'
  )

  must(
    await db.from('room_types').upsert([
      {
        id: DELUXE_ID,
        hotel_id: HOTEL_ID,
        name: 'Deluxe Double Room',
        description: 'Queen bed, river-view balcony, air conditioning and a work desk.',
        size_sqm: 24,
        max_occupancy: 3,
        max_adults: 2,
        max_children: 1,
        standard_occupancy: 2,
        extra_bed_price: 600,
        bed_configuration: '1 Queen Bed',
        base_price: 2500,
        num_available_rooms: 5,
        status: 'available',
      },
      {
        id: SUITE_ID,
        hotel_id: HOTEL_ID,
        name: 'Family Suite',
        description: 'Two bedrooms with a sitting area, ideal for families.',
        size_sqm: 42,
        max_occupancy: 5,
        max_adults: 4,
        max_children: 2,
        standard_occupancy: 4,
        extra_bed_price: 800,
        bed_configuration: '1 King Bed + 2 Single Beds',
        base_price: 4500,
        num_available_rooms: 2,
        status: 'available',
      },
    ]),
    'room types'
  )

  must(
    await db.from('hotel_images').upsert([
      { id: 'a0de0000-0000-4000-8000-000000000011', hotel_id: HOTEL_ID, image_url: photo('photo-1566073771259-6a8506099945'), alt_text: 'Pool and garden', is_primary: true, display_order: 0 },
      { id: 'a0de0000-0000-4000-8000-000000000012', hotel_id: HOTEL_ID, image_url: photo('photo-1542314831-068cd1dbfeeb'), alt_text: 'Hotel entrance', display_order: 1 },
      { id: 'a0de0000-0000-4000-8000-000000000013', hotel_id: HOTEL_ID, image_url: photo('photo-1507525428034-b723cf961d3e'), alt_text: 'Nearby beach', display_order: 2 },
    ]),
    'hotel images'
  )

  must(
    await db.from('room_type_images').upsert([
      { id: 'a0de0000-0000-4000-8000-000000000021', room_type_id: DELUXE_ID, image_url: photo('photo-1582719478250-c89cae4dc85b'), alt_text: 'Deluxe Double Room', display_order: 0 },
      { id: 'a0de0000-0000-4000-8000-000000000022', room_type_id: SUITE_ID, image_url: photo('photo-1631049307264-da0ec9d70304'), alt_text: 'Family Suite bedroom', display_order: 0 },
      { id: 'a0de0000-0000-4000-8000-000000000023', room_type_id: SUITE_ID, image_url: photo('photo-1590490360182-c33d57733427'), alt_text: 'Family Suite sitting area', display_order: 1 },
    ]),
    'room images'
  )

  must(
    await db.from('meal_plans').upsert({
      id: 'a0de0000-0000-4000-8000-000000000031',
      hotel_id: HOTEL_ID,
      meal_type: 'breakfast',
      name: 'Breakfast Buffet',
      description: 'South Indian and continental breakfast.',
      price_per_person: 250,
      child_price_per_person: 150,
      status: 'active',
    }),
    'meal plan'
  )

  // Link amenities that already exist (copied from Supabase by the migration script)
  const amenities = must(await db.from('amenities').select('id, name').in('name', AMENITY_NAMES), 'amenities')
  const existingLinks = must(await db.from('hotel_amenities').select('amenity_id').eq('hotel_id', HOTEL_ID), 'hotel amenities')
  const linked = new Set(existingLinks.map((l: any) => l.amenity_id))
  const toLink = amenities.filter((a: any) => !linked.has(a.id))
  if (toLink.length > 0) {
    must(
      await db.from('hotel_amenities').insert(toLink.map((a: any) => ({ hotel_id: HOTEL_ID, amenity_id: a.id, is_free: true }))),
      'link amenities'
    )
  }

  // Read it back the way the hotel search does, to confirm it will be listed
  const listed = must(
    await db
      .from('hotels')
      .select('id, name, slug, hotel_images!inner(image_url), room_types!inner(name, base_price)')
      .eq('id', HOTEL_ID)
      .eq('status', 'active')
      .single(),
    'read back'
  )

  console.log(DRY_RUN ? 'Dry run OK (nothing written):' : 'Demo hotel ready:')
  console.log(`  ${listed.name}  →  /en/hotels/${listed.slug}`)
  for (const room of listed.room_types) console.log(`  • ${room.name}: ₹${room.base_price}/night`)
  console.log(`  ${listed.hotel_images.length} photos, ${amenities.length} amenities linked`)
  if (amenities.length === 0) console.log('  (no amenities yet — run the migration script first, then re-run this to link them)')

  await seedPaymentTestHotel(db, amenities)
}

/** One ₹1 room, plenty of inventory (abandoned test bookings hold rooms until the stale-booking job cancels them) */
async function seedPaymentTestHotel(db: DbClient<null, null>, amenities: Array<{ id: string }>) {
  must(
    await db.from('hotels').upsert({
      id: TEST_HOTEL_ID,
      name: '₹1 Payment Test Stay (Not a Real Hotel)',
      slug: 'payment-test-stay-1-rupee',
      description:
        'A test listing for trying a real payment end to end: one room at ₹1 a night (about ₹1.07 with the ' +
        'service charge and its GST). Not a real hotel; bookings here are not honoured.',
      star_rating: 1,
      property_type: 'hotel',
      address_line_1: 'Test Road, Near Honnavar Port',
      city: 'Honnavar',
      state: 'Karnataka',
      country: 'India',
      postal_code: '581334',
      latitude: 14.2798,
      longitude: 74.4439,
      location_rating: 5,
      phone: '+91 90000 00000',
      email: 'payment-test@example.com',
      check_in_from_time: '12:00',
      check_in_to_time: '22:00',
      check_out_time: '11:00',
      cancellation_policy_text: 'Test listing: cancel any time from My Bookings.',
      status: 'active',
    }),
    'test hotel'
  )

  must(
    await db.from('room_types').upsert({
      id: TEST_ROOM_ID,
      hotel_id: TEST_HOTEL_ID,
      name: '₹1 Test Room',
      description: 'For payment testing only. ₹1 a night before the service charge.',
      size_sqm: 12,
      max_occupancy: 2,
      max_adults: 2,
      max_children: 0,
      standard_occupancy: 2,
      extra_bed_price: 0,
      bed_configuration: '1 Double Bed',
      base_price: 1,
      num_available_rooms: 20,
      status: 'available',
    }),
    'test room type'
  )

  must(
    await db.from('hotel_images').upsert([
      { id: 'a0de0000-0000-4000-8000-000000000111', hotel_id: TEST_HOTEL_ID, image_url: photo('photo-1542314831-068cd1dbfeeb'), alt_text: 'Test hotel entrance', is_primary: true, display_order: 0 },
      { id: 'a0de0000-0000-4000-8000-000000000112', hotel_id: TEST_HOTEL_ID, image_url: photo('photo-1507525428034-b723cf961d3e'), alt_text: 'Nearby beach', display_order: 1 },
    ]),
    'test hotel images'
  )

  must(
    await db.from('room_type_images').upsert({
      id: 'a0de0000-0000-4000-8000-000000000121',
      room_type_id: TEST_ROOM_ID,
      image_url: photo('photo-1582719478250-c89cae4dc85b'),
      alt_text: '₹1 Test Room',
      display_order: 0,
    }),
    'test room image'
  )

  const existingLinks = must(await db.from('hotel_amenities').select('amenity_id').eq('hotel_id', TEST_HOTEL_ID), 'test hotel amenities')
  const linked = new Set(existingLinks.map((l: any) => l.amenity_id))
  const toLink = amenities.filter((a) => !linked.has(a.id)).slice(0, 3)
  if (toLink.length > 0) {
    must(
      await db.from('hotel_amenities').insert(toLink.map((a) => ({ hotel_id: TEST_HOTEL_ID, amenity_id: a.id, is_free: true }))),
      'link test hotel amenities'
    )
  }

  const listed = must(
    await db
      .from('hotels')
      .select('name, slug, room_types!inner(name, base_price)')
      .eq('id', TEST_HOTEL_ID)
      .eq('status', 'active')
      .single(),
    'read back test hotel'
  )
  console.log(`  ${listed.name}  →  /en/hotels/${listed.slug}`)
  for (const room of listed.room_types) console.log(`  • ${room.name}: ₹${room.base_price}/night (about ₹1.07 to pay)`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
