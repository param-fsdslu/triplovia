'use client';

/**
 * TanStack Query hooks for boat data.
 *
 * Mirrors the hotel hooks pattern but for the boats domain.
 * Key difference: useAvailableSlots uses a 2-minute staleTime for near-real-time
 * seat availability — much shorter than hotel hooks because boat slots can fill up
 * quickly and stale data could mislead guests about capacity.
 *
 * The spots_remaining field in slot results is computed server-side by
 * BoatService.getAvailableSlots (not from a DB column).
 */
import { useQuery } from '@tanstack/react-query';
import type { BoatWithDetails, TripTimeSlot } from '@/lib/types';

/** Calls /api/boats/featured to get the top N boats by creation date. */
async function fetchFeaturedBoats(limit: number = 6): Promise<BoatWithDetails[]> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}/api/boats/featured?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch featured boats');
  const data = await response.json();
  return data.data;
}

/**
 * Fetches featured boats for the homepage. Cached for 10 minutes.
 * Only rendered when the `boats` feature flag is enabled.
 */
export function useFeaturedBoats(limit: number = 6) {
  return useQuery({
    queryKey: ['boats', 'featured', limit],
    queryFn: () => fetchFeaturedBoats(limit),
    staleTime: 1000 * 60 * 10,
  });
}

/** Calls /api/boats/slug/[slug] to get a boat's full detail data. */
async function fetchBoatBySlug(slug: string): Promise<BoatWithDetails | null> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}/api/boats/slug/${slug}`);
  if (!response.ok) throw new Error('Failed to fetch boat');
  const data = await response.json();
  return data.data;
}

/**
 * Fetches a boat's full detail data by slug. Query is disabled until slug is truthy.
 * Used by the boat detail page client component.
 */
export function useBoatBySlug(slug: string) {
  return useQuery({
    queryKey: ['boat', 'slug', slug],
    queryFn: () => fetchBoatBySlug(slug),
    enabled: !!slug,
  });
}

/**
 * Calls /api/boats/availability to get time slots with real-time spots_remaining.
 * spots_remaining = max_passengers minus booked non-cancelled passengers for that date.
 */
async function fetchAvailableSlots(
  tripTypeId: string,
  date: string
): Promise<(TripTimeSlot & { spots_remaining: number })[]> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(
    `${baseUrl}/api/boats/availability?tripTypeId=${tripTypeId}&date=${date}`
  );
  if (!response.ok) throw new Error('Failed to fetch available slots');
  const data = await response.json();
  return data.data;
}

/**
 * Fetches available time slots for a trip type on a given date.
 * 2-minute staleTime provides near-real-time availability without excessive requests.
 * Query is disabled until both tripTypeId and date are truthy.
 */
export function useAvailableSlots(tripTypeId: string, date: string) {
  return useQuery({
    queryKey: ['boats', 'availability', tripTypeId, date],
    queryFn: () => fetchAvailableSlots(tripTypeId, date),
    enabled: !!tripTypeId && !!date,
    staleTime: 1000 * 60 * 2,
  });
}
