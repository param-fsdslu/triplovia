'use client'

/**
 * Featured stay card for the homepage: the photo fills the whole card and the details sit
 * over a dark gradient at the bottom-left — location (white), hotel name, and one
 * inline row with rating, stars and the all-inclusive starting price.
 */
import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowUpRight, Hotel, MapPin, Star } from '@/components/icons'
import { Link } from '@/i18n/routing'
import { WishlistButton } from '@/components/wishlist/WishlistButton'
import { cn, formatCurrency, getInclusivePrice } from '@/lib/utils'

export interface FeaturedStay {
  id: string
  name: string
  slug: string
  city?: string | null
  state?: string | null
  property_type?: string | null
  star_rating?: number | null
  avg_rating?: number
  review_count?: number
  starting_price?: number
  /** A super admin featured it: shows the gold "Featured" corner ribbon */
  is_featured?: boolean | null
  hotel_images?: { image_url: string; alt_text?: string | null; is_primary?: boolean; display_order?: number }[]
}

function Dot() {
  return <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-white/50" />
}

export function FeaturedStayCard({
  hotel,
  className,
  imageSizes = '(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw',
}: {
  hotel: FeaturedStay
  className?: string
  /** next/image `sizes`: the default fits the three-across homepage grid */
  imageSizes?: string
}) {
  const [failed, setFailed] = useState<string[]>([])

  // Primary photo first, then display order; skip images that failed to load
  const image = useMemo(
    () =>
      [...(hotel.hotel_images ?? [])]
        .filter((img) => !failed.includes(img.image_url))
        .sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary) || (a.display_order ?? 0) - (b.display_order ?? 0))[0],
    [hotel.hotel_images, failed]
  )

  const location = [hotel.city, hotel.state].filter(Boolean).join(', ')
  const type = hotel.property_type ? hotel.property_type.charAt(0).toUpperCase() + hotel.property_type.slice(1) : null

  return (
    <article
      className={cn(
        'group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-foreground shadow-[0_18px_40px_-24px_rgba(7,63,61,0.55)]',
        className
      )}
    >
      {image ? (
        <Image
          src={image.image_url}
          alt={image.alt_text || hotel.name}
          fill
          sizes={imageSizes}
          className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          onError={() => setFailed((list) => [...list, image.image_url])}
        />
      ) : (
        <div className="absolute inset-0 -z-10 flex items-center justify-center bg-linear-to-br from-muted-foreground to-foreground">
          <Hotel className="h-14 w-14 text-white/25" />
        </div>
      )}

      {/* Legibility: dark at the bottom where the text sits, light at the top for the chips */}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 via-black/35 to-transparent" />
      <div className="absolute inset-x-0 top-0 -z-10 h-24 bg-linear-to-b from-black/35 to-transparent" />

      {/* "Featured": a gold ribbon tight across the top-left corner, like the rooms' "Best Value"
          (hotel/RoomComparison); the card clips its ends. Its centre sits on the corner's diagonal */}
      {hotel.is_featured && (
        <span
          className="pointer-events-none absolute -left-[38px] top-[22px] z-20 flex h-6 w-36 -rotate-45 items-center justify-center
                     bg-gold bg-linear-to-b from-white/25 to-transparent text-[10px] font-extrabold uppercase leading-none
                     tracking-wider text-primary shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
        >
          Featured
        </span>
      )}

      {/* Top row: type chip (moved clear of the ribbon) + wishlist */}
      <div className={cn('absolute right-4 top-4 z-10 flex items-start justify-between', hotel.is_featured ? 'left-[4.75rem]' : 'left-4')}>
        {type && (
          <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
            {type}
          </span>
        )}
        <WishlistButton hotelId={hotel.id} className="ml-auto" />
      </div>

      {/* Details, bottom-left (tighter on phones, where the homepage card is short) */}
      <div className="flex flex-col items-start gap-2 p-4 sm:gap-2.5 sm:p-6">
        {location && (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </p>
        )}

        <h3 className="text-lg font-extrabold leading-[1.2] tracking-tight text-white text-balance sm:text-xl xl:text-[22px]">
          <Link href={`/hotels/${hotel.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {hotel.name}
          </Link>
        </h3>

        {/* One inline row: guest rating · stars · price */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-white/85">
          {hotel.avg_rating ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-xs font-bold text-secondary">
              <Star className="h-3 w-3 fill-gold text-gold" />
              {hotel.avg_rating.toFixed(1)}
              <span className="font-medium text-secondary/70">({hotel.review_count})</span>
            </span>
          ) : (
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs font-semibold text-white">New</span>
          )}
          {!!hotel.star_rating && (
            <>
              <Dot />
              <span className="inline-flex items-center gap-0.5" aria-label={`${hotel.star_rating} star property`}>
                {Array.from({ length: hotel.star_rating }, (_, i) => (
                  <Star key={i} className="h-3 w-3 fill-gold text-gold" />
                ))}
              </span>
            </>
          )}
          {hotel.starting_price ? (
            <>
              <Dot />
              <span className="whitespace-nowrap">
                <span className="text-xs text-white/70">from </span>
                <span className="font-heading text-base font-extrabold text-white">
                  {formatCurrency(getInclusivePrice(hotel.starting_price))}
                </span>
                <span className="text-xs text-white/70"> / night</span>
              </span>
            </>
          ) : null}
        </div>

        {/* The whole card is the link; phones skip this line to keep the card short */}
        <span className="mt-1 hidden items-center gap-1.5 text-sm font-semibold text-white sm:inline-flex">
          <span className="border-b border-gold/70 pb-0.5 transition-colors group-hover:border-gold">View stay</span>
          <ArrowUpRight className="h-4 w-4 text-gold transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  )
}

/** Fills the last slot of the grid with a link to all stays */
export function ExploreStaysCard({ className }: { className?: string }) {
  return (
    <Link
      href="/hotels"
      className={cn(
        'group relative isolate flex aspect-[4/5] flex-col items-start justify-end gap-3 overflow-hidden rounded-2xl bg-secondary p-6 text-white',
        className
      )}
    >
      <div className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-primary/40 blur-2xl" />
      <div className="absolute -bottom-20 -left-10 -z-10 h-56 w-56 rounded-full bg-gold/20 blur-2xl" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">More stays</p>
      <h3 className="text-xl font-extrabold leading-[1.2] tracking-tight text-white xl:text-[22px]">
        Explore every stay on the Honnavar coast
      </h3>
      <p className="text-sm text-white/70">Filter by price, stay type and amenities.</p>
      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-secondary transition-colors group-hover:bg-gold">
        View all stays
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
