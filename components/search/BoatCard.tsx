'use client'

import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Ship, ChevronRight, Clock, Users } from '@/components/icons'

interface BoatCardProps {
  boat: {
    id: string
    name: string
    slug: string
    description?: string
    boat_type?: string
    capacity?: number
    departure_point?: string
    city: string
    state: string
    avg_rating?: number
    review_count?: number
    boat_images?: Array<{
      id: string
      image_url: string
      alt_text?: string
      is_primary: boolean
      display_order: number
    }>
    minPrice: number
    maxPrice: number
    pricingLabel: string
    minDuration?: number
  }
}

export function BoatCard({ boat }: BoatCardProps) {
  const primaryImage = boat.boat_images?.find((img) => img.is_primary) || boat.boat_images?.[0]

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row">
        {/* Boat Image */}
        <div className="relative h-48 sm:h-auto sm:w-60 md:w-72 lg:w-80 flex-shrink-0">
          {primaryImage ? (
            <Image
              src={primaryImage.image_url}
              alt={primaryImage.alt_text || boat.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 320px"
            />
          ) : (
            <div className="w-full h-full min-h-[12rem] bg-muted flex items-center justify-center">
              <Ship className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
            </div>
          )}

          {boat.boat_type && (
            <Badge className="absolute top-3 left-3 capitalize">
              {boat.boat_type}
            </Badge>
          )}
        </div>

        {/* Boat Details */}
        <div className="flex-1 p-4 sm:p-5 md:p-6">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex-1 min-w-0">
              <Link href={`/boats/${boat.slug}`}>
                <h3 className="text-lg sm:text-xl font-bold text-foreground hover:text-primary transition-colors mb-1 sm:mb-2 line-clamp-1">
                  {boat.name}
                </h3>
              </Link>

              {boat.avg_rating && (
                <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span className="font-semibold text-sm">{boat.avg_rating}</span>
                  {boat.review_count && (
                    <span className="text-sm text-muted-foreground">({boat.review_count} reviews)</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1.5 sm:mb-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {boat.departure_point ? `${boat.departure_point}, ` : ''}{boat.city}, {boat.state}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-2">
                {boat.capacity && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Up to {boat.capacity}</span>
                  </div>
                )}
                {boat.minDuration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>From {boat.minDuration} min</span>
                  </div>
                )}
              </div>

              {boat.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 hidden sm:block">
                  {boat.description}
                </p>
              )}
            </div>
          </div>

          {/* Pricing and CTA */}
          <div className="flex items-end justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Starting from</p>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-primary">
                  ₹{Math.round(boat.minPrice).toLocaleString('en-IN')}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">/ {boat.pricingLabel}</span>
              </div>
              {boat.maxPrice > boat.minPrice && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Up to ₹{Math.round(boat.maxPrice).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <Link href={`/boats/${boat.slug}`}>
              <Button size="default" className="gap-1 sm:gap-2 text-sm">
                <span className="hidden sm:inline">View Details</span>
                <span className="sm:hidden">View</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
