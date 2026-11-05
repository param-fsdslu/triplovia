import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { ArrowRight } from '@/components/icons'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { cn } from '@/lib/utils'

const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`

/** Kinds of trip, each a link to the stays search for that stay type. The first one is the large card. */
const IDEAS = [
  {
    image: unsplash('photo-1566073771259-6a8506099945', 1600),
    alt: 'Resort pool and wooden sun loungers at sunset',
    title: 'Pools, sea air and slow mornings',
    text: 'Make a long weekend of it at a resort on the Karnataka coast.',
    cta: 'Explore resorts',
    href: '/hotels?propertyType=resort',
  },
  {
    image: unsplash('photo-1511895426328-dc8714191300', 1200),
    alt: 'A family walking hand in hand on the beach at sunset',
    title: 'Homestays with room for everyone',
    text: 'Stay with local hosts and keep the whole family under one roof.',
    cta: 'Browse homestays',
    href: '/hotels?propertyType=homestay',
  },
  {
    image: unsplash('photo-1613490493576-7fde63acd811', 1000),
    alt: 'Modern villa with a private pool',
    title: 'Private villas',
    text: 'Space and privacy for friends, groups and special occasions.',
    cta: 'View villas',
    href: '/hotels?propertyType=villa',
  },
  {
    image: unsplash('photo-1542314831-068cd1dbfeeb', 1000),
    alt: 'Hotel entrance and pool lit up at dusk',
    title: 'Comfortable hotels',
    text: 'Easy rooms for work trips, stopovers and quick breaks.',
    cta: 'See hotels',
    href: '/hotels?propertyType=hotel',
  },
]

/**
 * Homepage marketing block: kinds of trip as photo cards in a bento grid (one large card, one wide,
 * two small on desktop), each opening the stays search for that stay type.
 */
export function TripIdeas() {
  return (
    <section className="border-y border-border bg-card py-12 sm:py-16">
      <div className="page-container">
        <SectionHeader
          title="A stay for every kind of trip"
          description="Weekend resorts, family homestays, private villas and easy hotel rooms. Pick the trip and we'll show you where to stay."
          action={
            <Link
              href="/hotels"
              className="group inline-flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pl-5 pr-1.5
                         text-sm font-semibold text-foreground shadow-[0_1px_3px_rgba(7,63,61,0.06)] transition-colors
                         hover:border-primary/40 hover:text-primary"
            >
              Explore all stays
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors group-hover:bg-primary-hover">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:h-[560px] lg:grid-cols-4 lg:grid-rows-2">
          {IDEAS.map((idea, i) => {
            const large = i === 0
            const wide = i === 1
            return (
              <Link
                key={idea.href}
                href={idea.href}
                className={cn(
                  'group relative isolate flex min-h-[260px] flex-col justify-end overflow-hidden rounded-2xl bg-secondary p-5 text-white sm:p-6',
                  large && 'sm:col-span-2 sm:min-h-[340px] lg:row-span-2 lg:min-h-0 lg:p-8',
                  wide && 'sm:col-span-2 lg:min-h-0',
                  !large && !wide && 'lg:min-h-0'
                )}
              >
                <Image
                  src={idea.image}
                  alt={idea.alt}
                  fill
                  sizes={large ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'}
                  className="-z-10 object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />

                <h3
                  className={cn(
                    'font-bold leading-tight tracking-tight text-white',
                    large ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-xl sm:text-2xl'
                  )}
                >
                  {idea.title}
                </h3>
                <p className={cn('mt-2 max-w-md text-sm leading-relaxed text-white/80', large && 'sm:text-base')}>
                  {idea.text}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  {idea.cta}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors group-hover:bg-primary">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
