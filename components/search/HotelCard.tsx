'use client'

/**
 * HotelCard — result card for the hotel search list and the wishlist grid.
 *
 * Layout follows the card's own width (container query): from 42rem wide it is a row
 * (photo left, details middle, rating + price right, like MakeMyTrip's results); from 36rem the
 * photo sits left and the price is a row under the details; narrower, e.g. in the wishlist grid,
 * it stacks photo, details and a price row (a short 16:7 photo on phones).
 *
 * The whole card is one link: the title's link stretches over it (after:inset-0); the photo
 * arrows, dots and wishlist heart sit above it (z-10). No separate "View stay" button.
 *
 * Image carousel: images are sorted primary-first, then by display_order. The arrows show on
 * hover from `sm` (on phones a tap anywhere opens the stay; the dots still change the photo).
 *
 * Prices displayed use getInclusivePrice() from lib/utils.ts which applies
 * the configured tax and service fee multiplier to the base room price.
 *
 * In search results (`priceForGroup`) the price is the searched group's stay, MakeMyTrip-style:
 * "3 rooms · 6 nights", the total, and a night's price (`hotel.quote`, worked out on /hotels with
 * lib/utils/occupancy.ts). A stay with no room type for the group says so under its usual price.
 */
import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Star, MapPin, Hotel, ChevronLeft, ChevronRight } from '@/components/icons'
import { WishlistButton } from '@/components/wishlist/WishlistButton'
import { NearbyPlaces } from '@/components/hotel/NearbyPlaces'
import { cn, formatCurrency, getInclusivePrice } from '@/lib/utils'

interface HotelCardProps {
  hotel: {
    id: string
    name: string
    slug: string
    description?: string
    star_rating?: number
    property_type?: string
    city: string
    state: string
    country: string
    location_rating?: number
    /** Nearby places & connectivity (lib/utils/nearby-places.ts); the 2 nearest show here */
    nearby_places?: unknown
    avg_rating?: number
    review_count?: number
    hotel_images?: Array<{
      id: string
      image_url: string
      alt_text?: string
      is_primary: boolean
      display_order: number
    }>
    minPrice: number
    maxPrice: number
    /** Cheapest room price within the active price filter range. Falls back to minPrice when absent. */
    displayPrice?: number
    /** The searched group's stay in the cheapest room type that takes it; `nights` 0 without dates */
    quote?: { rooms: number; nightly: number; nights: number; total: number; extraBeds: number }
  }
  /** Search results: price the stay for the searched group (needs `hotel.quote`) */
  priceForGroup?: boolean
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Small print under a price: it wraps between the parts, never inside one */
function PriceNote({ parts, className }: { parts: Array<string | null | false>; className?: string }) {
  const shown = parts.filter((part): part is string => !!part)
  return (
    <p className={cn('text-[11px] leading-snug text-muted-foreground', className)}>
      {shown.map((part, i) => (
        <span key={part}>
          {i > 0 && ' · '}
          <span className="whitespace-nowrap">{part}</span>
        </span>
      ))}
    </p>
  )
}

/** Guest rating (0–5) in words */
function ratingWord(rating: number) {
  if (rating >= 4.5) return 'Excellent'
  if (rating >= 4) return 'Very good'
  if (rating >= 3.5) return 'Good'
  return 'Rated'
}

/**
 * Top-right of the card, no badges or pills (by request): the property's stars as gold icons with the
 * words under them in bold ("3 Star Hotel", "4 Star Resort"), and the guest rating in bold text.
 * A stay with neither says "New".
 */
function RatingInfo({
  stars,
  type,
  rating,
  count,
  className,
}: {
  stars?: number
  /** "Hotel", "Resort"… (the property type) */
  type?: string | null
  rating?: number
  count?: number
  className?: string
}) {
  if (!stars && !rating) return <span className={cn('shrink-0 text-xs font-bold text-primary', className)}>New</span>
  return (
    <div className={cn('flex shrink-0 flex-col items-end gap-1 text-right leading-tight', className)}>
      {!!stars && (
        <>
          <span className="inline-flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: stars }, (_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
            ))}
          </span>
          <span className="whitespace-nowrap text-[13px] font-bold text-foreground">
            {stars} Star {type || 'Property'}
          </span>
        </>
      )}
      {!!rating && (
        <span className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">
            {rating.toFixed(1)} {ratingWord(rating)}
          </span>
          {!!count && ` · ${count} ${count === 1 ? 'review' : 'reviews'}`}
        </span>
      )}
    </div>
  )
}

