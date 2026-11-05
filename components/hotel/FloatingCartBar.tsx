'use client'

/**
 * FloatingCartBar — the booking cart (lib/stores/use-cart-store.ts) pinned to the bottom of every
 * page once rooms are picked, so the guest can wander off (home, blog, other searches) and come
 * back to it. Mounted once in app/[locale]/layout.tsx. Hidden on hotel pages (they have their own
 * BookingCartBar or "Select rooms" bar), the review page and the payment pages. The summary goes
 * back to the hotel's rooms with the cart's stay, the button to the review page.
 */
import { useShallow } from 'zustand/react/shallow'
import { usePathname, useRouter } from '@/i18n/routing'
import { BookingCartBar } from './BookingCartBar'
import {
  applyCartStay,
  cartCheckoutHref,
  leaveEmptyCart,
  upcomingCartDates,
  useCartHydration,
  useCartStore,
} from '@/lib/stores/use-cart-store'

const HIDDEN_ON = /^\/(hotels\/[^/]+|payment)(\/|$)/

const day = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

export function FloatingCartBar() {
  const pathname = usePathname()
  const router = useRouter()
  const hydrated = useCartHydration()
  const cart = useCartStore(
    useShallow(({ hotel, rooms, checkIn, checkOut, adults, children, pets }) => ({
      hotel,
      rooms,
      checkIn,
      checkOut,
      adults,
      children,
      pets,
    }))
  )

  if (!hydrated || !cart.hotel || cart.rooms.length === 0 || HIDDEN_ON.test(pathname)) return null

  const { hotel } = cart
  const dates = upcomingCartDates(cart)
  const guests = cart.adults + cart.children
  const staySummary = dates
    ? `${day(dates.checkIn)} – ${day(dates.checkOut)} · ${guests} ${guests === 1 ? 'guest' : 'guests'}`
    : undefined

  return (
    <>
      {/* Room under the page's last content (usually the footer) for the bar to sit over */}
      <div aria-hidden className="h-17" />
      <BookingCartBar
        hotelName={hotel.name}
        rooms={cart.rooms.map((r) => ({ id: r.id, name: r.name, base_price: r.price }))}
        cart={new Map(cart.rooms.map((r) => [r.id, r.qty]))}
        staySummary={staySummary}
        onEdit={() => {
          applyCartStay()
          router.push(`/hotels/${hotel.slug}#rooms`)
        }}
        onClear={() => leaveEmptyCart(hotel.id, true)}
        onCheckout={() => router.push(cartCheckoutHref(cart))}
      />
    </>
  )
}
