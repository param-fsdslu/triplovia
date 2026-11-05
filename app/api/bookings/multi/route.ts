import { snapshotHotelPolicy } from '@/lib/services/hotel-policy.service'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/db/server'
import { guestAccessHash, saveGuestStay } from '@/lib/services/guest-checkout.service'
import { normalizeIndianMobile } from '@/lib/utils/phone'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { isValidEmail, isValidPhone, parseGstDetails, type GstDetailsInput, getRoomGstRate, MEAL_GST_RATE, isWithinBookingWindow, MAX_BOOKING_MONTHS_AHEAD, calculateGuestCharges, calculateRoomStayPricing, type PriceRuleInput } from '@/lib/utils'
import { occupancyError, occupancyLimits, splitGuests, type RoomGuests } from '@/lib/utils/occupancy'

/**
 * POST /api/bookings/multi
 *
 * Creates one booking record per room type in a single request, sharing the same
 * guest info and dates. Each room type carries its own guests (rooms[].numAdults /
 * numChildren, checked against what its rooms take; older clients send only the party, shared
 * out here) and pays for its own extra guests: extra beds for adults, the child price for
 * children aged 6–11 (`childrenAges`, in room order; 1–5 free). Room GST is computed per-room-type based on each
 * room's base_price slab (0% / 5% / 18%).  Meal GST is a flat 5% on the meal total.
 * The last booking absorbs any rounding residual so that sum(total_amount) == grand total.
 *
 * Returns { bookingIds, primaryBookingReference, totalAmount } on success.
 */

interface RoomSelection {
  roomTypeId: string
  numRooms: number
  /** This room type's own guests (the review page sends them) */
  numAdults?: number
  numChildren?: number
}

interface BookingMealPlan {
  mealPlanId: string
  mealType: string
  name: string
  pricePerPerson: number
  childPricePerPerson?: number
  numGuests: number
  numNights: number
  totalAmount: number
}

interface MultiBookingBody {
  userId?: string
  hotelId: string
  rooms: RoomSelection[]
  guestFirstName: string
  guestLastName: string
  guestEmail?: string
  /** Optional GST details for a company invoice */
  gstDetails?: GstDetailsInput
  /** The guest agreed to booking messages on WhatsApp */
  whatsappOptIn?: boolean
  /** Travelling with pets */
  withPets?: boolean
  guestPhone: string
  checkInDate: string
  checkOutDate: string
  numAdults: number
  numChildren: number
  /** One per child (1–11), in the order of `rooms`; a missing one counts as 6–11 */
  childrenAges?: Array<number | null>
  specialRequests?: string
  mealPlanTotal?: number
  mealPlans?: BookingMealPlan[]
}

