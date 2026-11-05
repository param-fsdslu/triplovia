import { Navbar } from '@/components/Navbar'
import { BoatBookingConfirmation } from '@/components/booking/BoatBookingConfirmation'

export default async function BoatBookingConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow page-container py-8">
        <BoatBookingConfirmation bookingReference={reference} />
      </main>
    </div>
  )
}
