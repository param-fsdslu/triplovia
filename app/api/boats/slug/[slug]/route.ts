import { NextResponse } from 'next/server'
import { BoatService } from '@/lib/services/boat.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'

const handler = async (
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) => {
  try {
    const { slug } = await params
    const boat = await BoatService.getBoatBySlug(slug)

    if (!boat) {
      return NextResponse.json(
        {
          success: false,
          error: 'Boat not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: boat,
    })
  } catch (error: any) {
    console.error('Error fetching boat:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch boat',
      },
      { status: 500 }
    )
  }
}

export const GET = withApiLogging(handler, 'boats/slug/[slug]')
