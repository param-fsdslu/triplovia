/**
 * A Journal post as a photo card: the featured image fills the card, with a dark gradient and the
 * title, excerpt and "Read story" over it (no city, tags, date or view count). Used two to a row on
 * the homepage (FeaturedBlogs) and on /blog. Posts without a photo get a deep-teal gradient instead.
 */
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from '@/components/icons'
import { cn } from '@/lib/utils'

export interface BlogStory {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  published_at: string | null
  view_count: number | null
  tags: string[] | null
  city: string | null
}

interface BlogStoryCardProps {
  blog: BlogStory
  /** Load the photo eagerly (cards above the fold) */
  priority?: boolean
  className?: string
}

export function BlogStoryCard({ blog, priority, className }: BlogStoryCardProps) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className={cn(
        'group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-secondary sm:aspect-[16/11]',
        'shadow-[0_2px_12px_rgba(7,63,61,0.08)] transition-shadow duration-300 hover:shadow-[0_18px_44px_-18px_rgba(7,63,61,0.45)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className
      )}
    >
      {blog.featured_image ? (
        <Image
          src={blog.featured_image}
          alt=""
          fill
          priority={priority}
          className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px"
        />
      ) : (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-secondary via-primary/80 to-secondary" />
      )}
      {/* Keeps the text readable on any photo */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

      {/* The story, at the bottom */}
      <div className="p-5 sm:p-6">
        <h3 className="line-clamp-2 text-xl font-bold leading-snug text-white sm:text-2xl">{blog.title}</h3>
        {blog.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">{blog.excerpt}</p>}
        <div className="mt-4 border-t border-white/20 pt-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors group-hover:text-gold">
            Read story
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
