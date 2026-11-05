'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  Hotel,
  Building2,
  Home,
  Wifi,
  Car,
  Dumbbell,
  UtensilsCrossed,
  Waves,
  Wind,
  X,
} from '@/components/icons'
import { getFilterAmenities } from '@/lib/actions/session'

interface HotelFiltersProps {
  selectedStarRating: string[]
  selectedPropertyTypes: string[]
  minPrice?: string
  maxPrice?: string
  selectedAmenities: string[]
}

export function HotelFilters({
  selectedStarRating,
  selectedPropertyTypes,
  minPrice,
  maxPrice,
  selectedAmenities,
}: HotelFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [priceRange, setPriceRange] = useState<[number, number]>([
    minPrice ? parseFloat(minPrice) : 0,
    maxPrice ? parseFloat(maxPrice) : 50000,
  ])
  const [amenities, setAmenities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch amenities from database
  useEffect(() => {
    async function fetchAmenities() {
      const data = await getFilterAmenities(10)
      setAmenities(data)
      setLoading(false)
    }

    fetchAmenities()
  }, [])

  const propertyTypes = [
    { value: 'hotel', label: 'Hotels', icon: Hotel },
    { value: 'resort', label: 'Resorts', icon: Building2 },
    { value: 'apartment', label: 'Apartments', icon: Home },
    { value: 'villa', label: 'Villas', icon: Home },
    { value: 'guesthouse', label: 'Guesthouses', icon: Home },
    { value: 'homestay', label: 'Homestays', icon: Home },
  ]

  const starRatings = [5, 4, 3, 2, 1]

  const updateFilters = (key: string, value: string | string[] | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === null || (Array.isArray(value) && value.length === 0)) {
      params.delete(key)
    } else {
      params.set(key, Array.isArray(value) ? value.join(',') : value)
    }

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleStarRatingChange = (rating: string, checked: boolean) => {
    const current = selectedStarRating
    const updated = checked ? [...current, rating] : current.filter((r) => r !== rating)
    updateFilters('starRating', updated.length > 0 ? updated : null)
  }

  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    const current = selectedPropertyTypes
    const updated = checked ? [...current, type] : current.filter((t) => t !== type)
    updateFilters('propertyType', updated.length > 0 ? updated : null)
  }

  const handleAmenityChange = (amenityId: string, checked: boolean) => {
    const current = selectedAmenities
    const updated = checked ? [...current, amenityId] : current.filter((a) => a !== amenityId)
    updateFilters('amenities', updated.length > 0 ? updated : null)
  }

  const handlePriceChange = (value: [number, number]) => {
    setPriceRange(value)
  }

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString())

    // Update both min and max price together
    if (priceRange[0] > 0) {
      params.set('minPrice', priceRange[0].toString())
    } else {
      params.delete('minPrice')
    }

    if (priceRange[1] < 50000) {
      params.set('maxPrice', priceRange[1].toString())
    } else {
      params.delete('maxPrice')
    }

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    // Keep search-related params
    const location = params.get('location')
    const checkIn = params.get('checkIn')
    const checkOut = params.get('checkOut')
    const adults = params.get('adults')
    const children = params.get('children')
    const rooms = params.get('rooms')

    const newParams = new URLSearchParams()
    if (location) newParams.set('location', location)
    if (checkIn) newParams.set('checkIn', checkIn)
    if (checkOut) newParams.set('checkOut', checkOut)
    if (adults) newParams.set('adults', adults)
    if (children) newParams.set('children', children)
    if (rooms) newParams.set('rooms', rooms)

    router.push(`?${newParams.toString()}`, { scroll: false })
    setPriceRange([0, 50000])
  }

  const hasActiveFilters =
    selectedStarRating.length > 0 ||
    selectedPropertyTypes.length > 0 ||
    selectedAmenities.length > 0 ||
    minPrice ||
    maxPrice

  return (
    <Card className="rounded-2xl shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
        <CardDescription>Refine your search results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Price per night</Label>
            <p className="text-sm text-muted-foreground mt-1">
              ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
            </p>
          </div>
          <Slider
            min={0}
            max={50000}
            step={500}
            value={priceRange}
            onValueChange={handlePriceChange}
            onValueCommit={applyPriceFilter}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Star Rating */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Star rating</Label>
          <div className="space-y-2">
            {starRatings.map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <Checkbox
                  id={`star-${rating}`}
                  checked={selectedStarRating.includes(rating.toString())}
                  onCheckedChange={(checked) =>
                    handleStarRatingChange(rating.toString(), checked as boolean)
                  }
                />
                <label
                  htmlFor={`star-${rating}`}
                  className="flex items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  <div className="flex items-center gap-1">
                    {Array.from({ length: rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                    ))}
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Property Type */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Property type</Label>
          <div className="space-y-2">
            {propertyTypes.map((type) => {
              const Icon = type.icon
              return (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={selectedPropertyTypes.includes(type.value)}
                    onCheckedChange={(checked) =>
                      handlePropertyTypeChange(type.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`type-${type.value}`}
                    className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {type.label}
                  </label>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Amenities */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Popular amenities</Label>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading amenities...</p>
          ) : (
            <div className="space-y-2">
              {amenities.map((amenity) => (
                <div key={amenity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity.id}`}
                    checked={selectedAmenities.includes(amenity.id)}
                    onCheckedChange={(checked) =>
                      handleAmenityChange(amenity.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`amenity-${amenity.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {amenity.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
