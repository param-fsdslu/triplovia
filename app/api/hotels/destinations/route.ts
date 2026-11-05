import { NextResponse } from 'next/server'
import { HotelService } from '@/lib/services/hotel.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'

/** Places (city / district / state) with active stays, and the stays: the hero destination search */
const handler = async () => {
  try {
    const data = await HotelService.getDestinationIndex()
    return NextResponse.json(
      { success: true, data },
      // Short and without stale-while-revalidate, so browsers don't keep showing an old list
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } }
    )
  } catch (error: any) {
    console.error('Unexpected error in destinations API:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred', data: { places: [], stays: [] } },
      { status: 500 }
    )
  }
}

export const GET = withApiLogging(handler, 'hotels/destinations')
