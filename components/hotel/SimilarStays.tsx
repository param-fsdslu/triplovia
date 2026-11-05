'use client';

/**
 * Hotel page "Similar stays": a white band with up to two other stays in the same city (see
 * HotelService.getSimilarHotels), two to a row, as the homepage's full-photo cards in a wider
 * shape. Hidden when the city has no other stays.
 */
import { SectionHeader } from '@/components/layout/SectionHeader';
import { FeaturedStayCard, type FeaturedStay } from '@/components/home/FeaturedStayCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSimilarHotels } from '@/lib/hooks/use-hotels';

const CARD_SHAPE = 'aspect-[4/3] sm:aspect-[3/2]';

export function SimilarStays({ hotelId, city }: { hotelId: string; city?: string | null }) {
  const { data: hotels, isLoading, error } = useSimilarHotels(hotelId, 2);

  if (!city || error || (!isLoading && (!hotels || hotels.length === 0))) return null;

  return (
    <section className="border-t border-border bg-card py-12 sm:py-16">
      <div className="page-container">
        <SectionHeader
          title={`Similar stays in ${city}`}
          description="More places to stay nearby, with prices that include taxes and fees."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className={`${CARD_SHAPE} rounded-2xl`} />)
            : hotels!.map((hotel: FeaturedStay) => (
                <FeaturedStayCard
                  key={hotel.id}
                  hotel={hotel}
                  className={CARD_SHAPE}
                  imageSizes="(min-width: 1280px) 600px, (min-width: 640px) 50vw, 100vw"
                />
              ))}
        </div>
      </div>
    </section>
  );
}
