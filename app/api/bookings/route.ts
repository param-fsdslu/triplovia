import { NextRequest, NextResponse } from 'next/server'
import { createBooking, CreateBookingData } from '@/lib/actions/bookings'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { isValidEmail, isValidPhone, parseGstDetails } from '@/lib/utils'

const handler = async (request: NextRequest) => {
  try {
    const body: CreateBookingData = await request.json()

    if (!body.hotelId || !body.roomTypeId) {
      return NextResponse.json(
        { error: 'Missing required hotel or room information' },
        { status: 400 }
      )
    }

    // Email is optional: a guest can book with just a mobile number
    if (!body.guestFirstName || !body.guestLastName || !body.guestPhone) {
      return NextResponse.json(
        { error: 'Missing required guest information' },
        { status: 400 }
      )
    }

    if (body.guestEmail && !isValidEmail(body.guestEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const gst = parseGstDetails(body.gstDetails)
    if (!gst.ok) {
      return NextResponse.json({ error: gst.error }, { status: 400 })
    }

    if (!isValidPhone(body.guestPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number' },
        { status: 400 }
      )
    }

    if (!body.checkInDate || !body.checkOutDate) {
      return NextResponse.json(
        { error: 'Missing required date information' },
        { status: 400 }
      )
    }

    const result = await createBooking(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create booking' },
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

export const POST = withApiLogging(handler, 'bookings')
