import { Navbar } from '@/components/Navbar'
import { BoatBookingForm } from '@/components/booking/BoatBookingForm'
import { createClient } from '@/lib/db/server'
import { redirect } from '@/i18n/routing'

export default async function BoatBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>
  searchParams: Promise<{ tripTypeId?: string }>
}) {
  const { slug } = await params
  const { tripTypeId } = await searchParams

  if (!tripTypeId) {
    redirect({ href: `/boats/${slug}`, locale: 'en' })
  }

  const db = await createClient()

  // Auth required
  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) {
    redirect({ href: `/auth/login?redirect=/boats/${slug}/book?tripTypeId=${tripTypeId}`, locale: 'en' })
  }

  // Fetch boat
  const { data: boat, error: boatError } = await db
    .from('boats')
    .select('id, name, departure_point, city, state, phone, email')
    .eq('slug', slug)
    .single()

  if (boatError || !boat) {
    redirect({ href: `/boats/${slug}`, locale: 'en' })
    return
  }

  // Fetch trip type
  const { data: tripType, error: tripTypeError } = await db
    .from('trip_types')
    .select(
      `
      id,
      name,
      description,
      duration_minutes,
      max_passengers,
      min_passengers,
      pricing_model,
      price_per_person,
      price_per_boat,
      child_price_per_person,
      includes_text,
      what_to_bring_text
    `
    )
    .eq('id', tripTypeId)
    .eq('boat_id', boat.id)
    .single()

  if (tripTypeError || !tripType) {
    redirect({ href: `/boats/${slug}`, locale: 'en' })
    return
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow page-container py-8 pt-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Booking</h1>
          <p className="text-muted-foreground">
            You&apos;re just a few steps away from confirming your boat trip
          </p>
        </div>

        <BoatBookingForm
          boat={boat}
          tripType={tripType}
          userId={user?.id}
          userEmail={user?.email}
          userName={
            user?.user_metadata?.first_name && user?.user_metadata?.last_name
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
              : undefined
          }
        />
      </main>
    </div>
  )
}
