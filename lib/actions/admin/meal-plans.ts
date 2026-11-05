'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { verifyHotelAccess, requireHotelAdminPermission } from './_helpers'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Get meal plans for a hotel
 */
export async function getHotelMealPlans(hotelId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: mealPlans, error } = await db
      .from('meal_plans')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('meal_type')
      .order('name')

    if (error) throw new Error(error.message)

    return { success: true, mealPlans: mealPlans || [] }
  } catch (error: any) {
    serverLog.error('Error fetching meal plans:', error)
    return { success: false, error: error.message, mealPlans: [] }
  }
}

/**
 * Create a meal plan
 */
export async function createMealPlan(data: {
  hotel_id: string
  meal_type: string
  name: string
  description?: string
  price_per_person: number
  child_price_per_person?: number
}) {
  try {
    await requireAdmin()
    await verifyHotelAccess(data.hotel_id)
    await requireHotelAdminPermission('meal_pricing')
    const db = await createClient()

    const { data: mealPlan, error } = await db
      .from('meal_plans')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`${ADMIN_PATH}/hotels/${data.hotel_id}`)

    return { success: true, mealPlan }
  } catch (error: any) {
    serverLog.error('Error creating meal plan:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a meal plan
 */
export async function updateMealPlan(
  mealPlanId: string,
  data: {
    meal_type?: string
    name?: string
    description?: string
    price_per_person?: number
    child_price_per_person?: number | null
    status?: string
  }
) {
  try {
    await requireAdmin()
    const db = await createClient()

    // Get hotel_id for access check
    const { data: existing } = await db
      .from('meal_plans')
      .select('hotel_id')
      .eq('id', mealPlanId)
      .single()

    if (!existing) throw new Error('Meal plan not found')
    await verifyHotelAccess(existing.hotel_id)
    await requireHotelAdminPermission('meal_pricing')

    const { data: mealPlan, error } = await db
      .from('meal_plans')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', mealPlanId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`${ADMIN_PATH}/hotels/${existing.hotel_id}`)

    return { success: true, mealPlan }
  } catch (error: any) {
    serverLog.error('Error updating meal plan:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a meal plan
 */
export async function deleteMealPlan(mealPlanId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    // Get hotel_id for access check
    const { data: existing } = await db
      .from('meal_plans')
      .select('hotel_id')
      .eq('id', mealPlanId)
      .single()

    if (!existing) throw new Error('Meal plan not found')
    await verifyHotelAccess(existing.hotel_id)
    await requireHotelAdminPermission('meal_pricing')

    // Check if any active bookings reference this meal plan
    const { count } = await db
      .from('booking_meal_plans')
      .select('id', { count: 'exact', head: true })
      .eq('meal_plan_id', mealPlanId)

    if (count && count > 0) {
      throw new Error('Cannot delete meal plan with existing bookings. Set it to inactive instead.')
    }

    const { error } = await db
      .from('meal_plans')
      .delete()
      .eq('id', mealPlanId)

    if (error) throw new Error(error.message)

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`${ADMIN_PATH}/hotels/${existing.hotel_id}`)

    return { success: true }
  } catch (error: any) {
    serverLog.error('Error deleting meal plan:', error)
    return { success: false, error: error.message }
  }
}
