/**
 * "Explore stays in <city>" on the blog pages: a post about a city (or the city's Journal page,
 * /blog?city=…) leads to that city's hotels (/hotels?location=…). Shown only when the city has stays.
 */
import Link from 'next/link'
import { ArrowRight, MapPin } from '@/components/icons'
import { cn } from '@/lib/utils'

interface ExploreStaysButtonProps {
  city: string
  /** Active stays in the city */
  stays: number
  /**
   * `card`: a wide call-out (side by side from sm). `panel`: the same, stacked, for a narrow column
   * like the post sidebar. `button`: a pill in the Journal header
   */
  variant?: 'card' | 'panel' | 'button'
  className?: string
}

export function ExploreStaysButton({ city, stays, variant = 'button', className }: ExploreStaysButtonProps) {
  if (stays <= 0) return null
  const href = `/hotels?location=${encodeURIComponent(city)}`

  if (variant === 'button') {
    return (
      <Link
        href={href}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold',
          'text-primary-foreground transition-colors hover:bg-primary-hover',
          className
        )}
      >
        <MapPin className="h-4 w-4" />
        Explore stays in {city}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-border bg-mint px-5 py-5',
        variant === 'card' && 'sm:flex-row sm:items-center sm:justify-between sm:px-6',
        className
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Plan your trip</p>
        <p className="mt-1 text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Stay in {city}
        </p>
        <p className="text-sm text-muted-foreground">
          {stays} {stays === 1 ? 'stay' : 'stays'} to choose from, booked securely with Triplovia.
        </p>
      </div>
      <Link
        href={href}
        className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5
                   text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <MapPin className="h-4 w-4" />
        Explore stays in {city}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
