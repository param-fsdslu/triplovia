'use client';

import { ArrowRight } from '@/components/icons';
import { Link } from '@/i18n/routing';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ExploreStaysCard, FeaturedStayCard, type FeaturedStay } from '@/components/home/FeaturedStayCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeaturedHotels } from '@/lib/hooks/use-hotels';
import { FEATURED_STAYS_LIMIT } from '@/lib/config/featured';
import { DEFAULT_DESTINATION } from '@/lib/config/search';
import { useSearchStore } from '@/lib/stores/use-search-store';
import { cleanCity } from '@/lib/utils/blog-city';

/** Landscape and short (by request): 5:4 on phones (one a row), 16:9 from two a row */
const CARD_SHAPE = 'aspect-[5/4] sm:aspect-video';
/** Two a row from `sm`, so a photo is about half the page wide */
const IMAGE_SIZES = '(min-width: 1280px) 600px, (min-width: 640px) 50vw, 100vw';

/**
 * Homepage grid of the stays a super admin featured (admin Hotels list → Featured; best-rated
 * active stays until any is), as full-photo cards, at most FEATURED_STAYS_LIMIT. Only the featured
 * stays of the city in the search box (by request; DEFAULT_DESTINATION until one is picked).
 * Hidden when that city has none. Two a row from `sm` (by request); with an odd count, an "explore all stays" card
 * fills the last row's empty slot.
 */
export function FeaturedHotels() {
  const city = cleanCity(useSearchStore((s) => s.pickedCity)) ?? DEFAULT_DESTINATION.name;
  const { data, isLoading, error } = useFeaturedHotels(FEATURED_STAYS_LIMIT, city);
  const hotels = data?.slice(0, FEATURED_STAYS_LIMIT);

  if (error || (!isLoading && (!hotels || hotels.length === 0))) return null;

  const fillLastRow = !!hotels && hotels.length % 2 === 1;

  return (
    <section className="py-12 sm:py-16">
      <div className="page-container">
        <SectionHeader
          title="Featured stays"
          description={`Hotels and homestays in ${city}, with prices that include taxes and fees.`}
          action={
            <Link
              href={`/hotels?location=${encodeURIComponent(city)}`}
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              View all stays
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className={`${CARD_SHAPE} rounded-2xl`} />
              ))
            : hotels!.map((hotel: FeaturedStay) => <FeaturedStayCard key={hotel.id} hotel={hotel} className={CARD_SHAPE} imageSizes={IMAGE_SIZES} />)}
          {fillLastRow && <ExploreStaysCard className={`hidden sm:flex ${CARD_SHAPE}`} />}
        </div>
      </div>
    </section>
  );
}
