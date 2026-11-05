'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowDownNarrowWide, ArrowDownWideNarrow, Flame } from '@/components/icons'
import { cn } from '@/lib/utils'

/** Quick sorts on /hotels. `popularity` is the default (see the sort in hotels/page.tsx). */
export const HOTEL_SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity', icon: Flame },
  { value: 'price_low', label: 'Price: Low to High', icon: ArrowDownNarrowWide },
  { value: 'price_high', label: 'Price: High to Low', icon: ArrowDownWideNarrow },
] as const

/** Pushes the chosen sort into the URL, keeping every other search/filter param */
export function useHotelSort() {
  const router = useRouter()
  const params = useSearchParams()

  return (value: string) => {
    const next = new URLSearchParams(params.toString())
    next.set('sortBy', value)
    router.push(`?${next.toString()}`, { scroll: false })
  }
}

/** Desktop "Sort by" bar above the results (phones use the chips in MobileHotelBar) */
export function HotelSortBar({ sortBy }: { sortBy: string }) {
  const setSort = useHotelSort()

  return (
    <div
      role="group"
      aria-label="Sort stays"
      className="flex items-center gap-1 rounded-full border border-border bg-card p-1.5"
    >
      <span className="shrink-0 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Sort by
      </span>
      {HOTEL_SORT_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = sortBy === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => !active && setSort(value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-mint hover:text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
