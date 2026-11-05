'use client';

/**
 * TanStack Query hooks for hotel data.
 *
 * All hooks hit public API routes under /api/hotels/ and are safe to use in
 * client components. staleTime values are tuned per use case:
 * - Search results: 5 min (results change with availability)
 * - Featured hotels: 10 min (rarely changes)
 * - Destination search index: 15 min (very stable)
 * - Hotel detail: default (fresh on every mount)
 *
 * The baseUrl pattern (window.location.origin with SSR fallback) ensures these
 * fetch calls work in both browser and server render contexts.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DestinationIndex, HotelSearchParams, HotelWithDetails } from '@/lib/types';

/**
 * Calls /api/hotels/search with the given search params.
 * Returns the raw data array from the paginated API response.
 */
async function fetchHotels(params: HotelSearchParams) {
  const queryParams = new URLSearchParams();
  if (params.city) queryParams.set('city', params.city);
  if (params.checkIn) queryParams.set('checkIn', params.checkIn.toString());
  if (params.checkOut) queryParams.set('checkOut', params.checkOut.toString());
  queryParams.set('adults', params.adults.toString());
  queryParams.set('children', params.children.toString());
  queryParams.set('rooms', params.rooms.toString());

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}/api/hotels/search?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch hotels');
  const data = await response.json();
  return data.data;
}

/**
 * Searches hotels using the provided filters. Results are cached for 5 minutes.
 * Used on the /hotels results page alongside HotelFilters for real-time filtering.
 */
export function useHotels(params: HotelSearchParams) {
  return useQuery({
    queryKey: ['hotels', params],
    queryFn: () => fetchHotels(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Calls /api/hotels/featured to get the top N hotels by location_rating.
 */
async function fetchFeaturedHotels(limit: number = 6, city?: string | null): Promise<HotelWithDetails[]> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({ limit: String(limit) });
  if (city) params.set('city', city);
  const response = await fetch(`${baseUrl}/api/hotels/featured?${params}`);
  if (!response.ok) throw new Error('Failed to fetch featured hotels');
  const data = await response.json();
  return data.data;
}

/**
 * Fetches featured hotels for the homepage. Cached for 10 minutes —
 * long staleTime is intentional since featured content changes infrequently.
 */
export function useFeaturedHotels(limit: number = 6, city?: string | null) {
  return useQuery({
    queryKey: ['hotels', 'featured', limit, city?.toLowerCase() ?? null],
    queryFn: () => fetchFeaturedHotels(limit, city),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

async function fetchSimilarHotels(hotelId: string, limit: number): Promise<HotelWithDetails[]> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}/api/hotels/similar?hotelId=${encodeURIComponent(hotelId)}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch similar hotels');
  const data = await response.json();
  return data.data;
}

/**
 * Other stays in the hotel's city, for its page. Cached for 10 minutes, like featured stays.
 */
export function useSimilarHotels(hotelId: string | undefined, limit: number = 2) {
  return useQuery({
    queryKey: ['hotels', 'similar', hotelId, limit],
    queryFn: () => fetchSimilarHotels(hotelId!, limit),
    enabled: !!hotelId,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch function for the destination search index
 */
async function fetchDestinationIndex(): Promise<DestinationIndex> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}/api/hotels/destinations`);
  if (!response.ok) throw new Error('Failed to fetch destinations');
  const data = await response.json();
  return data.data;
}

/**
 * Places with stays (city / district / state, with counts) and the stays themselves, for the
 * destination search in HotelSearchBox. Cached for 15 minutes.
 */
export function useDestinationIndex() {
  return useQuery({
    queryKey: ['destinations', 'index'],
    queryFn: fetchDestinationIndex,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Fetch function for hotel by ID
 */
async function fetchHotelById(id: string): Promise<HotelWithDetails | null> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}/api/hotels/${id}`);
  if (!response.ok) throw new Error('Failed to fetch hotel');
  const data = await response.json();
  return data.data;
}

/**
 * Hook to get hotel by ID
 */
export function useHotel(id: string) {
  return useQuery({
    queryKey: ['hotel', id],
    queryFn: () => fetchHotelById(id),
    enabled: !!id,
  });
}

/**
 * Fetch function for hotel by slug
 */
async function fetchHotelBySlug(
  slug: string,
  checkIn?: string,
  checkOut?: string
): Promise<HotelWithDetails | null> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const queryParams = new URLSearchParams();
  if (checkIn) queryParams.set('checkIn', checkIn);
  if (checkOut) queryParams.set('checkOut', checkOut);
  const qs = queryParams.toString();
  const response = await fetch(`${baseUrl}/api/hotels/slug/${slug}${qs ? `?${qs}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch hotel');
  const data = await response.json();
  return data.data;
}

/**
 * Fetches a hotel's full detail data by URL slug. Query is disabled until slug is truthy.
 * Used by HotelDetailsClient to hydrate the hotel detail page on the client.
 * staleTime: 0 so reviews and availability are always fresh on every mount.
 * Pass checkIn/checkOut (from the search store) so each room type's
 * num_available_rooms reflects real availability, not the raw inventory count.
 */
export function useHotelBySlug(slug: string, checkIn?: string, checkOut?: string) {
  return useQuery({
    queryKey: ['hotel', 'slug', slug, checkIn, checkOut],
    queryFn: () => fetchHotelBySlug(slug, checkIn, checkOut),
    enabled: !!slug,
    staleTime: 0,
    // Changing dates on the page refetches prices; keep showing the hotel meanwhile
    placeholderData: keepPreviousData,
  });
}
