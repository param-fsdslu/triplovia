import { createClient } from '@/lib/db/server'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CalendarDays, ArrowLeft, ArrowRight, MapPin, Clock } from '@/components/icons'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { HotelService } from '@/lib/services/hotel.service'
import { ExploreStaysButton } from '@/components/blog/ExploreStaysButton'
import { sameCity } from '@/lib/utils/blog-city'

async function getBlogBySlug(slug: string) {
  const db = await createClient()

  const { data: blog, error } = await db
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !blog) return null
  return blog
}

/** Counts a view (the page only; generateMetadata reads the post without counting) */
async function countView(blog: { id: string; view_count?: number | null }) {
  const db = await createClient()
  await db
    .from('blogs')
    .update({ view_count: (blog.view_count || 0) + 1 })
    .eq('id', blog.id)
}

/** Up to three other published posts about the same city, newest first */
async function getMoreFromCity(city: string, excludeId: string) {
  const db = await createClient()
  const { data } = await db
    .from('blogs')
    .select('id, title, slug, featured_image, published_at, city')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return (data || []).filter((post: any) => post.id !== excludeId && sameCity(post.city, city)).slice(0, 3)
}

// India time, so every reader sees the same date
const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
const SHORT_DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

/** About 200 words a minute, at least 1 */
function readingMinutes(html: string) {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  if (!blog) notFound()

  const [stays, moreFromCity] = await Promise.all([
    blog.city ? HotelService.staysInCity(blog.city) : Promise.resolve(null),
    blog.city ? getMoreFromCity(blog.city, blog.id) : Promise.resolve([]),
    countView(blog),
  ])
  const minutes = readingMinutes(blog.content || '')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar transparent={false} />

      <main className="grow pt-16 sm:pt-[72px]">
        {/* ── Hero: the cover photo with the title over it ───────── */}
        <header className="relative isolate overflow-hidden bg-secondary">
          {blog.featured_image && (
            <Image
              src={blog.featured_image}
              alt=""
              fill
              priority
              className="-z-10 object-cover"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

          <div className="page-container flex min-h-[420px] flex-col pb-10 pt-6 sm:min-h-[480px] sm:pb-12 lg:min-h-[540px]">
            <Link
              href="/blog"
              aria-label="Back to Journal"
              title="Back to Journal"
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <div className="mt-auto max-w-3xl pt-16">
              <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
                {blog.title}
              </h1>

              {/* City (links to its stories), date and reading time on one line */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                {blog.city && (
                  <Link
                    href={`/blog?city=${encodeURIComponent(blog.city)}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-gold"
                  >
                    <MapPin className="h-4 w-4" />
                    {blog.city}
                  </Link>
                )}
                {blog.published_at && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {DATE.format(new Date(blog.published_at))}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {minutes} min read
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Article, with a sidebar on large screens ──────────── */}
        <div className="page-container py-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
            <article className="min-w-0">
              {/* Excerpt as a pull quote */}
              {blog.excerpt && (
                <p
                  className="mb-8 border-l-[3px] border-gold pl-5 text-lg italic leading-relaxed text-muted-foreground sm:text-xl"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {blog.excerpt}
                </p>
              )}

              {/* max-w-none! beats the 65ch cap on .prose in globals.css, so the text fills the column */}
              <div className="prose prose-lg max-w-none!" dangerouslySetInnerHTML={{ __html: blog.content }} />

              <div className="mt-14 flex items-center justify-between border-t border-border/60 pt-8">
                <Link
                  href="/blog"
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-gold"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  Back to Journal
                </Link>
                <div className="flex items-center gap-2">
                  <span className="h-px w-6 bg-gold/40" />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest text-gold/60"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Triplovia
                  </span>
                </div>
              </div>
            </article>

            <aside className="space-y-6 lg:sticky lg:top-[96px] lg:self-start">
              {/* Explore stays in the post's city */}
              {blog.city && stays && <ExploreStaysButton city={blog.city} stays={stays.stays} variant="panel" />}

              {/* More stories from the same city */}
              {blog.city && moreFromCity.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">More from {blog.city}</p>
                  <ul className="mt-4 space-y-4">
                    {moreFromCity.map((post: any) => (
                      <li key={post.id}>
                        <Link href={`/blog/${post.slug}`} className="group flex gap-3">
                          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                            {post.featured_image && (
                              <Image
                                src={post.featured_image}
                                alt=""
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="80px"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                              {post.title}
                            </p>
                            {post.published_at && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {SHORT_DATE.format(new Date(post.published_at))}
                              </p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/blog?city=${encodeURIComponent(blog.city)}`}
                    className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
                  >
                    All {blog.city} stories
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )}

              <Link
                href="/blog"
                className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-gold">The Journal</span>
                  <span className="mt-1 block text-sm font-semibold text-foreground">Browse all travel stories</span>
                </span>
                <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-0.5" />
              </Link>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  if (!blog) return { title: 'Blog Post Not Found' }

  return {
    title: blog.meta_title || blog.title,
    description: blog.meta_description || blog.excerpt,
    openGraph: {
      title: blog.meta_title || blog.title,
      description: blog.meta_description || blog.excerpt,
      images: blog.featured_image ? [blog.featured_image] : [],
    },
  }
}
