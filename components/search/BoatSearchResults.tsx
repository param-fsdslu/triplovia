'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BoatCard } from './BoatCard'
import { Ship, SortAsc } from '@/components/icons'

interface BoatSearchResultsProps {
  boats: any[]
  totalResults: number
  sortBy: string
  searchParams: any
}

export function BoatSearchResults({
  boats,
  totalResults,
  sortBy,
  searchParams,
}: BoatSearchResultsProps) {
  const router = useRouter()
  const params = useSearchParams()

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(params.toString())
    newParams.set('sortBy', value)
    router.push(`?${newParams.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-border">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            {totalResults === 0 ? 'No boats found' : `${totalResults} boats found`}
          </h2>
          {searchParams.location && (
            <p className="text-sm text-muted-foreground mt-1">
              in <span className="font-medium">{searchParams.location}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SortAsc className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="capacity">Capacity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results List */}
      {totalResults === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <Ship className="h-16 w-16 sm:h-24 sm:w-24 text-muted mb-4 sm:mb-6" />
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">No boats found</h3>
          <p className="text-muted-foreground max-w-md text-sm sm:text-base">
            Try adjusting your search filters or search for a different location
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {boats.map((boat) => (
            <BoatCard key={boat.id} boat={boat} />
          ))}
        </div>
      )}

      {totalResults > 10 && (
        <div className="flex justify-center pt-6 sm:pt-8">
          <p className="text-sm text-muted-foreground">Showing {Math.min(totalResults, 10)} of {totalResults} boats</p>
        </div>
      )}
    </div>
  )
}
