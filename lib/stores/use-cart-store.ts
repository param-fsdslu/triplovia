import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import { useSearchStore } from '@/lib/stores/use-search-store'
import { removeSavedStay } from '@/lib/actions/saved-stays'
import { childAgesParam } from '@/lib/utils/occupancy'

/**
 * The rooms picked for a booking, kept in this browser so the booking follows the guest around
 * the site: hotel/FloatingCartBar shows it at the bottom of every other page. The hotel page
 * (HotelDetailsClient) and the review page (BookingForm / MultiRoomBookingForm) keep it up to
 * date. One hotel at a time; signed-in guests also get it on their account (saved_stays).
 */
export interface CartHotel {
  id: string
  slug: string
  name: string
}

export interface CartRoom {
  id: string
  name: string
  qty: number
  /** Nightly price per room before taxes, as last shown */
  price: number
}

export interface CartStateData {
  hotel: CartHotel | null
  rooms: CartRoom[]
  /** yyyy-MM-dd */
  checkIn?: string
  checkOut?: string
  adults: number
  children: number
  /** One per child (null = not picked) */
  childAges?: Array<number | null>
  pets: boolean
}

interface CartActions {
  setCart: (cart: CartStateData) => void
  clearCart: () => void
}

export type CartState = CartStateData & CartActions

const emptyCart: CartStateData = {
  hotel: null,
  rooms: [],
  checkIn: undefined,
  checkOut: undefined,
  adults: 2,
  children: 0,
  childAges: [],
  pets: false,
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      ...emptyCart,
      setCart: (cart) => set(cart),
      clearCart: () => set(emptyCart),
    }),
    {
      name: 'ht-booking-cart',
      version: 1,
      partialize: ({ hotel, rooms, checkIn, checkOut, adults, children, childAges, pets }) => ({
        hotel,
        rooms,
        checkIn,
        checkOut,
        adults,
        children,
        childAges,
        pets,
      }),
    }
  )
)

/** Same as useBookingHydration: true once the persisted cart has been read (after mount) */
export function useCartHydration() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true))
    if (useCartStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  return hydrated
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The cart's dates, or nothing when they're missing or already past */
export function upcomingCartDates(cart: Pick<CartStateData, 'checkIn' | 'checkOut'>) {
  const { checkIn, checkOut } = cart
  return checkIn && checkOut && checkIn >= todayStr() && checkOut > checkIn ? { checkIn, checkOut } : null
}

/** The review page for the cart (same URL shape as the hotel page's checkout) */
export function cartCheckoutHref(cart: CartStateData) {
  if (!cart.hotel) return '/hotels'
  const params = new URLSearchParams()
  if (cart.rooms.length === 1 && cart.rooms[0].qty === 1) params.set('roomId', cart.rooms[0].id)
  else params.set('rooms', cart.rooms.map((r) => `${r.id}:${r.qty}`).join(','))
  const dates = upcomingCartDates(cart)
  if (dates) {
    params.set('checkIn', dates.checkIn)
    params.set('checkOut', dates.checkOut)
  }
  params.set('adults', String(cart.adults))
  if (cart.children) params.set('children', String(cart.children))
  const ages = cart.children ? childAgesParam(cart.childAges) : undefined
  if (ages) params.set('ages', ages)
  if (cart.pets) params.set('pets', '1')
  return `/hotels/${cart.hotel.slug}/book?${params.toString()}`
}

/** Nothing left to book at this hotel: empties the cart, and the account's saved rooms when signed in */
export function leaveEmptyCart(hotelId: string, signedIn?: unknown) {
  const cart = useCartStore.getState()
  if (cart.hotel?.id === hotelId) cart.clearCart()
  if (signedIn) removeSavedStay(hotelId).catch(() => {})
}

/** Puts the cart's dates and guests into the search box, so its hotel page opens on that stay */
export function applyCartStay() {
  const cart = useCartStore.getState()
  const dates = upcomingCartDates(cart)
  const search = useSearchStore.getState()
  if (dates) search.setDateRange(new Date(`${dates.checkIn}T00:00:00`), new Date(`${dates.checkOut}T00:00:00`))
  search.setAdults(cart.adults)
  search.setChildren(cart.children)
  search.setChildAges(cart.childAges ?? [])
  search.setPets(cart.pets)
}
