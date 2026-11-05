import { create } from 'zustand'
import { format } from 'date-fns'
import { childAgesParam, parseChildAges } from '@/lib/utils/occupancy'

// Separate state shape from actions for clarity
interface SearchStateData {
  location: string
  /**
   * The destination shown in the hotel search box (its default until the guest picks one; null
   * where there is no search box). The homepage travel stories follow it (FeaturedBlogs).
   */
  pickedCity: string | null
  checkIn: Date | undefined
  checkOut: Date | undefined
  adults: number
  children: number
  rooms: number
  /** Travelling with pets (the checkbox in Rooms & Guests); carried to the booking as `with_pets` */
  pets: boolean
  /**
   * One age (1–11) per child, picked in the guests picker (null until then); always as long as
   * `children`. Prices use it (ages 6–11 pay the child rate) and it goes to the URL as `ages=2,6`.
   */
  childAges: Array<number | null>
  boatDate: Date | undefined
  activeTab: 'hotels' | 'boats'
  isGuestOpen: boolean
}

interface SearchActions {
  setLocation: (location: string) => void
  setPickedCity: (city: string | null) => void
  setCheckIn: (date: Date | undefined) => void
  setCheckOut: (date: Date | undefined) => void
  setDateRange: (checkIn: Date | undefined, checkOut: Date | undefined) => void
  setAdults: (adults: number) => void
  setChildren: (children: number) => void
  setRooms: (rooms: number) => void
  setPets: (pets: boolean) => void
  setChildAge: (index: number, age: number) => void
  setChildAges: (ages: Array<number | null>) => void
  setBoatDate: (date: Date | undefined) => void
  setActiveTab: (tab: 'hotels' | 'boats') => void
  setIsGuestOpen: (open: boolean) => void
  resetSearch: () => void
  hydrateFromParams: (params: Record<string, string | undefined>) => void
}

export type SearchState = SearchStateData & SearchActions

const initialState: SearchStateData = {
  location: 'Honnavar',
  pickedCity: null,
  checkIn: undefined,
  checkOut: undefined,
  adults: 2,
  children: 0,
  rooms: 1,
  pets: false,
  childAges: [],
  boatDate: undefined,
  activeTab: 'hotels',
  isGuestOpen: false,
}

export const useSearchStore = create<SearchState>()((set) => ({
  ...initialState,

  setLocation: (location) => set({ location }),
  setPickedCity: (pickedCity) => set({ pickedCity }),
  setCheckIn: (checkIn) => set({ checkIn }),
  setCheckOut: (checkOut) => set({ checkOut }),
  setDateRange: (checkIn, checkOut) => set({ checkIn, checkOut }),
  setAdults: (adults) => set({ adults }),
  // The ages list follows the count: ages already picked stay, new children start unpicked
  setChildren: (children) =>
    set((s) => ({ children, childAges: Array.from({ length: Math.max(0, children) }, (_, i) => s.childAges[i] ?? null) })),
  setRooms: (rooms) => set({ rooms }),
  setPets: (pets) => set({ pets }),
  setChildAge: (index, age) =>
    set((s) => ({ childAges: s.childAges.map((current, i) => (i === index ? age : current)) })),
  setChildAges: (ages) => set((s) => ({ childAges: Array.from({ length: s.children }, (_, i) => ages[i] ?? null) })),
  setBoatDate: (boatDate) => set({ boatDate }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsGuestOpen: (isGuestOpen) => set({ isGuestOpen }),
  resetSearch: () => set(initialState),

  hydrateFromParams: (params) =>
    set({
      location: params.location || initialState.location,
      checkIn: params.checkIn ? new Date(params.checkIn) : undefined,
      checkOut: params.checkOut ? new Date(params.checkOut) : undefined,
      adults: params.adults ? Number(params.adults) : initialState.adults,
      children: params.children ? Number(params.children) : initialState.children,
      childAges: parseChildAges(params.ages, params.children ? Number(params.children) : initialState.children),
      rooms: params.rooms ? Number(params.rooms) : initialState.rooms,
      pets: params.pets === '1',
    }),
}))

/**
 * The search box's current search as a /hotels link: its destination (`pickedCity`), dates when
 * both are picked, and the guests. The navbar's Hotels link uses it, so the results match the
 * search box. With no destination yet, /hotels falls back to DEFAULT_DESTINATION.
 */
export function hotelsSearchHref(s: SearchStateData): string {
  const params = new URLSearchParams()
  if (s.pickedCity) params.set('location', s.pickedCity)
  if (s.checkIn && s.checkOut) {
    params.set('checkIn', format(s.checkIn, 'yyyy-MM-dd'))
    params.set('checkOut', format(s.checkOut, 'yyyy-MM-dd'))
  }
  params.set('adults', String(s.adults))
  if (s.children > 0) {
    params.set('children', String(s.children))
    const ages = childAgesParam(s.childAges)
    if (ages) params.set('ages', ages)
  }
  params.set('rooms', String(s.rooms))
  if (s.pets) params.set('pets', '1')
  return `/hotels?${params.toString()}`
}