export function HotelCard({ hotel, priceForGroup = false }: HotelCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  // Photos that failed to load are dropped so the card falls back to the placeholder
  const [brokenIds, setBrokenIds] = useState<string[]>([])

  const sortedImages = [...(hotel.hotel_images || [])]
    .filter((img) => !brokenIds.includes(img.id))
    .sort((a, b) => {
      if (a.is_primary) return -1
      if (b.is_primary) return 1
      return a.display_order - b.display_order
    })
  const activeIndex = Math.min(currentIndex, Math.max(sortedImages.length - 1, 0))

  const hasMultiple = sortedImages.length > 1
  const href = `/hotels/${hotel.slug}`
  const type = hotel.property_type ? hotel.property_type.charAt(0).toUpperCase() + hotel.property_type.slice(1) : null

  const goTo = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setCurrentIndex(index)
  }, [])

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setCurrentIndex((p) => (p === 0 ? sortedImages.length - 1 : p - 1))
  }, [sortedImages.length])

  const goNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setCurrentIndex((p) => (p === sortedImages.length - 1 ? 0 : p + 1))
  }, [sortedImages.length])

  return (
    <div className="@container h-full">
      <article
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card
                   transition-[border-color,box-shadow] duration-300 hover:border-primary/25 hover:shadow-md hover:shadow-primary/5
                   has-[h3_a:focus-visible]:ring-2 has-[h3_a:focus-visible]:ring-primary/40
                   @xl:flex-row"
      >
        {/* ── Photo carousel ───────────────────────────────── */}
        <div className="relative aspect-16/7 shrink-0 overflow-hidden bg-muted sm:aspect-4/3 @xl:aspect-auto @xl:min-h-[220px] @xl:w-[40%] @2xl:w-[36%]">
          <div className="absolute inset-0">
            {sortedImages.length > 0 ? (
              sortedImages.map((img, index) => (
                <div
                  key={img.id}
                  className={cn(
                    'absolute inset-0 transition-opacity duration-300',
                    index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
                  )}
                >
                  <Image
                    src={img.image_url}
                    alt={img.alt_text || `${hotel.name} photo ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    sizes="(min-width: 640px) 380px, 100vw"
                    priority={index === 0}
                    onError={() => setBrokenIds((ids) => [...ids, img.id])}
                  />
                </div>
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-mint">
                <Hotel className="h-10 w-10 text-primary/40" />
              </div>
            )}
          </div>

          {type && (
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-secondary backdrop-blur-sm">
              {type}
            </span>
          )}

          <WishlistButton hotelId={hotel.id} className="absolute right-3 top-3 z-10 shadow-none" />

          {hasMultiple && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full
                           bg-white/85 opacity-0 transition-opacity duration-200 hover:bg-white group-hover:opacity-100 sm:flex"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full
                           bg-white/85 opacity-0 transition-opacity duration-200 hover:bg-white group-hover:opacity-100 sm:flex"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>

              <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
                {sortedImages.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => goTo(i, e)}
                    className={cn(
                      'rounded-full transition-all',
                      i === activeIndex ? 'h-1.5 w-3.5 bg-white' : 'h-1.5 w-1.5 bg-white/55 hover:bg-white/80'
                    )}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
                {sortedImages.length > 5 && (
                  <span className="ml-0.5 text-[9px] text-white">+{sortedImages.length - 5}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Details ──────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col @2xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4 @xl:p-5">
            {/* Name and city on the left, stars beside both (so they take no line of their own) */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-heading text-[17px] font-bold leading-snug text-foreground line-clamp-2 sm:text-lg @xl:text-xl">
                  {/* Stretched over the whole card, so a click anywhere opens the stay */}
                  <Link href={href} className="outline-none transition-colors after:absolute after:inset-0 group-hover:text-primary">
                    {hotel.name}
                  </Link>
                </h3>

                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground sm:mt-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">
                    {hotel.city}, {hotel.state}
                  </span>
                </p>
              </div>
              {/* Beside the name on narrow cards; wide ones show it at the top of the price column */}
              <RatingInfo
                stars={hotel.star_rating}
                type={type}
                rating={hotel.avg_rating}
                count={hotel.review_count}
                className="mt-1 @2xl:hidden"
              />
            </div>

            {/* The 2 nearest places (railway station, bus stand, beach…) */}
            <NearbyPlaces places={hotel.nearby_places} limit={2} compact className="mt-1.5 sm:mt-2.5" />

            {hotel.description && (
              <p className="mt-3 hidden text-[13px] leading-relaxed text-muted-foreground @xl:line-clamp-2">
                {hotel.description}
              </p>
            )}
          </div>

          {/* ── Rating + price ─────────────────────────────── */}
          <div
            className="mt-auto flex items-end justify-between gap-3 border-t border-border px-3 py-2 sm:px-4 sm:py-3 @xl:px-5
                       @2xl:mt-0 @2xl:w-48 @2xl:shrink-0 @2xl:flex-col @2xl:items-end @2xl:border-l @2xl:border-t-0 @2xl:p-5"
          >
            <RatingInfo stars={hotel.star_rating} type={type} rating={hotel.avg_rating} count={hotel.review_count} className="hidden @2xl:flex" />

            {/* Under the details the small print sits left of the price (one short row); in the wide
                card's price column it all stacks, right-aligned */}
            {priceForGroup && hotel.quote ? (
              <div className="grid w-full min-w-0 grid-cols-[1fr_auto] items-center gap-x-3 text-left @2xl:block @2xl:w-auto @2xl:text-right">
                <p className="col-start-1 text-[11px] font-semibold text-primary">
                  {plural(hotel.quote.rooms, 'room')}
                  {hotel.quote.nights > 0 ? ` · ${plural(hotel.quote.nights, 'night')}` : ''}
                </p>
                <p className="col-start-2 row-span-3 row-start-1 text-right font-heading text-lg font-extrabold leading-tight text-foreground sm:text-xl @xl:text-2xl">
                  {formatCurrency(hotel.quote.nights > 0 ? hotel.quote.total : hotel.quote.nightly)}
                </p>
                {/* A one-night total is the nightly price, so it isn't repeated */}
                <PriceNote
                  className="col-start-1"
                  parts={[
                    hotel.quote.nights > 1 && `${formatCurrency(hotel.quote.nightly)} per night`,
                    hotel.quote.nights === 0 && 'per night',
                    hotel.quote.extraBeds > 0 ? 'incl. taxes, fees & extra guests' : 'incl. taxes & fees',
                  ]}
                />
              </div>
            ) : (
              <div className="grid w-full min-w-0 grid-cols-[1fr_auto] items-center gap-x-3 text-left @2xl:block @2xl:w-auto @2xl:text-right">
                {/* "from" only when showing the overall minimum (no price filter active) */}
                {!hotel.displayPrice && <p className="col-start-1 text-[11px] font-medium text-muted-foreground">Starting from</p>}
                <p className="col-start-2 row-span-3 row-start-1 text-right font-heading text-lg font-extrabold leading-tight text-foreground sm:text-xl @xl:text-2xl">
                  {formatCurrency(getInclusivePrice(hotel.displayPrice ?? hotel.minPrice))}
                </p>
                <PriceNote className="col-start-1" parts={['per night', 'incl. taxes & fees']} />
                {priceForGroup && <p className="col-start-1 mt-0.5 text-[11px] font-medium text-destructive">Not available for your search</p>}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
