import { NextResponse } from 'next/server'
import { HotelService } from '@/lib/services/hotel.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { FEATURED_STAYS_LIMIT } from '@/lib/config/featured'

const handler = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    // getFeaturedHotels keeps it within 1…FEATURED_STAYS_LIMIT
    const limit = parseInt(searchParams.get('limit') || '') || FEATURED_STAYS_LIMIT

    // Only this city's featured stays (the homepage passes the search box's destination)
    const city = searchParams.get('city')?.trim() || null

    const hotels = await HotelService.getFeaturedHotels(limit, city)

    return NextResponse.json({
      success: true,
      data: hotels,
      count: hotels.length,
    })
  } catch (error: any) {
    console.error('Unexpected error in featured hotels API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        data: [],
      },
      { status: 500 }
    )
  }
}

export const GET = withApiLogging(handler, 'hotels/featured')