const handler = async (request: NextRequest) => {
  try {
    const body: MultiBookingBody = await request.json()

    // ── Basic validation ────────────────────────────────────────────────────
    if (!body.hotelId || !body.rooms?.length) {
      return NextResponse.json(
        { error: 'Missing hotel or room information' },
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

    // Optional GST details: stored on every booking of the group, for the property's invoice
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

    if (!isWithinBookingWindow(body.checkInDate)) {
      return NextResponse.json(
        { error: `Bookings can only be made up to ${MAX_BOOKING_MONTHS_AHEAD} months in advance` },
        { status: 400 }
      )
    }

    // Fresh reads (no catalogue cache): room prices and capacity decide the charge
    const db = await createClient({ fresh: true })
    const admin = createAdminClient({ fresh: true })

    // The account comes from the session, never the request body. No session = guest checkout:
    // the booking is kept under the mobile number and only this browser can pay for it.
    const {
      data: { user },
    } = await db.auth.getUser()
    const guestPhone = normalizeIndianMobile(body.guestPhone) ?? body.guestPhone
    const guestAccess = user ? null : await guestAccessHash()
    // Guest rows are hidden by row policies, so they're written with the admin client
    const writer = user ? db : admin

    // ── Fetch & validate all room types ─────────────────────────────────────
    const roomTypeIds = body.rooms.map((r) => r.roomTypeId)

    const { data: roomTypes, error: rtError } = await db
      .from('room_types')
      .select('id, name, base_price, num_available_rooms, hotel_id, standard_occupancy, max_occupancy, max_adults, max_children, extra_bed_price, child_price')
      .in('id', roomTypeIds)
      .eq('hotel_id', body.hotelId)
      .eq('status', 'available')

    if (rtError || !roomTypes || roomTypes.length !== roomTypeIds.length) {
      return NextResponse.json(
        { error: 'One or more room types not found or unavailable' },
        { status: 400 }
      )
    }

    const roomTypeMap = new Map(roomTypes.map((rt) => [rt.id, rt]))

    // ── Occupancy: never more guests than the rooms take ─────────────────────
    const perRoomGuests = body.rooms.every((r) => r.numAdults !== undefined && r.numChildren !== undefined)
    const partyAdults = Number(body.numAdults)
    const partyChildren = Number(body.numChildren) || 0
    const roomGuests: RoomGuests[] = perRoomGuests
      ? body.rooms.map((sel) => ({ adults: Number(sel.numAdults), children: Number(sel.numChildren) }))
      : splitGuests(
          body.rooms.map((sel) => ({ room: roomTypeMap.get(sel.roomTypeId)!, qty: sel.numRooms })),
          partyAdults,
          partyChildren
        )
    const totalAdults = roomGuests.reduce((sum, g) => sum + g.adults, 0)
    const totalChildren = roomGuests.reduce((sum, g) => sum + g.children, 0)
    if (!perRoomGuests && (totalAdults !== partyAdults || totalChildren !== partyChildren)) {
      const capacity = body.rooms.reduce(
        (sum, sel) => sum + occupancyLimits(roomTypeMap.get(sel.roomTypeId)!, sel.numRooms).total,
        0
      )
      return NextResponse.json({ error: `These rooms take up to ${capacity} guests in total` }, { status: 400 })
    }
    for (let i = 0; i < body.rooms.length; i++) {
      const sel = body.rooms[i]
      const occupancy = occupancyError(roomTypeMap.get(sel.roomTypeId)!, sel.numRooms, roomGuests[i])
      if (occupancy) return NextResponse.json({ error: occupancy }, { status: 400 })
    }

    // The children's ages price their charges; a missing or odd one counts as 6–11 (charged)
    const childAges = Array.from({ length: totalChildren }, (_, i) => {
      const age = Number(body.childrenAges?.[i])
      return Number.isInteger(age) && age >= 0 && age <= 17 ? age : null
    })

    // ── Availability check per room type ─────────────────────────────────────
    for (const selection of body.rooms) {
      const rt = roomTypeMap.get(selection.roomTypeId)!

      // Everyone's bookings count, not just the ones the caller may read
      const { data: overlapping } = await admin
        .from('bookings')
        .select('num_rooms')
        .eq('room_type_id', selection.roomTypeId)
        .in('booking_status', ['confirmed', 'pending'])
        .in('payment_status', ['paid', 'pending', 'processing'])
        .lt('check_in_date', body.checkOutDate)
        .gt('check_out_date', body.checkInDate)

      const bookedRooms = (overlapping || []).reduce((s, b) => s + (b.num_rooms || 1), 0)

      // Also subtract rooms blocked by inventory blocks that overlap the requested dates
      const { data: inventoryBlocks } = await db
        .from('room_inventory_blocks')
        .select('rooms_blocked')
        .eq('room_type_id', selection.roomTypeId)
        .lte('start_date', body.checkOutDate)
        .gte('end_date', body.checkInDate)

      const blockedRooms = (inventoryBlocks || []).reduce(
        (s, b: { rooms_blocked: number }) => s + (b.rooms_blocked || 0), 0
      )
      const available = (rt.num_available_rooms || 0) - bookedRooms - blockedRooms

      if (selection.numRooms > available) {
        const msg =
          available <= 0
            ? `No ${rt.name} rooms available for the selected dates`
            : `Only ${available} ${rt.name} room${available === 1 ? '' : 's'} available for the selected dates`
        return NextResponse.json({ error: msg }, { status: 409 })
      }
    }

    // ── Pricing: per-room-type GST (slab based on each room's base_price) ────
    const checkIn = new Date(body.checkInDate)
    const checkOut = new Date(body.checkOutDate)
    const nights = Math.ceil(
      Math.abs(checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )

    const mealPlanTotal = body.mealPlanTotal || 0

    // Weekend/festival/long-weekend/custom price rules — fetched server-side
    // and applied authoritatively; the client's dates are never trusted for pricing.
    const { data: priceRulesData } = await db
      .from('price_rules')
      .select('*')
      .in('room_type_id', roomTypeIds)
      .eq('is_active', true)
      .lte('valid_from', body.checkOutDate)
      .gte('valid_to', body.checkInDate)
    const priceRules = (priceRulesData || []) as PriceRuleInput[]

    // Per-room-type breakdown: subtotal (nightly rates resolved), GST rate, and tax components
    const roomBreakdowns = body.rooms.map((sel) => {
      const rt = roomTypeMap.get(sel.roomTypeId)!
      const { subtotal } = calculateRoomStayPricing(rt, body.checkInDate, body.checkOutDate, sel.numRooms, priceRules)
      const gstRate = getRoomGstRate(rt.base_price)
      const gstAmount = subtotal * gstRate
      const serviceCharge = subtotal * 0.06
      const gstOnServiceCharge = serviceCharge * 0.18
      const totalTax = gstAmount + serviceCharge + gstOnServiceCharge
      return { subtotal, gstRate, gstAmount, serviceCharge, gstOnServiceCharge, totalTax }
    })

    const mealGst = mealPlanTotal * MEAL_GST_RATE

    // Per room type for its own guests, on its own booking: extra beds for adults beyond the
    // included places, the child price for children aged 6–11 (their ages taken in room order)
    let agesUsed = 0
    const extraBedCharges = body.rooms.map((sel, i) => {
      const rt = roomTypeMap.get(sel.roomTypeId)!
      const ages = childAges.slice(agesUsed, agesUsed + roomGuests[i].children)
      agesUsed += roomGuests[i].children
      return calculateGuestCharges(
        {
          qty: sel.numRooms,
          standardOccupancy: rt.standard_occupancy,
          extraBedPrice: rt.extra_bed_price,
          childPrice: rt.child_price,
        },
        roomGuests[i].adults,
        ages,
        nights
      ).total
    })
    const extraBedCharge = extraBedCharges.reduce((sum, c) => sum + c, 0)

    const grandTotal =
      roomBreakdowns.reduce((s, r) => s + r.subtotal + r.totalTax, 0) +
      mealPlanTotal + mealGst + extraBedCharge

    // ── Create booking records ────────────────────────────────────────────────
    const policySnapshot = await snapshotHotelPolicy(body.hotelId)
    const bookingIds: string[] = []
    let primaryBookingReference = ''
    let runningTotal = 0

    for (let i = 0; i < body.rooms.length; i++) {
      const selection = body.rooms[i]
      const bd = roomBreakdowns[i]

      // Meal plan total (and its GST) is attached to the first booking only
      const thisMealPlanTotal = i === 0 ? mealPlanTotal : 0
      const thisMealGst = i === 0 ? mealGst : 0
      const thisExtraBedCharge = extraBedCharges[i]

      // Last booking absorbs any rounding residual to ensure exact grand total
      const thisBase = bd.subtotal + thisMealPlanTotal + thisExtraBedCharge
      const thisPreTotal = Math.round((thisBase + bd.totalTax + thisMealGst) * 100) / 100
      const isLast = i === body.rooms.length - 1
      const thisTotal = isLast
        ? Math.round((grandTotal - runningTotal) * 100) / 100
        : thisPreTotal

      const thisGstAmount = Math.round((bd.gstAmount + thisMealGst) * 100) / 100
      const thisServiceCharge = Math.round(bd.serviceCharge * 100) / 100
      const thisGstOnSC = Math.round(bd.gstOnServiceCharge * 100) / 100

      // Generate unique booking reference
      const reference = await generateBookingReference(admin)
      if (i === 0) primaryBookingReference = reference

      const { data: booking, error: insertError } = await writer
        .from('bookings')
        .insert({
          ...policySnapshot,
          booking_reference: reference,
          user_id: user?.id ?? null,
          guest_access_hash: guestAccess,
          hotel_id: body.hotelId,
          room_type_id: selection.roomTypeId,
          guest_first_name: body.guestFirstName,
          guest_last_name: body.guestLastName,
          guest_email: body.guestEmail?.trim() || null,
          guest_phone: guestPhone,
          whatsapp_opt_in: body.whatsappOptIn === true,
          with_pets: body.withPets === true,
          ...gst.value,
          check_in_date: body.checkInDate,
          check_out_date: body.checkOutDate,
          num_adults: roomGuests[i].adults,
          num_children: roomGuests[i].children,
          num_rooms: selection.numRooms,
          price_per_night: Math.round((bd.subtotal / nights / selection.numRooms) * 100) / 100,
          tax_amount: thisGstAmount,
          service_fee: thisServiceCharge + thisGstOnSC,
          meal_plan_total: thisMealPlanTotal,
          extra_bed_charge: thisExtraBedCharge,
          total_amount: thisTotal,
          special_requests: body.specialRequests || null,
          booking_status: 'pending',
          payment_status: 'pending',
        })
        .select('id, booking_reference')
        .single()

      if (insertError || !booking) {
        // Rollback previously created bookings
        if (bookingIds.length > 0) {
          await writer.from('bookings').delete().in('id', bookingIds)
        }
        console.error('Error creating booking:', insertError)
        return NextResponse.json(
          { error: 'Failed to create booking. Please try again.' },
          { status: 500 }
        )
      }

      bookingIds.push(booking.id)
      runningTotal += thisTotal

      // Attach meal plan detail rows to the primary booking only
      if (i === 0 && body.mealPlans && body.mealPlans.length > 0) {
        const rows = body.mealPlans.map((mp) => ({
          booking_id: booking.id,
          meal_plan_id: mp.mealPlanId,
          meal_type: mp.mealType,
          name: mp.name,
          price_per_person: mp.pricePerPerson,
          num_guests: mp.numGuests,
          num_nights: mp.numNights,
          total_amount: mp.totalAmount,
        }))

        const { error: mpError } = await writer.from('booking_meal_plans').insert(rows)
        if (mpError) {
          console.error('Error inserting meal plans (non-fatal):', mpError)
        }
      }
    }

    // Guests: keep the rooms under their number too, so they're there after signing in with it
    if (!user && guestPhone.startsWith('+')) {
      await saveGuestStay({
        phone: guestPhone,
        hotelId: body.hotelId,
        rooms: body.rooms.map((r) => ({ roomId: r.roomTypeId, qty: r.numRooms })),
        checkIn: body.checkInDate,
        checkOut: body.checkOutDate,
        adults: totalAdults,
        children: totalChildren,
        pets: body.withPets === true,
      })
    }

    return NextResponse.json(
      {
        success: true,
        bookingIds,
        primaryBookingReference,
        totalAmount: grandTotal,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Multi-booking API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateBookingReference(db: any): Promise<string> {
  let reference: string
  let exists = true

  while (exists) {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
    reference = `BK-${dateStr}-${randomStr}`

    const { data } = await db
      .from('bookings')
      .select('id')
      .eq('booking_reference', reference)
      .single()

    exists = !!data
  }

  return reference!
}

export const POST = withApiLogging(handler, 'bookings/multi')
