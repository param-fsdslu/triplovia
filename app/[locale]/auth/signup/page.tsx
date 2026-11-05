import { redirect as navigate } from 'next/navigation'
import { AuthPageCard } from '@/components/auth/AuthPageCard'
import { ListPropertyBanner } from '@/components/listing/ListPropertyBanner'
import { createClient } from '@/lib/db/server'

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ redirect?: string }>
}) {
  const { locale } = await params
  const { redirect } = await searchParams

  // Already signed in: go to My Bookings
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (user) navigate(`/${locale}/bookings`)

  return (
    <div className="bg-muted flex flex-1 flex-col items-center justify-center px-4 py-8 md:p-10">
      <div className="w-full max-w-[480px] md:max-w-[880px] space-y-4">
        <AuthPageCard intent="signup" redirectTo={redirect} />
        <ListPropertyBanner />
      </div>
    </div>
  )
}
