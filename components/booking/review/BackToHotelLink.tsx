'use client'

/**
 * BackToHotelLink — top of the review page. Rooms are changed on the hotel page (the review page
 * has no room steppers), so this goes back there with the stay as it is now: the review form keeps
 * the cart's dates and guests current, and applyCartStay hands them to the hotel page.
 */
import { ArrowLeft } from '@/components/icons'
import { Link } from '@/i18n/routing'
import { applyCartStay } from '@/lib/stores/use-cart-store'

export function BackToHotelLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/hotels/${slug}#rooms`}
      onClick={applyCartStay}
      className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to hotel
    </Link>
  )
}
