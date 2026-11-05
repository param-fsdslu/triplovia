import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hotel, Car, Bike, Ship, ArrowRight } from "@/components/icons";

const services = [
  {
    title: "Hotel Booking",
    description: "Find the best stays, from luxury resorts to cozy homestays.",
    icon: Hotel,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Cab Booking",
    description: "Reliable cab services for local sightseeing and outstation trips.",
    icon: Car,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    title: "Bike Rentals",
    description: "Explore the coastal roads on two wheels with our premium bike rentals.",
    icon: Bike,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    title: "Boat Rides",
    description: "Experience the backwaters and scenic river rides of coastal Karnataka.",
    icon: Ship,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

export function Services() {
  return (
    <section id="services" className="py-20 bg-muted/30">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Our Services</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We offer a comprehensive range of travel services to make your trip unforgettable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-none shadow-md overflow-hidden">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${service.bg} ${service.color} group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-6 text-base">
                  {service.description}
                </CardDescription>
                <Button variant="ghost" className="p-0 h-auto font-semibold text-primary group-hover:translate-x-1 transition-transform">
                  Learn More <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
