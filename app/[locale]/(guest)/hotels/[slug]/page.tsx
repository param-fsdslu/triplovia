import { Navbar } from '@/components/Navbar';
import { HotelDetailsClient } from '@/components/hotel/HotelDetailsClient';

export default async function HotelDetailsPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar transparent={false} />
      <main className="grow">
        <HotelDetailsClient slug={slug} />
      </main>
    </div>
  );
}
