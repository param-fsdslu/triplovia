import { NextResponse } from 'next/server'
import { HotelService } from '@/lib/services/hotel.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'

const handler = async (
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) => {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const checkIn = searchParams.get('checkIn') || undefined
    const checkOut = searchParams.get('checkOut') || undefined
    const hotel = await HotelService.getHotelBySlug(slug, checkIn, checkOut)

    if (!hotel) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hotel not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: hotel,
    })
  } catch (error: any) {
    console.error('Error fetching hotel:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch hotel',
      },
      { status: 500 }
    )
  }
}

export const GET = withApiLogging(handler, 'hotels/slug/[slug]')
