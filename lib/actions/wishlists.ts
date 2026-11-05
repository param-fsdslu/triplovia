'use server'

import { createClient } from '@/lib/db/server'
import { serverLog } from '@/lib/utils/server-log'

export async function toggleWishlist(hotelId: string) {
  try {
    const db = await createClient()

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to manage your wishlist' }
    }

    // Check if already wishlisted
    const { data: existing } = await db
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('hotel_id', hotelId)
      .single()

    if (existing) {
      // Remove from wishlist
      const { error } = await db
        .from('wishlists')
        .delete()
        .eq('id', existing.id)

      if (error) throw error
      return { success: true, data: { wishlisted: false } }
    } else {
      // Add to wishlist
      const { error } = await db
        .from('wishlists')
        .insert({ user_id: user.id, hotel_id: hotelId })

      if (error) throw error
      return { success: true, data: { wishlisted: true } }
    }
  } catch (error: any) {
    serverLog.error('Error toggling wishlist:', error)
    return { success: false, error: error.message || 'Failed to update wishlist' }
  }
}

export async function getUserWishlist() {
  try {
    const db = await createClient()

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    const { data, error } = await db
      .from('wishlists')
      .select('hotel_id')
      .eq('user_id', user.id)

    if (error) throw error
    return { success: true, data: data.map((w) => w.hotel_id) }
  } catch (error: any) {
    serverLog.error('Error fetching wishlist:', error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getWishlistHotels() {
  try {
    const db = await createClient()

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    const { data: wishlistData, error: wishlistError } = await db
      .from('wishlists')
      .select('hotel_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (wishlistError) throw wishlistError
    if (!wishlistData || wishlistData.length === 0) {
      return { success: true, data: [] }
    }

    const hotelIds = wishlistData.map((w) => w.hotel_id)

    const { data: hotels, error: hotelsError } = await db
      .from('hotels')
      .select(`
        id,
        name,
        slug,
        description,
        star_rating,
        property_type,
        city,
        state,
        country,
        location_rating,
        nearby_places,
        hotel_images(id, image_url, alt_text, is_primary, display_order),
        room_types(base_price)
      `)
      .in('id', hotelIds)
      .eq('status', 'active')

    if (hotelsError) throw hotelsError

    // Preserve wishlist order and compute min/max price
    const hotelMap = new Map((hotels || []).map((h) => [h.id, h]))
    const ordered = hotelIds
      .map((id) => hotelMap.get(id))
      .filter(Boolean)
      .map((hotel: any) => {
        const prices = (hotel.room_types || []).map((r: any) => r.base_price).filter(Boolean)
        return {
          ...hotel,
          minPrice: prices.length ? Math.min(...prices) : 0,
          maxPrice: prices.length ? Math.max(...prices) : 0,
        }
      })

    return { success: true, data: ordered }
  } catch (error: any) {
    serverLog.error('Error fetching wishlist hotels:', error)
    return { success: false, error: error.message, data: [] }
  }
}
