import { Suspense } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { HotelSearchBox } from '@/components/search/HotelSearchBox'
import { HotelFilters } from '@/components/search/HotelFilters'
import { HotelSearchResults } from '@/components/search/HotelSearchResults'
import { MobileHotelBar } from '@/components/search/MobileHotelBar'
import { createAdminClient, createClient } from '@/lib/db/server'
import { HotelService } from '@/lib/services/hotel.service'
import { parseChildAges, partyNightlyPrice, roomsForParty } from '@/lib/utils/occupancy'
import { hotelLocationFilter } from '@/lib/utils/india-locations'
import { Loader2 } from '@/components/icons'
import { FeaturedBlogs } from '@/components/FeaturedBlogs'
import { isFeatureEnabled } from '@/lib/config/features'
import { DEFAULT_DESTINATION } from '@/lib/config/search'

interface SearchParams {
  searchParams: Promise<{
    location?: string
    checkIn?: string
    checkOut?: string
    adults?: string
    children?: string
    /** Children's ages, "2,6" (from the guests picker) */
    ages?: string
    rooms?: string
    pets?: string
    minPrice?: string
    maxPrice?: string
    starRating?: string
    propertyType?: string
    amenities?: string
    sortBy?: string
  }>
}

export default async function HotelsPage({ searchParams }: SearchParams) {
  const searched = await searchParams
  // No location in the URL (the Hotels menu link, "View all stays"…): list the city the search box
  // shows by default, so the results always match the search box (by request)
  const params = { ...searched, location: searched.location?.trim() || DEFAULT_DESTINATION.name }
  const db = await createClient()

  let query = db
    .from('hotels')
    .select(
      `
      id,
      name,
      slug,
      description,
      star_rating,
      property_type,
      city,
      state,
      country,
      location_rating,
      nearby_places,
      hotel_images!hotel_images_hotel_id_fkey(
        id,
        image_url,
        alt_text,
        is_primary,
        display_order
      ),
      room_types!room_types_hotel_id_fkey(
        id,
        base_price,
        status,
        max_adults,
        max_children,
        max_occupancy,
        standard_occupancy,
        extra_bed_price,
        child_price,
        num_available_rooms
      ),
      hotel_amenities!hotel_amenities_hotel_id_fkey(
        amenity_id
      ),
      reviews(
        overall_rating,
        status
      )
    `
    )
    .eq('status', 'active')

  // City, district, state or hotel name (the hero's destination search)
  const locationFilter = params.location ? await hotelLocationFilter(params.location) : null
  if (locationFilter) {
    query = query.or(locationFilter)
  }

  if (params.starRating) {
    const ratings = params.starRating.split(',').map(Number)
    query = query.in('star_rating', ratings)
  }

  if (params.propertyType) {
    const types = params.propertyType.split(',')
    query = query.in('property_type', types)
  }

  const { data: hotels, error } = await query

  if (error) {
    console.error('Error fetching hotels:', error)
  }

  const minPriceFilter = params.minPrice ? parseFloat(params.minPrice) : undefined
  const maxPriceFilter = params.maxPrice ? parseFloat(params.maxPrice) : undefined
  const hasPriceFilter = minPriceFilter !== undefined || maxPriceFilter !== undefined
  const inPriceRange = (price: number) => price >= (minPriceFilter ?? 0) && price <= (maxPriceFilter ?? Infinity)

  // MakeMyTrip-style: each stay is priced for the searched group, in the rooms its cheapest
  // fitting room type needs (lib/utils/occupancy.ts), for the searched nights when there are dates
  const party = {
    adults: Math.max(1, parseInt(params.adults ?? '') || 2),
    children: Math.max(0, parseInt(params.children ?? '') || 0),
    rooms: Math.max(1, parseInt(params.rooms ?? '') || 1),
    childAges: [] as Array<number | null>,
  }
  party.childAges = parseChildAges(params.ages, party.children)
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const hasDates =
    !!params.checkIn && !!params.checkOut && DATE_RE.test(params.checkIn) && DATE_RE.test(params.checkOut) && params.checkOut > params.checkIn
  const nights = hasDates
    ? Math.round((Date.parse(`${params.checkOut}T00:00:00Z`) - Date.parse(`${params.checkIn}T00:00:00Z`)) / 86_400_000)
    : 0

  // Rooms left and the dates' prices (weekend/festival rules) for every room type at once. Admin
  // client: everyone's bookings count, and only counts come back.
  const allRoomTypes = (hotels ?? []).flatMap((hotel: any) => hotel.room_types ?? [])
  const [roomsLeft, datePrices] =
    hasDates && allRoomTypes.length > 0
      ? await Promise.all([
          HotelService.getAvailableRoomsMap(createAdminClient(), allRoomTypes, params.checkIn!, params.checkOut!),
          HotelService.getEffectivePriceMap(db, allRoomTypes, params.checkIn!, params.checkOut!),
        ])
      : [new Map<string, number>(), new Map<string, number>()]

  /** The cheapest room type that takes the group: its rooms, a night's price, and the stay's total */
  const partyQuote = (roomTypes: any[]) => {
    const quotes = roomTypes.flatMap((rt: any) => {
      if (rt.status !== 'available' || (hasPriceFilter && !inPriceRange(rt.base_price))) return []
      const room = {
        ...rt,
        num_available_rooms: roomsLeft.get(rt.id) ?? rt.num_available_rooms,
        current_price: datePrices.get(rt.id),
      }
      const fit = roomsForParty(room, party)
      if (fit.error) return []
      const night = partyNightlyPrice(room, fit.rooms, party)
      return [{ rooms: fit.rooms, nightly: night.total, extraBeds: night.extraBeds }]
    })
    const best = quotes.sort((a, b) => a.nightly - b.nightly)[0]
    return best ? { ...best, nights, total: best.nightly * nights } : undefined
  }

  let processedHotels =
    hotels?.map((hotel: any) => {
      const prices: number[] = (hotel.room_types?.map((rt: any) => rt.base_price) || []).filter(Boolean)
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

      // When a price filter is active, find the cheapest room that falls within the range.
      // This is what we display on the card so users see a price relevant to their budget.
      let displayPrice: number | undefined
      if (hasPriceFilter) {
        const lo = minPriceFilter ?? 0
        const hi = maxPriceFilter ?? Infinity
        const inRangePrices = prices.filter((p) => p >= lo && p <= hi)
        if (inRangePrices.length > 0) {
          displayPrice = Math.min(...inRangePrices)
        }
      }

      const quote = partyQuote(hotel.room_types ?? [])

      const approvedReviews = (hotel.reviews || []).filter(
        (r: any) => r.status === 'approved'
      )
      const review_count = approvedReviews.length
      const avg_rating =
        review_count > 0
          ? approvedReviews.reduce(
              (sum: number, r: any) => sum + (r.overall_rating || 0),
              0
            ) /
            review_count /
            2 // Convert 0-10 scale to 0-5
          : 0

      return {
        ...hotel,
        minPrice,
        maxPrice,
        displayPrice,
        quote,
        avg_rating,
        review_count,
        amenityIds: hotel.hotel_amenities?.map((ha: any) => ha.amenity_id) || [],
      }
    }) || []

  if (hasPriceFilter) {
    // Only keep hotels that have at least one room within the selected price range.
    // Hotels with no in-range rooms will have displayPrice === undefined.
    processedHotels = processedHotels.filter((hotel) => hotel.displayPrice !== undefined)
  }

  if (params.amenities) {
    const requiredAmenities = params.amenities.split(',')
    processedHotels = processedHotels.filter((hotel) =>
      requiredAmenities.every((amenityId) => hotel.amenityIds.includes(amenityId))
    )
  }

  // Anything unknown (incl. the old 'recommended') sorts by popularity
  const sortBy = ['price_low', 'price_high', 'rating', 'location'].includes(params.sortBy ?? '')
    ? params.sortBy!
    : 'popularity'
  const qualityScore = (h: any) => (h.star_rating || 0) * 2 + (h.location_rating || 0)
  switch (sortBy) {
    // By the group's price; stays without rooms for the group go last
    case 'price_low':
      processedHotels.sort((a, b) => (a.quote?.nightly ?? Infinity) - (b.quote?.nightly ?? Infinity))
      break
    case 'price_high':
      processedHotels.sort((a, b) => (b.quote?.nightly ?? -Infinity) - (a.quote?.nightly ?? -Infinity))
      break
    case 'rating':
      processedHotels.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0))
      break
    case 'location':
      processedHotels.sort((a, b) => (b.location_rating || 0) - (a.location_rating || 0))
      break
    default:
      // Popularity: most-reviewed stays first, then the best rated, then stars + location
      processedHotels.sort(
        (a, b) =>
          b.review_count - a.review_count ||
          b.avg_rating - a.avg_rating ||
          qualityScore(b) - qualityScore(a)
      )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar transparent={false} />

      {/* Page header + search */}
      <div className="relative overflow-clip bg-secondary pt-16 sm:pt-[72px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/40 blur-3xl"
        />
        <div className="relative page-container py-3 sm:py-7">
          {/* Hidden on phones to keep the search block short (by request); still read out by screen readers */}
          <h1 className="sr-only sm:not-sr-only sm:mb-4 sm:block sm:text-2xl font-bold tracking-tight text-white">Find your perfect stay</h1>
          {/* Homepage hero search, minus price and stay type (the filters below cover those) */}
          <div className="rounded-2xl border border-border bg-white p-1.5 sm:p-2.5 shadow-[0_18px_48px_-24px_rgba(7,63,61,0.45)]">
            <HotelSearchBox
              compact
              keepFilters
              initial={{
                location: params.location,
                checkIn: params.checkIn,
                checkOut: params.checkOut,
                adults: params.adults,
                children: params.children,
                ages: params.ages,
                rooms: params.rooms,
                pets: params.pets,
                minPrice: params.minPrice,
                maxPrice: params.maxPrice,
                propertyType: params.propertyType,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-container py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Filters Sidebar - desktop */}
          <aside className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
            <div className="sticky top-24">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }
              >
                <HotelFilters
                  selectedStarRating={params.starRating?.split(',') || []}
                  selectedPropertyTypes={params.propertyType?.split(',') || []}
                  minPrice={params.minPrice}
                  maxPrice={params.maxPrice}
                  selectedAmenities={params.amenities?.split(',') || []}
                />
              </Suspense>
            </div>
          </aside>

          {/* Search Results */}
          <main className="flex-1 min-w-0">
            {/* Mobile: sticky filters + sort bar — sticky within tall main container */}
            <div className="sticky top-16 sm:top-[72px] z-30 lg:hidden bg-background border-b border-border -mx-4 px-4">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <MobileHotelBar
                  sortBy={sortBy}
                  selectedStarRating={params.starRating?.split(',') || []}
                  selectedPropertyTypes={params.propertyType?.split(',') || []}
                  minPrice={params.minPrice}
                  maxPrice={params.maxPrice}
                  selectedAmenities={params.amenities?.split(',') || []}
                />
              </Suspense>
            </div>

            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              }
            >
              <div className="mt-4 lg:mt-0">
                <HotelSearchResults
                  hotels={processedHotels}
                  totalResults={processedHotels.length}
                  sortBy={sortBy}
                  searchParams={params}
                />
              </div>
            </Suspense>
          </main>
        </div>
      </div>
      {/* Travel stories about the searched city (nothing when it has none) */}
      {params.location && isFeatureEnabled('blogs') && <FeaturedBlogs city={params.location} />}
      <Footer />
    </div>
  )
}
