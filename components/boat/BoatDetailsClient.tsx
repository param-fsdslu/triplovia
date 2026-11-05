'use client'

import { useBoatBySlug } from '@/lib/hooks/use-boats'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from '@/i18n/routing'
import { getCurrentUser } from '@/lib/actions/session'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  MapPin,
  Star,
  Phone,
  Mail,
  Shield,
  CheckCircle2,
  Users,
  Clock,
  Anchor,
  Waves,
  Calendar,
} from '@/components/icons'

const getAmenityIcon = (iconName?: string) => {
  const iconMap: Record<string, any> = {
    wifi: CheckCircle2,
    'life-jacket': Shield,
    safety: Shield,
    anchor: Anchor,
    waves: Waves,
  }
  const IconComponent = iconName ? iconMap[iconName.toLowerCase()] : null
  return IconComponent || CheckCircle2
}

interface BoatDetailsClientProps {
  slug: string
}

export function BoatDetailsClient({ slug }: BoatDetailsClientProps) {
  const { data: boat, isLoading, error } = useBoatBySlug(slug)
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="page-container py-8 pt-20 sm:pt-24">
        <Skeleton className="h-[250px] sm:h-[350px] md:h-[400px] w-full rounded-lg mb-8" />
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !boat) {
    return (
      <div className="page-container py-20 pt-28 sm:pt-32">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Boat Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The boat you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <a href="/" className="text-primary hover:underline font-semibold">Return to home</a>
        </div>
      </div>
    )
  }

  const handleBookTrip = (tripTypeId: string) => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/boats/${slug}/book?tripTypeId=${tripTypeId}`)
      return
    }
    router.push(`/boats/${slug}/book?tripTypeId=${tripTypeId}`)
  }

  const primaryImage = boat.boat_images?.find((img: any) => img.is_primary) || boat.boat_images?.[0]

  return (
    <div className="bg-white pt-16 sm:pt-20">
      <div className="page-container py-4 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <a href="/" className="hover:text-primary">Home</a>
          <span>&rsaquo;</span>
          <a href="/boats" className="hover:text-primary">Boats</a>
          <span>&rsaquo;</span>
          <span className="text-foreground">{boat.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {boat.boat_type && (
                <Badge variant="outline" className="capitalize text-xs">
                  {boat.boat_type}
                </Badge>
              )}
              {boat.capacity && (
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {boat.capacity} passengers
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 leading-tight">{boat.name}</h1>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {boat.departure_point && `${boat.departure_point}, `}{boat.city}, {boat.state}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-green-600" />
                <span>Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span>Instant Booking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>Safety Certified</span>
              </div>
            </div>
          </div>

          {boat.avg_rating && (
            <div className="shrink-0 bg-primary text-primary-foreground px-4 py-3 rounded-lg text-center min-w-[80px] self-start">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 fill-white" />
                <span className="text-2xl font-bold">{boat.avg_rating}</span>
              </div>
              {boat.review_count && (
                <p className="text-xs opacity-90">{boat.review_count} reviews</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      {boat.boat_images && boat.boat_images.length > 0 && (
        <div className="page-container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 rounded-lg overflow-hidden aspect-[2/1] sm:aspect-[3/1] md:aspect-[5/2]">
            <div className="col-span-2 row-span-2 relative">
              <Image
                src={primaryImage?.image_url || boat.boat_images[0].image_url}
                alt={primaryImage?.alt_text || boat.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            {boat.boat_images.slice(1, 5).map((img: any, i: number) => (
              <div key={img.id} className="relative hidden sm:block">
                <Image
                  src={img.image_url}
                  alt={img.alt_text || `${boat.name} ${i + 2}`}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="page-container py-4 sm:py-6">
        <div className="grid lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            {/* Description */}
            {boat.description && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">About This Boat</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                    {boat.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Amenities */}
            {boat.boat_amenities && boat.boat_amenities.length > 0 && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Amenities & Facilities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {boat.boat_amenities.map((item: any) => {
                      const IconComponent = getAmenityIcon(item.amenity?.icon)
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col items-center gap-2 text-foreground/70 p-3 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all duration-200 group"
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                          </div>
                          <span className="text-xs text-center font-medium leading-tight">
                            {item.amenity?.name || 'Amenity'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trip Types */}
            {boat.trip_types && boat.trip_types.length > 0 && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Available Trips</h2>
                  <div className="space-y-4">
                    {boat.trip_types
                      .filter((tt: any) => tt.status === 'active')
                      .map((tripType: any) => (
                        <div
                          key={tripType.id}
                          className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                                {tripType.name}
                              </h3>
                              {tripType.description && (
                                <p className="text-sm text-muted-foreground mb-3">{tripType.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{tripType.duration_minutes} minutes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  <span>
                                    {tripType.min_passengers && `${tripType.min_passengers}-`}
                                    {tripType.max_passengers} passengers
                                  </span>
                                </div>
                              </div>

                              {/* Time Slots */}
                              {tripType.trip_time_slots && tripType.trip_time_slots.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {tripType.trip_time_slots
                                    .filter((s: any) => s.is_active)
                                    .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                                    .map((slot: any) => (
                                      <Badge key={slot.id} variant="secondary" className="text-xs">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                                        {slot.label && ` (${slot.label})`}
                                      </Badge>
                                    ))}
                                </div>
                              )}

                              {tripType.includes_text && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-foreground/70 mb-1">Includes:</p>
                                  <p className="text-xs text-muted-foreground">{tripType.includes_text}</p>
                                </div>
                              )}
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                              <div className="mb-2">
                                {tripType.pricing_model === 'per_person' ? (
                                  <>
                                    <p className="text-xl sm:text-2xl font-bold text-primary">
                                      ₹{Number(tripType.price_per_person).toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">per person</p>
                                    {tripType.child_price_per_person > 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        Child: ₹{Number(tripType.child_price_per_person).toLocaleString('en-IN')}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="text-xl sm:text-2xl font-bold text-primary">
                                      ₹{Number(tripType.price_per_boat).toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">per boat</p>
                                  </>
                                )}
                              </div>
                              <Button onClick={() => handleBookTrip(tripType.id)} className="w-full sm:w-auto">
                                Book Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            {boat.boat_reviews && boat.boat_reviews.length > 0 && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">Guest Reviews</h2>
                    {boat.avg_rating && (
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 fill-gold text-gold" />
                        <span className="text-lg font-bold">{boat.avg_rating}</span>
                        <span className="text-sm text-muted-foreground">({boat.review_count} reviews)</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {boat.boat_reviews
                      .filter((r: any) => r.status === 'approved')
                      .slice(0, 5)
                      .map((review: any) => (
                        <div key={review.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < (review.overall_rating || 0) / 2
                                      ? 'fill-gold text-gold'
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">{(review.overall_rating / 2).toFixed(1)}</span>
                          </div>
                          {review.title && (
                            <p className="font-semibold text-sm text-foreground mb-1">{review.title}</p>
                          )}
                          {review.comment && (
                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                          )}
                          {review.trip_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Trip date: {new Date(review.trip_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Safety & Policies */}
            {(boat.safety_info_text || boat.cancellation_policy_text) && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Safety & Policies</h2>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    {boat.safety_info_text && (
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-foreground mb-1 text-sm">Safety Information</h3>
                          <p className="text-muted-foreground text-sm">{boat.safety_info_text}</p>
                        </div>
                      </div>
                    )}
                    {boat.cancellation_policy_text && (
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-foreground mb-1 text-sm">Cancellation Policy</h3>
                          <p className="text-muted-foreground text-sm">{boat.cancellation_policy_text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Contact */}
              <Card>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <h3 className="font-bold text-foreground text-base">Contact</h3>
                  <Separator />
                  {boat.phone && (
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs mb-1">Phone</p>
                        <a href={`tel:${boat.phone}`} className="text-primary hover:underline font-medium text-sm">
                          {boat.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {boat.email && (
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs mb-1">Email</p>
                        <a href={`mailto:${boat.email}`} className="text-primary hover:underline font-medium break-all text-sm">
                          {boat.email}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location */}
              {(boat.latitude && boat.longitude) && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-foreground text-sm mb-2">Departure Point</h3>
                    <div className="aspect-video bg-muted rounded-lg mb-2 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {boat.departure_point && `${boat.departure_point}, `}
                      {boat.city}, {boat.state}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Why Book With Us */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <h3 className="font-bold text-foreground text-sm mb-3">Why Book With Us?</h3>
                  <ul className="space-y-2.5 text-sm text-foreground/70">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Best price guarantee</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Instant confirmation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Secure payment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Safety certified boats</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span>Free cancellation available</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
