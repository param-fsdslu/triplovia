'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { verifyHotelAccess } from './_helpers'
import type { InventorySource, RoomInventoryBlock } from '@/lib/types'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Update inventory source for a hotel (manual | api).
 * Super admin only — hotel admins cannot change their own inventory mode.
 */
export async function updateInventorySource(
  hotelId: string,
  source: InventorySource
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await verifyHotelAccess(hotelId)

    const db = await createClient()

    const { error } = await db
      .from('hotels')
      .update({ inventory_source: source, updated_at: new Date().toISOString() })
      .eq('id', hotelId)

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/hotels/${hotelId}`)
    revalidatePath(`${ADMIN_PATH}/hotels`)
    return { success: true }
  } catch (err: any) {
    serverLog.error('Error updating inventory source:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Fetch all inventory blocks for a hotel, with room type name for display.
 * Ordered by start_date ascending.
 */
export async function getRoomInventoryBlocks(hotelId: string): Promise<{
  success: boolean
  blocks?: (RoomInventoryBlock & { room_type_name: string })[]
  error?: string
}> {
  try {
    await requireAdmin()
    await verifyHotelAccess(hotelId)

    const db = await createClient()

    const { data, error } = await db
      .from('room_inventory_blocks')
      .select('*, room_type:room_types(name)')
      .eq('hotel_id', hotelId)
      .order('start_date', { ascending: true })

    if (error) throw new Error(error.message)

    const blocks = (data || []).map((b: any) => ({
      ...b,
      room_type_name: b.room_type?.name ?? 'Unknown',
    }))

    return { success: true, blocks }
  } catch (err: any) {
    serverLog.error('Error fetching inventory blocks:', err)
    return { success: false, error: err.message }
  }
}

function maxRoomsBookedPerNight(
  bookings: { check_in_date: string; check_out_date: string; num_rooms: number | null }[],
  startDate: string,
  endDate: string
): number {
  let max = 0
  const cursor = new Date(`${startDate}T00:00:00Z`)
  const last = new Date(`${endDate}T00:00:00Z`)
  while (cursor <= last) {
    const night = cursor.toISOString().slice(0, 10)
    const booked = bookings
      .filter((b) => b.check_in_date <= night && b.check_out_date > night)
      .reduce((sum, b) => sum + (b.num_rooms || 1), 0)
    max = Math.max(max, booked)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return max
}

/**
 * Create a manual inventory block (block N rooms for a date range).
 */
export async function createRoomInventoryBlock(data: {
  hotel_id: string
  room_type_id: string
  start_date: string
  end_date: string
  rooms_blocked: number
  reason?: string
}): Promise<{ success: boolean; block?: RoomInventoryBlock; error?: string }> {
  try {
    await requireAdmin()
    await verifyHotelAccess(data.hotel_id)

    if (data.rooms_blocked < 1) throw new Error('Rooms blocked must be at least 1')
    if (data.end_date < data.start_date)
      throw new Error('End date must be on or after start date')

    const db = await createClient()

    // Reject if any existing block for this room type overlaps the requested date range.
    // Overlap condition: existing.start_date <= new.end_date AND existing.end_date >= new.start_date
    const { data: overlapping, error: overlapError } = await db
      .from('room_inventory_blocks')
      .select('id, start_date, end_date, rooms_blocked')
      .eq('room_type_id', data.room_type_id)
      .lte('start_date', data.end_date)
      .gte('end_date', data.start_date)

    if (overlapError) throw new Error(overlapError.message)

    if (overlapping && overlapping.length > 0) {
      const conflicts = overlapping
        .map((b) => `${b.start_date} – ${b.end_date} (${b.rooms_blocked} room${b.rooms_blocked !== 1 ? 's' : ''})`)
        .join(', ')
      throw new Error(
        `A block already exists for this room type that overlaps the requested dates: ${conflicts}. ` +
        `Delete or adjust the existing block first.`
      )
    }

    const { data: roomType, error: rtError } = await db
      .from('room_types')
      .select('num_available_rooms, name')
      .eq('id', data.room_type_id)
      .single()

    if (rtError || !roomType) throw new Error('Room type not found')

    const { data: bookings, error: bookingsError } = await db
      .from('bookings')
      .select('check_in_date, check_out_date, num_rooms')
      .eq('room_type_id', data.room_type_id)
      .in('booking_status', ['confirmed', 'pending'])
      .in('payment_status', ['paid', 'pending', 'processing'])
      .lte('check_in_date', data.end_date)
      .gt('check_out_date', data.start_date)

    if (bookingsError) throw new Error('Failed to check existing bookings')

    const maxBookedOnAnyNight = maxRoomsBookedPerNight(
      bookings || [],
      data.start_date,
      data.end_date
    )
    const freeRooms = (roomType.num_available_rooms || 0) - maxBookedOnAnyNight
    if (data.rooms_blocked > freeRooms) {
      throw new Error(
        `Cannot block ${data.rooms_blocked} room${data.rooms_blocked !== 1 ? 's' : ''} of ${roomType.name} ` +
        `for these dates: already booked rooms leave only ${Math.max(0, freeRooms)} free. ` +
        `Booked rooms cannot be blocked.`
      )
    }

    const { data: user } = await db.auth.getUser()

    const { data: block, error } = await db
      .from('room_inventory_blocks')
      .insert({
        hotel_id: data.hotel_id,
        room_type_id: data.room_type_id,
        start_date: data.start_date,
        end_date: data.end_date,
        rooms_blocked: data.rooms_blocked,
        reason: data.reason || null,
        created_by: user?.user?.id || null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/hotels/${data.hotel_id}`)
    return { success: true, block }
  } catch (err: any) {
    serverLog.error('Error creating inventory block:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a manual inventory block.
 */
export async function deleteRoomInventoryBlock(
  blockId: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await verifyHotelAccess(hotelId)

    const db = await createClient()

    const { error } = await db
      .from('room_inventory_blocks')
      .delete()
      .eq('id', blockId)
      .eq('hotel_id', hotelId) // safety: scoped to hotel

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/hotels/${hotelId}`)
    return { success: true }
  } catch (err: any) {
    serverLog.error('Error deleting inventory block:', err)
    return { success: false, error: err.message }
  }
}
