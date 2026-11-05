import { Navbar } from '@/components/Navbar'
import { BoatDetailsClient } from '@/components/boat/BoatDetailsClient'

export default async function BoatDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <BoatDetailsClient slug={slug} />
      </main>
    </div>
  )
}
