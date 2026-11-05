/**
 * Nearby places & connectivity of a hotel (`hotels.nearby_places`, a JSON list): railway station,
 * bus stand, airport, beach… with their distance. Set in the admin hotel form; the 2 nearest show
 * on the search results card (search/HotelCard) and all of them on the hotel page
 * (hotel/NearbyPlaces). Server actions keep only clean rows (cleanNearbyPlaces).
 */

export const NEARBY_PLACE_TYPES = [
  { value: 'railway', label: 'Railway station' },
  { value: 'bus', label: 'Bus stand' },
  { value: 'airport', label: 'Airport' },
  { value: 'beach', label: 'Beach' },
  { value: 'temple', label: 'Temple' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'market', label: 'Market / town centre' },
  { value: 'attraction', label: 'Attraction' },
  { value: 'other', label: 'Other' },
] as const

export type NearbyPlaceType = (typeof NEARBY_PLACE_TYPES)[number]['value']

export interface NearbyPlace {
  type: NearbyPlaceType
  name: string
  /** Kilometres from the hotel */
  distance_km: number
}

/** Most places a hotel can list */
export const MAX_NEARBY_PLACES = 12

const TYPES = new Set<string>(NEARBY_PLACE_TYPES.map((t) => t.value))

export function nearbyPlaceTypeLabel(type: string) {
  return NEARBY_PLACE_TYPES.find((t) => t.value === type)?.label ?? 'Nearby'
}

/** Drops malformed rows, trims names, caps the list, nearest first (what gets stored) */
export function cleanNearbyPlaces(value: unknown): NearbyPlace[] {
  if (!Array.isArray(value)) return []
  return value
    .flatMap((row: any) => {
      const name = typeof row?.name === 'string' ? row.name.trim().slice(0, 80) : ''
      const distance = Number(row?.distance_km)
      if (!name || !Number.isFinite(distance) || distance < 0 || distance > 2000) return []
      const type = TYPES.has(row?.type) ? (row.type as NearbyPlaceType) : 'other'
      return [{ type, name, distance_km: Math.round(distance * 10) / 10 }]
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, MAX_NEARBY_PLACES)
}

/** The nearest `count` places of a stored list (or all of them), nearest first */
export function nearestPlaces(value: unknown, count?: number): NearbyPlace[] {
  const places = cleanNearbyPlaces(value)
  return count === undefined ? places : places.slice(0, count)
}

/** 0.4 → "400 m", 2.5 → "2.5 km", 12 → "12 km" */
export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`
}
