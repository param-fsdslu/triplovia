import 'server-only'
import { createAdminClient } from '@/lib/db/server'

/**
 * After booking row policies authorize a read, recover its public property details even if the
 * hotel is now archived or the room type unavailable. Never use this on unverified client input.
 * Only the booking's referenced properties and a narrow display-field list are read.
 */
export async function hydrateBookingProperties<T extends { hotel_id?: string; room_type_id?: string; hotel?: any; room_type?: any }>(bookings: T[]): Promise<T[]> {
  const hotelIds = [...new Set(bookings.filter(booking => !booking.hotel && booking.hotel_id).map(booking => booking.hotel_id!))]
  const roomIds = [...new Set(bookings.filter(booking => !booking.room_type && booking.room_type_id).map(booking => booking.room_type_id!))]
  if (!hotelIds.length && !roomIds.length) return bookings
  const admin = createAdminClient({ fresh: true })
  const [hotels, rooms] = await Promise.all([
    hotelIds.length ? admin.from('hotels').select('id, name, slug, address_line_1, address_line_2, city, state, postal_code, latitude, longitude, phone, email, check_in_from_time, check_in_to_time, check_out_time, hotel_images(image_url, alt_text, is_primary, display_order)').in('id', hotelIds) : Promise.resolve({ data: [] }),
    roomIds.length ? admin.from('room_types').select('id, hotel_id, name, description, bed_configuration, max_occupancy, room_type_images(image_url, alt_text)').in('id', roomIds) : Promise.resolve({ data: [] }),
  ])
  const hotelMap = new Map((hotels.data ?? []).map(hotel => [hotel.id, hotel]))
  const roomMap = new Map((rooms.data ?? []).map(room => [room.id, room]))
  return bookings.map(booking => ({
    ...booking,
    hotel: booking.hotel ?? hotelMap.get(booking.hotel_id) ?? null,
    room_type: booking.room_type ?? roomMap.get(booking.room_type_id) ?? null,
  }))
}
