import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { getWishlistHotels } from '@/lib/actions/wishlists'
import { HotelCard } from '@/components/search/HotelCard'
import { Link } from '@/i18n/routing'
import { Heart, Hotel, ArrowRight } from '@/components/icons'
import { Button } from '@/components/ui/button'

export default async function WishlistPage() {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const result = await getWishlistHotels()
  const hotels = result.data || []

  return (
    <div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 fill-red-500 text-red-500 shrink-0" />
          <h1
            className="text-2xl sm:text-3xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            My Wishlist
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {hotels.length === 0
            ? 'You haven\'t saved any properties yet.'
            : `${hotels.length} saved ${hotels.length === 1 ? 'property' : 'properties'}`}
        </p>
      </div>

      {hotels.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {hotels.map((hotel: any) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/8 mb-5">
            <Heart className="h-9 w-9 text-primary/40" />
          </div>
          <h2
            className="text-xl font-bold text-foreground mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            No saved properties yet
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Browse hotels and tap the heart icon to save properties you love for later.
          </p>
          <Button
            asChild
            className="rounded-full bg-primary hover:bg-primary-hover gap-2 font-semibold"
          >
            <Link href="/hotels">
              <Hotel className="h-4 w-4" />
              Browse Hotels
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
