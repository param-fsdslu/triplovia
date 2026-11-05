import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/home/TrustBar";
import { FeaturedHotels } from "@/components/FeaturedHotels";
import { FeaturedBlogs } from "@/components/FeaturedBlogs";
import { TripIdeas } from "@/components/home/TripIdeas";
import { ListPropertyCta } from "@/components/home/ListPropertyCta";
import { isFeatureEnabled } from "@/lib/config/features";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        {/* Featured stays straight under the search box (by request), then the trust points */}
        {isFeatureEnabled('hotels') && <FeaturedHotels />}
        <TrustBar />
        {isFeatureEnabled('hotels') && <TripIdeas />}
        {isFeatureEnabled('blogs') && <FeaturedBlogs />}
        <ListPropertyCta />
      </main>
      <Footer />
    </div>
  );
}
