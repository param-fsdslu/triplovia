'use client';

/**
 * "Travel stories": up to four published posts as photo cards, two to a row (BlogStoryCard). On
 * the homepage it follows the city in the hero search box (useSearchStore.pickedCity, its default
 * included): that city's posts with an "Explore <city>" button to /blog?city=…; when it has none,
 * general posts (no city), never another city's; with neither, a "No stories about <city> yet" note.
 * With a `city` prop (under /hotels results) it shows only that city's posts and nothing when there
 * are none.
 */
import Link from 'next/link';
import { Loader2, ArrowRight, MapPin } from '@/components/icons';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { BlogStoryCard, type BlogStory } from '@/components/blog/BlogStoryCard';
import { useSearchStore } from '@/lib/stores/use-search-store';
import { cityKey, cleanCity } from '@/lib/utils/blog-city';

const MAX_POSTS = 4;

/** One city's posts, or with `general` the posts about no particular city */
async function fetchFeaturedBlogs(filter: { city?: string | null; general?: boolean }): Promise<BlogStory[]> {
  const params = new URLSearchParams({ limit: String(MAX_POSTS) });
  if (filter.city) params.set('city', filter.city);
  if (filter.general) params.set('general', '1');
  const response = await fetch(`/api/blogs/featured?${params}`);
  if (!response.ok) throw new Error('Failed to fetch blogs');
  return response.json();
}

const STALE_MS = 1000 * 60 * 5;

interface FeaturedBlogsProps {
  /** Only this city's posts (nothing when it has none); without it, the city picked in the search box */
  city?: string;
}

export function FeaturedBlogs({ city: fixedCity }: FeaturedBlogsProps = {}) {
  const pickedCity = useSearchStore((s) => s.pickedCity);
  const city = cleanCity(fixedCity ?? pickedCity);

  const forCity = useQuery({
    queryKey: ['blogs', 'featured', 'city', cityKey(city)],
    queryFn: () => fetchFeaturedBlogs({ city }),
    enabled: !!city,
    staleTime: STALE_MS,
  });
  const general = useQuery({
    queryKey: ['blogs', 'featured', 'general'],
    queryFn: () => fetchFeaturedBlogs({ general: true }),
    enabled: !fixedCity,
    staleTime: STALE_MS,
  });

  const cityPosts = forCity.data ?? [];
  const showCity = cityPosts.length > 0;
  const blogs = (showCity ? cityPosts : fixedCity ? [] : general.data ?? []).slice(0, MAX_POSTS);
  // The posts' own spelling of the city ("Honnavar" for a typed "honnavar")
  const cityName = showCity ? cityPosts[0].city || city : city;
  // Wait for the city's posts first (no flash of other posts), then the general ones when it has none
  const isLoading = (!!city && forCity.isLoading) || (!showCity && !fixedCity && general.isLoading);
  // Homepage, a city in the search box, and nothing to show for it
  const noStories = !fixedCity && !!city && blogs.length === 0;

  if (isLoading) {
    // Under search results, stay out of the way until there is something to show
    if (fixedCity) return null;
    return (
      <section className="py-12 sm:py-16 bg-[var(--background)]">
        <div className="page-container flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (noStories) {
    return (
      <section className="py-12 sm:py-16 bg-[var(--background)]">
        <div className="page-container">
          <SectionHeader title={`Travel stories from ${city}`} />
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <MapPin className="mx-auto mb-3 h-6 w-6 text-primary/50" />
            <p className="font-semibold text-foreground">No stories about {city} yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Pick another place in the search, or</p>
            <Link
              href="/blog"
              className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Browse all stories
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (blogs.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-[var(--background)]">
      <div className="page-container">
        <SectionHeader
          title={showCity ? `Travel stories from ${cityName}` : 'Travel stories'}
          action={
            // The city's own Journal page (/blog?city=…), or all stories
            <Link
              href={showCity && cityName ? `/blog?city=${encodeURIComponent(cityName)}` : '/blog'}
              className="group inline-flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pl-5 pr-1.5
                         text-sm font-semibold text-foreground shadow-[0_1px_3px_rgba(7,63,61,0.06)] transition-colors
                         hover:border-primary/40 hover:text-primary"
            >
              {showCity && cityName ? `Explore ${cityName}` : 'View all stories'}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors group-hover:bg-primary-hover">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          }
        />

        {/* Two photo cards to a row */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
          {blogs.map((blog) => (
            <BlogStoryCard key={blog.id} blog={blog} />
          ))}
        </div>
      </div>
    </section>
  );
}
