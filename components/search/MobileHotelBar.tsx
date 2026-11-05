'use client'

import { useState } from 'react'
import { SlidersHorizontal, X } from '@/components/icons'
import { HotelFilters } from './HotelFilters'
import { HOTEL_SORT_OPTIONS, useHotelSort } from './HotelSortBar'

interface MobileHotelBarProps {
  sortBy: string
  selectedStarRating: string[]
  selectedPropertyTypes: string[]
  minPrice?: string
  maxPrice?: string
  selectedAmenities: string[]
}

export function MobileHotelBar({
  sortBy,
  selectedStarRating,
  selectedPropertyTypes,
  minPrice,
  maxPrice,
  selectedAmenities,
}: MobileHotelBarProps) {
  const handleSort = useHotelSort()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount =
    selectedStarRating.length +
    selectedPropertyTypes.length +
    selectedAmenities.length +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0)

  return (
    <div className="lg:hidden">
      {/* ── Single toolbar row ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 pb-0.5">
        {/* Filters toggle */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
            filtersOpen || activeFilterCount > 0
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white text-foreground border-border'
          }`}
        >
          {filtersOpen ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <SlidersHorizontal className="h-3.5 w-3.5" />
          )}
          Filters
          {activeFilterCount > 0 && !filtersOpen && (
            <span className="ml-0.5 bg-white text-primary rounded-full h-4 w-4 text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-border shrink-0" />

        {/* Sort chips */}
        {HOTEL_SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            aria-pressed={sortBy === opt.value}
            onClick={() => handleSort(opt.value)}
            className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors whitespace-nowrap ${
              sortBy === opt.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white text-foreground border-border hover:border-primary/50'
            }`}
          >
            <opt.icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Collapsible filter panel ── */}
      {filtersOpen && (
        <div className="mt-3">
          <HotelFilters
            selectedStarRating={selectedStarRating}
            selectedPropertyTypes={selectedPropertyTypes}
            minPrice={minPrice}
            maxPrice={maxPrice}
            selectedAmenities={selectedAmenities}
          />
        </div>
      )}
    </div>
  )
}
