'use client'

import { HotelCard } from './HotelCard'
import { HotelSortBar } from './HotelSortBar'
import { Hotel } from '@/components/icons'

interface HotelSearchResultsProps {
  hotels: any[]
  totalResults: number
  sortBy: string
  searchParams: any
}

export function HotelSearchResults({
  hotels,
  totalResults,
  sortBy,
  searchParams,
}: HotelSearchResultsProps) {
  return (
    <div className="space-y-6">
      {/* Results header (desktop) */}
      <div className="hidden lg:block space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {totalResults === 0 ? 'No stays found' : `${totalResults} ${totalResults === 1 ? 'stay' : 'stays'} found`}
          </h2>
          {searchParams.location && (
            <p className="text-sm text-muted-foreground mt-1">
              in <span className="font-medium">{searchParams.location}</span>
            </p>
          )}
        </div>
        {totalResults > 1 && <HotelSortBar sortBy={sortBy} />}
      </div>

      {/* Mobile-only results count (sort handled by MobileHotelBar) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border lg:hidden">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {totalResults === 0 ? 'No stays found' : `${totalResults} ${totalResults === 1 ? 'stay' : 'stays'} found`}
          </h2>
          {searchParams.location && (
            <p className="text-sm text-muted-foreground mt-1">
              in <span className="font-medium">{searchParams.location}</span>
            </p>
          )}
        </div>

      </div>

      {/* Results List */}
      {totalResults === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 px-6 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-mint text-primary">
            <Hotel className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No stays match your search</h3>
          <p className="text-muted-foreground max-w-md">
            Try adjusting your search filters or search for a different location
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} priceForGroup />
          ))}
        </div>
      )}

      {/* Pagination placeholder - can be added later */}
      {totalResults > 10 && (
        <div className="flex justify-center pt-8">
          <p className="text-sm text-muted-foreground">Showing {Math.min(totalResults, 10)} of {totalResults} properties</p>
        </div>
      )}
    </div>
  )
}
