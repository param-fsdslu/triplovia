import 'server-only'
import { createAdminClient } from '@/lib/db/server'
import { isHotelCancellationPolicy } from '@/lib/config/hotel-cancellation-policy'

/** Read once from the server for every checkout; never accept policy terms from a client. */
export async function snapshotHotelPolicy(hotelId: string) {
  const { data: hotel, error } = await createAdminClient({ fresh: true }).from('hotels')
    .select('cancellation_policy, check_in_from_time').eq('id', hotelId).single()
  if (error || !hotel) throw new Error('Could not load hotel cancellation policy')
  if (hotel.cancellation_policy && !isHotelCancellationPolicy(hotel.cancellation_policy)) throw new Error('Invalid hotel cancellation policy')
  return {
    cancellation_policy: hotel.cancellation_policy || 'legacy',
    cancellation_check_in_time: hotel.cancellation_policy ? (hotel.check_in_from_time || '14:00') : null,
  }
}
