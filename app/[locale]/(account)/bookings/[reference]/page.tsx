import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { BookingConfirmation } from '@/components/booking/BookingConfirmation'

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params

  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div>
      <BookingConfirmation bookingReference={reference} />
    </div>
  )
}
