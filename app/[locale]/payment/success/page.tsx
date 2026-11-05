import { redirect } from '@/i18n/routing'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { BookingSuccess } from '@/components/booking/BookingSuccess'
import { createAdminClient, createClient } from '@/lib/db/server'
import { isGuestBookingOwner } from '@/lib/services/guest-checkout.service'

/**
 * /payment/success?bookingRef=… — shown after Razorpay payment is verified (layout in
 * components/booking/BookingSuccess). Visible to the booking's owner, or to the browser that
 * made a guest checkout. Multi-room payments share one Razorpay order, so their bookings are
 * loaded and shown together.
 */

interface SearchParams {
  searchParams: Promise<{ bookingRef?: string }>
}

const BOOKING_SELECT = `
  *,
  hotel:hotels(
    id, name, address_line_1, city, state, postal_code, phone, email, star_rating, latitude, longitude,
    check_in_from_time, check_out_time,
    hotel_images!hotel_images_hotel_id_fkey(image_url, is_primary, display_order)
  ),
  room_type:room_types(name, bed_configuration)
`

export default async function PaymentSuccessPage({ searchParams }: SearchParams) {
  const { bookingRef } = await searchParams
  if (!bookingRef) {
    redirect({ href: '/bookings', locale: 'en' })
    return
  }

  const db = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await db.auth.getUser()

  // The user's own booking, or a guest checkout made in this browser
  let booking: any = null
  if (user) {
    const { data } = await db.from('bookings').select(BOOKING_SELECT).eq('booking_reference', bookingRef).eq('user_id', user.id).maybeSingle()
    booking = data
  }
  if (!booking) {
    const { data } = await admin.from('bookings').select(BOOKING_SELECT).eq('booking_reference', bookingRef).maybeSingle()
    if (data && (await isGuestBookingOwner([data]))) booking = data
  }
  if (!booking) {
    redirect({ href: user ? '/bookings' : '/auth/login', locale: 'en' })
    return
  }

  // Rooms paid in the same payment (multi-room checkout shares one Razorpay order)
  let group: any[] = [booking]
  if (booking.razorpay_order_id) {
    const { data: siblings } = booking.user_id
      ? await db.from('bookings').select(BOOKING_SELECT).eq('razorpay_order_id', booking.razorpay_order_id).eq('user_id', booking.user_id)
      : await admin.from('bookings').select(BOOKING_SELECT).eq('razorpay_order_id', booking.razorpay_order_id)
    const sameOwner = (row: any) =>
      booking.user_id ? row.user_id === booking.user_id : !row.user_id && row.guest_access_hash === booking.guest_access_hash
    group = [booking, ...(siblings ?? []).filter((row: any) => row.id !== booking.id && sameOwner(row))]
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar transparent={false} />
      <BookingSuccess booking={booking} group={group} />
      <Footer />
    </div>
  )
}
