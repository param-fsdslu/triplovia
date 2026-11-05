import { NextResponse } from 'next/server'
import { BoatService } from '@/lib/services/boat.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'

const handler = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6')

    const boats = await BoatService.getFeaturedBoats(limit)

    return NextResponse.json({
      success: true,
      data: boats,
      count: boats.length,
    })
  } catch (error: any) {
    console.error('Unexpected error in featured boats API:', error)
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

export const GET = withApiLogging(handler, 'boats/featured')
