import { NextRequest, NextResponse } from 'next/server'
import { createBoatBooking } from '@/lib/actions/boat-bookings'
import type { CreateBoatBookingData } from '@/lib/types'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { isValidPhone } from '@/lib/utils'

const handler = async (request: NextRequest) => {
  try {
    const body: CreateBoatBookingData = await request.json()

    if (!body.boatId || !body.tripTypeId || !body.timeSlotId) {
      return NextResponse.json(
        { error: 'Missing required boat, trip type, or time slot information' },
        { status: 400 }
      )
    }

    if (!body.guestFirstName || !body.guestLastName || !body.guestEmail || !body.guestPhone) {
      return NextResponse.json(
        { error: 'Missing required guest information' },
        { status: 400 }
      )
    }

    if (!isValidPhone(body.guestPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number' },
        { status: 400 }
      )
    }

    if (!body.tripDate) {
      return NextResponse.json(
        { error: 'Missing required trip date' },
        { status: 400 }
      )
    }

    const result = await createBoatBooking(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create boat booking' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        bookingReference: result.bookingReference,
        bookingId: result.bookingId,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withApiLogging(handler, 'boat-bookings')
