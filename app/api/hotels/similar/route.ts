import { NextResponse } from 'next/server'
import { HotelService } from '@/lib/services/hotel.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'

/** GET /api/hotels/similar?hotelId=…&limit=2 — other stays in the same city, for a hotel page */
const handler = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    if (!hotelId) {
      return NextResponse.json({ success: false, error: 'hotelId is required', data: [] }, { status: 400 })
    }
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '2') || 2, 1), 6)

    const hotels = await HotelService.getSimilarHotels(hotelId, limit)

    return NextResponse.json({ success: true, data: hotels, count: hotels.length })
  } catch (error: any) {
    console.error('Unexpected error in similar hotels API:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred', data: [] },
      { status: 500 }
    )
  }
}

export const GET = withApiLogging(handler, 'hotels/similar')
