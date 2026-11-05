'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin, getAdminHotelAccess } from '@/lib/utils/admin'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Get admin dashboard statistics
 * Filtered by role: super_admin sees all, hotel_admin sees only their hotels
 */
export async function getAdminStats() {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()

    if (!adminAccess) {
      throw new Error('Unauthorized')
    }

    // Build hotel query based on role
    let hotelsQuery = db.from('hotels').select('*', { count: 'exact', head: true })
    if (adminAccess.hotelIds !== null) {
      hotelsQuery = hotelsQuery.in('id', adminAccess.hotelIds)
    }
    const { count: totalHotels } = await hotelsQuery

    // Build bookings query based on role
    let bookingsQuery = db.from('bookings').select('*', { count: 'exact', head: true })
    if (adminAccess.hotelIds !== null) {
      bookingsQuery = bookingsQuery.in('hotel_id', adminAccess.hotelIds)
    }
    const { count: totalBookings } = await bookingsQuery

    // Get total revenue (paid bookings only)
    let revenueQuery = db
      .from('bookings')
      .select('total_amount')
      .eq('payment_status', 'paid')
    if (adminAccess.hotelIds !== null) {
      revenueQuery = revenueQuery.in('hotel_id', adminAccess.hotelIds)
    }
    const { data: revenueData } = await revenueQuery

    const totalRevenue = revenueData?.reduce(
      (sum, booking) => sum + parseFloat(booking.total_amount),
      0
    ) || 0

    // Get bookings today
    const today = new Date().toISOString().split('T')[0]
    let bookingsTodayQuery = db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
    if (adminAccess.hotelIds !== null) {
      bookingsTodayQuery = bookingsTodayQuery.in('hotel_id', adminAccess.hotelIds)
    }
    const { count: bookingsToday } = await bookingsTodayQuery

    // Get pending bookings
    let pendingQuery = db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('booking_status', 'pending')
    if (adminAccess.hotelIds !== null) {
      pendingQuery = pendingQuery.in('hotel_id', adminAccess.hotelIds)
    }
    const { count: pendingBookings } = await pendingQuery

    // Get confirmed bookings
    let confirmedQuery = db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('booking_status', 'confirmed')
    if (adminAccess.hotelIds !== null) {
      confirmedQuery = confirmedQuery.in('hotel_id', adminAccess.hotelIds)
    }
    const { count: confirmedBookings } = await confirmedQuery

    // Get total users (only super admin can see this)
    let totalUsers = 0
    if (adminAccess.role === 'super_admin') {
      const { count } = await db
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      totalUsers = count || 0
    }

    return {
      success: true,
      stats: {
        totalHotels: totalHotels || 0,
        totalBookings: totalBookings || 0,
        totalRevenue,
        bookingsToday: bookingsToday || 0,
        pendingBookings: pendingBookings || 0,
        confirmedBookings: confirmedBookings || 0,
        totalUsers,
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching admin stats:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch statistics',
    }
  }
}

/**
 * Get recent activity
 */
export async function getRecentActivity(limit: number = 10) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: bookings, error } = await db
      .from('bookings')
      .select(
        `
        id,
        booking_reference,
        booking_status,
        payment_status,
        total_amount,
        created_at,
        guest_first_name,
        guest_last_name,
        hotel:hotels(name)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      activities: bookings || [],
    }
  } catch (error: any) {
    serverLog.error('Error fetching recent activity:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch recent activity',
      activities: [],
    }
  }
}
