import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "@/components/icons";

const featuredHotels = [
  {
    title: "Eco Beach Resort",
    location: "Kasarkod Beach",
    rating: 4.8,
    price: "₹3,500",
    image: "/images/hotel-1.jpg", // Placeholder
  },
  {
    title: "River View Homestay",
    location: "Sharavathi Backwaters",
    rating: 4.5,
    price: "₹2,200",
    image: "/images/hotel-2.jpg", // Placeholder
  },
  {
    title: "Coastal Palms Hotel",
    location: "Coastal Karnataka",
    rating: 4.2,
    price: "₹1,800",
    image: "/images/hotel-3.jpg", // Placeholder
  },
];

const featuredExperiences = [
  {
    title: "Sunset Boat Ride",
    location: "Sharavathi River",
    rating: 4.9,
    price: "₹500/person",
    image: "/images/boat-1.jpg", // Placeholder
  },
  {
    title: "Mangrove Kayaking",
    location: "Sharavathi Backwaters",
    rating: 4.7,
    price: "₹800/person",
    image: "/images/boat-2.jpg", // Placeholder
  },
];

export function Featured() {
  return (
    <section className="py-12 bg-background">
      <div className="page-container space-y-12">
        
        {/* Popular Hotels */}
        <div>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Popular Stays</h2>
              <p className="text-muted-foreground">Top-rated hotels and homestays for your perfect vacation</p>
            </div>
            <a href="#" className="text-primary font-semibold hover:underline hidden md:block">View All</a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredHotels.map((hotel, index) => (
              <Card key={index} className="overflow-hidden border-none shadow-md hover:shadow-xl transition-shadow cursor-pointer group">
                <div className="relative h-48 bg-border">
                  {/* Placeholder for Image */}
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-border">
                    <span className="text-sm">Image Placeholder</span>
                  </div>
                  <Badge className="absolute top-3 right-3 bg-white text-black hover:bg-white">
                    <Star className="w-3 h-3 fill-gold text-gold mr-1" />
                    {hotel.rating}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{hotel.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{hotel.location}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">{hotel.price}</span>
                    <span className="text-xs text-muted-foreground">/ night</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Trending Experiences */}
        <div>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Trending Experiences</h2>
              <p className="text-muted-foreground">Don't miss out on these activities</p>
            </div>
            <a href="#" className="text-primary font-semibold hover:underline hidden md:block">View All</a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredExperiences.map((exp, index) => (
              <Card key={index} className="overflow-hidden border-none shadow-md hover:shadow-xl transition-shadow cursor-pointer group">
                <div className="flex flex-col md:flex-row h-full">
                  <div className="relative w-full md:w-2/5 h-48 md:h-auto bg-border">
                     {/* Placeholder for Image */}
                     <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-border">
                        <span className="text-sm">Image Placeholder</span>
                      </div>
                  </div>
                  <div className="p-4 flex flex-col justify-center w-full md:w-3/5">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{exp.title}</h3>
                       <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-gold text-gold" />
                        {exp.rating}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{exp.location}</p>
                    <div className="mt-auto">
                      <span className="text-lg font-bold">{exp.price}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
