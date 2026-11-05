'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Ship, Sailboat, Anchor, X } from '@/components/icons'

interface BoatFiltersProps {
  selectedBoatTypes: string[]
  minPrice?: string
  maxPrice?: string
  selectedDurations: string[]
}

export function BoatFilters({
  selectedBoatTypes,
  minPrice,
  maxPrice,
  selectedDurations,
}: BoatFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [priceRange, setPriceRange] = useState<[number, number]>([
    minPrice ? parseFloat(minPrice) : 0,
    maxPrice ? parseFloat(maxPrice) : 20000,
  ])

  const boatTypes = [
    { value: 'speedboat', label: 'Speedboat', icon: Ship },
    { value: 'houseboat', label: 'Houseboat', icon: Anchor },
    { value: 'sailboat', label: 'Sailboat', icon: Sailboat },
    { value: 'ferry', label: 'Ferry', icon: Ship },
    { value: 'yacht', label: 'Yacht', icon: Ship },
    { value: 'fishing_boat', label: 'Fishing Boat', icon: Anchor },
  ]

  const durationOptions = [
    { value: '30', label: 'Up to 30 min' },
    { value: '60', label: 'Up to 1 hour' },
    { value: '120', label: 'Up to 2 hours' },
    { value: '240', label: 'Up to 4 hours' },
    { value: '480', label: 'Half day+' },
  ]

  const updateFilters = (key: string, value: string | string[] | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === null || (Array.isArray(value) && value.length === 0)) {
      params.delete(key)
    } else {
      params.set(key, Array.isArray(value) ? value.join(',') : value)
    }

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleBoatTypeChange = (type: string, checked: boolean) => {
    const updated = checked
      ? [...selectedBoatTypes, type]
      : selectedBoatTypes.filter((t) => t !== type)
    updateFilters('boatType', updated.length > 0 ? updated : null)
  }

  const handleDurationChange = (duration: string, checked: boolean) => {
    const updated = checked
      ? [...selectedDurations, duration]
      : selectedDurations.filter((d) => d !== duration)
    updateFilters('duration', updated.length > 0 ? updated : null)
  }

  const handlePriceChange = (value: [number, number]) => {
    setPriceRange(value)
  }

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (priceRange[0] > 0) {
      params.set('minPrice', priceRange[0].toString())
    } else {
      params.delete('minPrice')
    }

    if (priceRange[1] < 20000) {
      params.set('maxPrice', priceRange[1].toString())
    } else {
      params.delete('maxPrice')
    }

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    const location = params.get('location')
    const date = params.get('date')
    const passengers = params.get('passengers')

    const newParams = new URLSearchParams()
    if (location) newParams.set('location', location)
    if (date) newParams.set('date', date)
    if (passengers) newParams.set('passengers', passengers)

    router.push(`?${newParams.toString()}`, { scroll: false })
    setPriceRange([0, 20000])
  }

  const hasActiveFilters =
    selectedBoatTypes.length > 0 ||
    selectedDurations.length > 0 ||
    minPrice ||
    maxPrice

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
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
            <Label className="text-base font-semibold">Price range</Label>
            <p className="text-sm text-muted-foreground mt-1">
              ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
            </p>
          </div>
          <Slider
            min={0}
            max={20000}
            step={500}
            value={priceRange}
            onValueChange={handlePriceChange}
            onValueCommit={applyPriceFilter}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Boat Type */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Boat Type</Label>
          <div className="space-y-2">
            {boatTypes.map((type) => {
              const Icon = type.icon
              return (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={selectedBoatTypes.includes(type.value)}
                    onCheckedChange={(checked) =>
                      handleBoatTypeChange(type.value, checked as boolean)
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

        {/* Trip Duration */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Trip Duration</Label>
          <div className="space-y-2">
            {durationOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`duration-${option.value}`}
                  checked={selectedDurations.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleDurationChange(option.value, checked as boolean)
                  }
                />
                <label
                  htmlFor={`duration-${option.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
