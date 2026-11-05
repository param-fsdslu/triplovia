import { NextResponse } from 'next/server'
import { BoatService } from '@/lib/services/boat.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'

const handler = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    const tripTypeId = searchParams.get('tripTypeId')
    const date = searchParams.get('date')

    if (!tripTypeId || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing tripTypeId or date parameter' },
        { status: 400 }
      )
    }

    const slots = await BoatService.getAvailableSlots(tripTypeId, date)

    return NextResponse.json({
      success: true,
      data: slots,
    })
  } catch (error: any) {
    console.error('Error checking boat availability:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check availability',
      },
      { status: 500 }
    )
  }
}

export const GET = withApiLogging(handler, 'boats/availability')
