'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { verifyHotelAccess, requireHotelAdminPermission } from './_helpers'
import type { PriceRule } from '@/lib/types'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/** Open-ended date range used for weekend rules, which apply indefinitely until changed. */
const WEEKEND_VALID_FROM = '2020-01-01'
const WEEKEND_VALID_TO = '2099-12-31'

/**
 * Fetch all price rules (weekend + festival/long_weekend/custom) for a hotel,
 * with room type name for display. Ordered by room type, then start date.
 */
export async function getRoomPriceRules(hotelId: string): Promise<{
  success: boolean
  rules?: (PriceRule & { room_type_name: string })[]
  error?: string
}> {
  try {
    await requireAdmin()
    await verifyHotelAccess(hotelId)

    const db = await createClient()

    const { data, error } = await db
      .from('price_rules')
      .select('*, room_type:room_types!inner(name, hotel_id)')
      .eq('room_type.hotel_id', hotelId)
      .order('valid_from', { ascending: true })

    if (error) throw new Error(error.message)

    const rules = (data || []).map((r: any) => ({
      ...r,
      room_type_name: r.room_type?.name ?? 'Unknown',
    }))

    return { success: true, rules }
  } catch (err: any) {
    serverLog.error('Error fetching price rules:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Sets (or clears) weekend pricing for a room type. Replaces any existing
 * weekend rows for this room type with fresh ones for the given weekdays.
 * Pass price=null or an empty weekendDays array to disable weekend pricing.
 */
export async function setWeekendPricing(data: {
  hotel_id: string
  room_type_id: string
  weekend_days: number[]
  price: number | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await verifyHotelAccess(data.hotel_id)
    await requireHotelAdminPermission('room_pricing')

    if (data.weekend_days.some((d) => d < 0 || d > 6)) {
      throw new Error('Invalid day of week')
    }
    if (data.price !== null && data.price < 0) {
      throw new Error('Price cannot be negative')
    }

    const db = await createClient()

    const { error: deleteError } = await db
      .from('price_rules')
      .delete()
      .eq('room_type_id', data.room_type_id)
      .eq('price_type', 'weekend')

    if (deleteError) throw new Error(deleteError.message)

    if (data.price !== null && data.weekend_days.length > 0) {
      const { data: user } = await db.auth.getUser()
      const rows = data.weekend_days.map((day_of_week) => ({
        room_type_id: data.room_type_id,
        valid_from: WEEKEND_VALID_FROM,
        valid_to: WEEKEND_VALID_TO,
        price_per_night: data.price,
        day_of_week,
        price_type: 'weekend' as const,
        label: 'Weekend',
        is_active: true,
        created_by: user?.user?.id || null,
      }))

      const { error: insertError } = await db.from('price_rules').insert(rows)
      if (insertError) throw new Error(insertError.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels/${data.hotel_id}`)
    return { success: true }
  } catch (err: any) {
    serverLog.error('Error setting weekend pricing:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Creates a festival / long_weekend / custom date-range price override.
 * Rejects overlap with any existing non-weekend rule for the same room type.
 */
export async function createPriceOverride(data: {
  hotel_id: string
  room_type_id: string
  start_date: string
  end_date: string
  price: number
  label: string
  price_type: 'festival' | 'long_weekend' | 'custom'
}): Promise<{ success: boolean; rule?: PriceRule; error?: string }> {
  try {
    await requireAdmin()
    await verifyHotelAccess(data.hotel_id)
    await requireHotelAdminPermission('room_pricing')

    if (data.price < 0) throw new Error('Price cannot be negative')
    if (data.end_date < data.start_date) throw new Error('End date must be on or after start date')
    if (!data.label.trim()) throw new Error('Label is required')

    const db = await createClient()

    const { data: overlapping, error: overlapError } = await db
      .from('price_rules')
      .select('id, valid_from, valid_to, label')
      .eq('room_type_id', data.room_type_id)
      .neq('price_type', 'weekend')
      .lte('valid_from', data.end_date)
      .gte('valid_to', data.start_date)

    if (overlapError) throw new Error(overlapError.message)

    if (overlapping && overlapping.length > 0) {
      const conflicts = overlapping
        .map((r) => `${r.label || 'override'} (${r.valid_from} – ${r.valid_to})`)
        .join(', ')
      throw new Error(
        `A price override already exists for this room type that overlaps the requested dates: ${conflicts}. ` +
        `Delete or adjust the existing override first.`
      )
    }

    const { data: user } = await db.auth.getUser()

    const { data: rule, error } = await db
      .from('price_rules')
      .insert({
        room_type_id: data.room_type_id,
        valid_from: data.start_date,
        valid_to: data.end_date,
        price_per_night: data.price,
        day_of_week: null,
        price_type: data.price_type,
        label: data.label.trim(),
        is_active: true,
        created_by: user?.user?.id || null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/hotels/${data.hotel_id}`)
    return { success: true, rule }
  } catch (err: any) {
    serverLog.error('Error creating price override:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Deletes a price rule (weekend row or date-range override).
 */
export async function deletePriceRule(
  ruleId: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await verifyHotelAccess(hotelId)
    await requireHotelAdminPermission('room_pricing')

    const db = await createClient()

    // Scope the delete to room types belonging to this hotel for safety.
    const { data: roomTypeIds } = await db
      .from('room_types')
      .select('id')
      .eq('hotel_id', hotelId)

    const validIds = (roomTypeIds || []).map((rt) => rt.id)

    const { error } = await db
      .from('price_rules')
      .delete()
      .eq('id', ruleId)
      .in('room_type_id', validIds)

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/hotels/${hotelId}`)
    return { success: true }
  } catch (err: any) {
    serverLog.error('Error deleting price rule:', err)
    return { success: false, error: err.message }
  }
}
