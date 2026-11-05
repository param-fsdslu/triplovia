/**
 * Blog posts can be about a city (`blogs.city`, the same names as `hotels.city`). Readers who
 * pick that city in the search, or open /blog?city=…, see its posts. Names are compared without
 * case or extra spaces, so "honnavar " finds "Honnavar".
 */

/** Trimmed, single-spaced; null when empty */
export function cleanCity(city: string | null | undefined): string | null {
  const value = (city ?? '').trim().replace(/\s+/g, ' ')
  return value || null
}

/** The form two city names are compared in */
export function cityKey(city: string | null | undefined): string {
  return (cleanCity(city) ?? '').toLowerCase()
}

export function sameCity(a: string | null | undefined, b: string | null | undefined): boolean {
  const key = cityKey(a)
  return key !== '' && key === cityKey(b)
}

/** Distinct cities of some posts with how many each has, most posts first */
export function blogCities(posts: Array<{ city?: string | null }>): Array<{ name: string; count: number }> {
  const cities = new Map<string, { name: string; count: number }>()
  for (const post of posts) {
    const name = cleanCity(post.city)
    if (!name) continue
    const entry = cities.get(cityKey(name))
    if (entry) entry.count += 1
    else cities.set(cityKey(name), { name, count: 1 })
  }
  return [...cities.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
