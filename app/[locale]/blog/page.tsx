import { createClient } from '@/lib/db/server'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { BookOpen, MapPin } from '@/components/icons'
import Link from 'next/link'
import { blogCities, cleanCity, sameCity } from '@/lib/utils/blog-city'
import { HotelService } from '@/lib/services/hotel.service'
import { ExploreStaysButton } from '@/components/blog/ExploreStaysButton'
import { BlogStoryCard, type BlogStory } from '@/components/blog/BlogStoryCard'
import { cn } from '@/lib/utils'

async function getPublishedBlogs() {
  const db = await createClient()
  const { data: blogs, error } = await db
    .from('blogs')
    .select('id, title, slug, excerpt, featured_image, published_at, view_count, tags, city')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching blogs:', error)
    return []
  }
  return blogs || []
}

const chipClass = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
    active
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-card text-foreground hover:border-primary/50 hover:text-primary'
  )

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const allBlogs = await getPublishedBlogs()
  const cities = blogCities(allBlogs)
  // ?city= (e.g. the homepage's "Explore <city>"): that city's posts, spelled as the posts (or hotels) spell it
  const requested = cleanCity((await searchParams).city)
  const stays = requested ? await HotelService.staysInCity(requested) : null
  const city = requested ? (cities.find((c) => sameCity(c.name, requested))?.name ?? stays?.city ?? requested) : null
  const blogs = city ? allBlogs.filter((blog: any) => sameCity(blog.city, city)) : allBlogs
  const staysInCity = stays?.stays ?? 0

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navbar transparent={false} />

      {/* ── Page hero header ──────────────────────────────── */}
      <div className="pt-16 sm:pt-20 bg-[var(--background)] border-b border-border/50">
        <div className="page-container py-10 sm:py-14">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px w-8 bg-gold" />
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
                Journal
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {city ? <>Travel Stories from {city}</> : <>Travel Stories &amp; Guides</>}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">
              {city
                ? `Tips, guides and stories about ${city} and around.`
                : 'Discover coastal Karnataka through travel tips, destination guides, and stories.'}
            </p>
            {city && <ExploreStaysButton city={city} stays={staysInCity} className="mt-5" />}
          </div>

          {/* City filter: every city that has posts */}
          {cities.length > 0 && (
            <nav aria-label="Filter by city" className="mt-6 flex flex-wrap gap-2">
              <Link href="/blog" className={chipClass(!city)} aria-current={!city ? 'page' : undefined}>
                All places
              </Link>
              {cities.map((c) => {
                const active = sameCity(c.name, city)
                return (
                  <Link
                    key={c.name}
                    href={`/blog?city=${encodeURIComponent(c.name)}`}
                    className={chipClass(active)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <MapPin className="h-3 w-3" />
                    {c.name}
                    <span className={active ? 'text-primary-foreground/75' : 'text-muted-foreground'}>{c.count}</span>
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
      </div>

      {/* ── Blog grid ─────────────────────────────────────── */}
      <main className="flex-grow">
        <div className="page-container py-10 sm:py-14">
          {blogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/8 flex items-center justify-center mb-4">
                <BookOpen className="h-7 w-7 text-primary/50" />
              </div>
              <h3
                className="text-lg font-bold text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {city ? `No posts about ${city} yet` : 'No posts yet'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {city ? (
                  <Link href="/blog" className="font-semibold text-primary hover:underline">
                    See all travel stories
                  </Link>
                ) : (
                  'Check back soon for travel stories.'
                )}
              </p>
            </div>
          ) : (
            // Photo cards, two to a row (the homepage stories use the same card)
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
              {blogs.map((blog: BlogStory, i: number) => (
                <BlogStoryCard key={blog.id} blog={blog} priority={i < 2} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
