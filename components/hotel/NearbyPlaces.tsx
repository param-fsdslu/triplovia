/**
 * A hotel's nearby places & connectivity (lib/utils/nearby-places.ts): an icon per type, the name and
 * the distance, nearest first. `compact` is the search results card's version: one line each, in bold (no chips, by request).
 */
import type { ComponentType } from 'react'
import { Bus, Camera, Hospital, MapPin, Plane, Store, Temple, Train, Waves } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatDistance, nearbyPlaceTypeLabel, nearestPlaces, type NearbyPlaceType } from '@/lib/utils/nearby-places'

const ICONS: Record<NearbyPlaceType, ComponentType<{ className?: string }>> = {
  railway: Train,
  bus: Bus,
  airport: Plane,
  beach: Waves,
  temple: Temple,
  hospital: Hospital,
  market: Store,
  attraction: Camera,
  other: MapPin,
}

interface NearbyPlacesProps {
  /** `hotels.nearby_places` as stored */
  places: unknown
  /** Show only the nearest few */
  limit?: number
  /** One bold line per place, for the search results card */
  compact?: boolean
  className?: string
}

export function NearbyPlaces({ places, limit, compact = false, className }: NearbyPlacesProps) {
  const list = nearestPlaces(places, limit)
  if (list.length === 0) return null

  if (compact) {
    return (
      <ul className={cn('space-y-1', className)} aria-label="Nearby">
        {list.map((place) => {
          const Icon = ICONS[place.type]
          return (
            <li key={`${place.type}-${place.name}`} className="flex min-w-0 items-center gap-1.5 text-[13px] text-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-semibold">{place.name}</span>
              <span className="shrink-0 font-bold text-primary">{formatDistance(place.distance_km)}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  // Plain rows with hairlines between them, two columns from sm (no boxes, by request)
  return (
    <ul className={cn('grid gap-x-10 sm:grid-cols-2', className)}>
      {list.map((place) => {
        const Icon = ICONS[place.type]
        return (
          <li
            key={`${place.type}-${place.name}`}
            className="flex items-center gap-3 border-b border-border py-3"
          >
            <Icon className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{place.name}</span>
              <span className="block text-xs text-muted-foreground">{nearbyPlaceTypeLabel(place.type)}</span>
            </span>
            <span className="shrink-0 text-sm font-bold text-primary">{formatDistance(place.distance_km)}</span>
          </li>
        )
      })}
    </ul>
  )
}
