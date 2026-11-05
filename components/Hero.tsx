import { SearchWidget } from "@/components/search/SearchWidget";
import { HeroSlideshow } from "@/components/home/HeroSlideshow";

/* ─────────────────────────────────────────────────────────────────
   Hero — full-bleed crossfading marketing slides (photo, headline
   and text per slide, in lib/config/hero-slides.ts)
   with the copy on the left, and the search card overlapping the
   bottom edge of the image.
   Typography:  Manrope (headline) + Inter (copy)
   ───────────────────────────────────────────────────────────────── */

export function Hero() {
  return (
    <section className="relative w-full bg-background">
      <HeroSlideshow
        className="h-[460px] sm:h-[600px] lg:h-[660px]"
        contentClassName="page-container flex flex-col justify-center pb-24 pt-16 sm:pb-16 sm:pt-[72px]"
        dotsClassName="page-container inset-x-0 bottom-28 sm:bottom-24 justify-end"
      />

      {/* Search card overlapping the image edge */}
      <div className="relative z-20 page-container -mt-24 sm:-mt-20">
        <SearchWidget />
      </div>
    </section>
  );
}
