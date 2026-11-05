import { createClient } from '@/lib/db/server'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { MessageSquare } from '@/components/icons'

export const metadata = {
  title: 'Guest Reviews | Triplovia',
  description: 'Read reviews from our guests about their hotel stays and boat trips.',
}

interface MergedReview {
  id: string
  overall_rating: number
  title?: string | null
  comment?: string | null
  image_urls?: string[] | null
  created_at: string
  property_name: string
  property_type: 'hotel' | 'boat'
}

export default async function ReviewsPage() {
  const db = await createClient()

  // Fetch hotel reviews with hotel name
  const { data: hotelReviews } = await db
    .from('reviews')
    .select('id, overall_rating, title, comment, image_urls, created_at, hotels(name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch boat reviews with boat name
  const { data: boatReviews } = await db
    .from('boat_reviews')
    .select('id, overall_rating, title, comment, image_urls, created_at, boats(name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50)

  // Merge and sort
  const allReviews: MergedReview[] = []

  if (hotelReviews) {
    for (const r of hotelReviews) {
      allReviews.push({
        id: r.id,
        overall_rating: r.overall_rating,
        title: r.title,
        comment: r.comment,
        image_urls: r.image_urls,
        created_at: r.created_at,
        property_name: (r.hotels as any)?.name || 'Hotel',
        property_type: 'hotel',
      })
    }
  }

  if (boatReviews) {
    for (const r of boatReviews) {
      allReviews.push({
        id: r.id,
        overall_rating: r.overall_rating,
        title: r.title,
        comment: r.comment,
        image_urls: r.image_urls,
        created_at: r.created_at,
        property_name: (r.boats as any)?.name || 'Boat',
        property_type: 'boat',
      })
    }
  }

  allReviews.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar transparent={false} />

      {/* ── Page header ───────────────────────────────────── */}
      <div className="pt-16 sm:pt-20 border-b border-border/50">
        <div className="page-container py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-gold" />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
              Community
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Guest Reviews
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg">
            See what our guests are saying about their experiences
          </p>
        </div>
      </div>

      <main className="grow">
        <div className="page-container py-10 sm:py-14">
          {allReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/8 flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-primary/50" />
              </div>
              <h3
                className="text-lg font-bold text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                No reviews yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Be the first to share your experience!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {allReviews.map((review) => (
                <ReviewCard key={`${review.property_type}-${review.id}`} review={review} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
