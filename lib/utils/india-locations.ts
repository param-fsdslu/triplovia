/**
 * India's states / districts / sub-districts (taluk, tehsil, mandal) for the hotel form's
 * location dropdowns. The data (lib/data/india-locations.json, ~100 KB) comes from the Local
 * Government Directory and is rebuilt with scripts/build-india-locations.mjs; it is loaded on
 * demand so it only reaches the admin form.
 */

export interface IndiaState {
  name: string
  /** Union territory */
  ut: boolean
  /** [district name, its sub-districts], alphabetical */
  districts: [string, string[]][]
}

let cache: Promise<IndiaState[]> | null = null

export function loadIndiaLocations(): Promise<IndiaState[]> {
  cache ??= import('@/lib/data/india-locations.json').then(
    (data) => (data.default ?? data).states as unknown as IndiaState[]
  )
  return cache
}

const same = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' }) === 0

export function findState(states: IndiaState[], name: string): IndiaState | undefined {
  return name ? states.find((s) => same(s.name, name)) : undefined
}

export function findDistrict(state: IndiaState | undefined, name: string): [string, string[]] | undefined {
  return state && name ? state.districts.find(([d]) => same(d, name)) : undefined
}

/** The district a city belongs to, when the city is one of the state's sub-districts in exactly one district */
export function districtOfCity(state: IndiaState | undefined, city: string): string | undefined {
  if (!state || !city) return undefined
  const matches = state.districts.filter(([, cities]) => cities.some((c) => same(c, city)))
  return matches.length === 1 ? matches[0][0] : undefined
}

export function isIndia(country: string): boolean {
  const c = country.trim().toLowerCase()
  return c === '' || c === 'india'
}

/** The district of a hotel: its own, else the one its city (a sub-district) belongs to */
export function hotelDistrict(states: IndiaState[], hotel: { district?: string | null; city?: string | null; state?: string | null }) {
  return hotel.district || districtOfCity(findState(states, hotel.state ?? ''), hotel.city ?? '') || null
}

/**
 * `.or()` filter for a hotel search by place: the text in the city, district, state or hotel name.
 * A district also matches hotels saved without one whose city is one of its sub-districts.
 */
export async function hotelLocationFilter(location: string): Promise<string | null> {
  const text = location.replace(/[,()"\\]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return null
  const like = `%${text}%`
  const parts = [`city.ilike.${like}`, `district.ilike.${like}`, `state.ilike.${like}`, `name.ilike.${like}`]

  const states = await loadIndiaLocations()
  const towns = states.flatMap((s) => s.districts).find(([name]) => same(name, text))?.[1] ?? []
  const quoted = towns.filter((t) => !t.includes('"')).map((t) => `"${t}"`)
  if (quoted.length) parts.push(`city.in.(${quoted.join(',')})`)
  return parts.join(',')
}
