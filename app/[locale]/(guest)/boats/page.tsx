import { Suspense } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { BoatFilters } from '@/components/search/BoatFilters'
import { BoatSearchResults } from '@/components/search/BoatSearchResults'
import { createClient } from '@/lib/db/server'
import { Loader2 } from '@/components/icons'

interface SearchParams {
  searchParams: Promise<{
    location?: string
    date?: string
    passengers?: string
    minPrice?: string
    maxPrice?: string
    boatType?: string
    duration?: string
    sortBy?: string
  }>
}

export default async function BoatsPage({ searchParams }: SearchParams) {
  const params = await searchParams
  const db = await createClient()

  let query = db
    .from('boats')
    .select(
      `
      id,
      name,
      slug,
      description,
      boat_type,
      capacity,
      departure_point,
      city,
      state,
      country,
      boat_images!boat_images_boat_id_fkey(
        id,
        image_url,
        alt_text,
        is_primary,
        display_order
      ),
      trip_types!trip_types_boat_id_fkey(
        id,
        pricing_model,
        price_per_person,
        price_per_boat,
        duration_minutes
      ),
      boat_reviews!boat_reviews_boat_id_fkey(
        overall_rating
      )
    `
    )
    .eq('status', 'active')

  if (params.location) {
    const locationQuery = `%${params.location}%`
    query = query.or(`city.ilike.${locationQuery},state.ilike.${locationQuery},departure_point.ilike.${locationQuery}`)
  }

  if (params.boatType) {
    const types = params.boatType.split(',')
    query = query.in('boat_type', types)
  }

  const { data: boats, error } = await query

  if (error) {
    console.error('Error fetching boats:', error)
  }

  let processedBoats =
    boats?.map((boat: any) => {
      const prices: number[] = []
      let minDuration: number | undefined

      boat.trip_types?.forEach((tt: any) => {
        if (tt.pricing_model === 'per_person' && tt.price_per_person) {
          prices.push(Number(tt.price_per_person))
        } else if (tt.pricing_model === 'per_boat' && tt.price_per_boat) {
          prices.push(Number(tt.price_per_boat))
        }
        if (tt.duration_minutes) {
          minDuration = minDuration ? Math.min(minDuration, tt.duration_minutes) : tt.duration_minutes
        }
      })

      const minPrice = prices.length > 0 ? Math.min(...prices) : 0
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

      const lowestTripType = boat.trip_types?.find((tt: any) => {
        const p = tt.pricing_model === 'per_person' ? Number(tt.price_per_person) : Number(tt.price_per_boat)
        return p === minPrice
      })
      const pricingLabel = lowestTripType?.pricing_model === 'per_boat' ? 'boat' : 'person'

      const ratings = boat.boat_reviews?.map((r: any) => r.overall_rating).filter(Boolean) || []
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length / 2) * 10) / 10
        : undefined

      return {
        ...boat,
        minPrice,
        maxPrice,
        pricingLabel,
        minDuration,
        avg_rating: avgRating,
        review_count: ratings.length > 0 ? ratings.length : undefined,
      }
    }) || []

  // Filter by price range
  if (params.minPrice || params.maxPrice) {
    const minPriceFilter = params.minPrice ? parseFloat(params.minPrice) : 0
    const maxPriceFilter = params.maxPrice ? parseFloat(params.maxPrice) : Infinity
    processedBoats = processedBoats.filter(
      (boat) => boat.minPrice >= minPriceFilter && boat.minPrice <= maxPriceFilter
    )
  }

  // Filter by duration
  if (params.duration) {
    const maxDurations = params.duration.split(',').map(Number)
    processedBoats = processedBoats.filter((boat) =>
      boat.minDuration && maxDurations.some((max) => boat.minDuration <= max)
    )
  }

  // Sort
  const sortBy = params.sortBy || 'recommended'
  switch (sortBy) {
    case 'price_low':
      processedBoats.sort((a, b) => a.minPrice - b.minPrice)
      break
    case 'price_high':
      processedBoats.sort((a, b) => b.minPrice - a.minPrice)
      break
    case 'rating':
      processedBoats.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
      break
    case 'capacity':
      processedBoats.sort((a, b) => (b.capacity || 0) - (a.capacity || 0))
      break
    default:
      processedBoats.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="bg-primary text-primary-foreground pt-16 sm:pt-20">
        <div className="page-container py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Explore Boat Trips</h1>
          <p className="text-primary-foreground/80 text-sm sm:text-base">Discover amazing boat experiences and water adventures</p>
        </div>
      </div>

      <div className="page-container py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Filters - hidden on mobile, shown on desktop */}
          <aside className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
            <div className="sticky top-20">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }
              >
                <BoatFilters
                  selectedBoatTypes={params.boatType?.split(',') || []}
                  minPrice={params.minPrice}
                  maxPrice={params.maxPrice}
                  selectedDurations={params.duration?.split(',') || []}
                />
              </Suspense>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {/* Mobile Filters */}
            <div className="lg:hidden mb-4">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <details className="group">
                  <summary className="cursor-pointer list-none flex items-center justify-between bg-white p-3 rounded-lg border border-border shadow-sm">
                    <span className="font-medium text-sm">Filters</span>
                    <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
                    <span className="text-xs text-muted-foreground hidden group-open:inline">Hide</span>
                  </summary>
                  <div className="mt-2">
                    <BoatFilters
                      selectedBoatTypes={params.boatType?.split(',') || []}
                      minPrice={params.minPrice}
                      maxPrice={params.maxPrice}
                      selectedDurations={params.duration?.split(',') || []}
                    />
                  </div>
                </details>
              </Suspense>
            </div>

            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              }
            >
              <BoatSearchResults
                boats={processedBoats}
                totalResults={processedBoats.length}
                sortBy={sortBy}
                searchParams={params}
              />
            </Suspense>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  )
}
