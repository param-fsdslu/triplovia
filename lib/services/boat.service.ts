/**
 * Boat data access service — search, retrieval, trip type management, and slot availability.
 *
 * Mirrors HotelService structure with boat-specific logic:
 * - Price can be per_person or per_boat (see PricingModel in types/boat.ts)
 * - Price filtering is done client-side after the DB query (unlike hotels)
 * - spots_remaining is computed in getAvailableSlots by counting non-cancelled bookings
 *
 * All methods return null / empty arrays on error to prevent page crashes.
 */
import { createClient } from '@/lib/db/server';
import type {
  BoatWithDetails,
  BoatSearchParams,
  TripTypeWithDetails,
  TripTimeSlot,
  PaginatedResponse,
} from '@/lib/types';
import { serverLog } from '@/lib/utils/server-log'

export class BoatService {
  /**
   * Searches active boats with optional city and boat_type filters.
   * Price filtering is applied client-side after fetching (unlike hotel DB-level filtering).
   * starting_price accounts for PricingModel: picks price_per_person or price_per_boat.
   */
  static async searchBoats(
    params: BoatSearchParams
  ): Promise<PaginatedResponse<BoatWithDetails>> {
    const db = await createClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let query = db
      .from('boats')
      .select(
        `
        id,
        name,
        slug,
        description,
        boat_type,
        capacity,
        city,
        state,
        country,
        departure_point,
        status,
        created_at,
        boat_images(image_url, alt_text, is_primary, display_order),
        trip_types(id, name, pricing_model, price_per_person, price_per_boat, duration_minutes, max_passengers, status)
      `,
        { count: 'exact' }
      )
      .eq('status', 'active');

    if (params.city) {
      query = query.ilike('city', `%${params.city}%`);
    }

    if (params.boatType && params.boatType.length > 0) {
      query = query.in('boat_type', params.boatType);
    }

    switch (params.sortBy) {
      case 'price_low':
        query = query.order('created_at', { ascending: true });
        break;
      case 'price_high':
        query = query.order('created_at', { ascending: false });
        break;
      case 'rating':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      serverLog.error('Error searching boats:', error);
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const boats: BoatWithDetails[] = (data || []).map((boat: any) => {
      const tripTypes = boat.trip_types || [];
      const prices = tripTypes
        .filter((tt: any) => tt.status === 'available')
        .map((tt: any) =>
          tt.pricing_model === 'per_person'
            ? tt.price_per_person
            : tt.price_per_boat
        )
        .filter(Boolean);

      return {
        ...boat,
        boat_images: boat.boat_images || [],
        trip_types: tripTypes,
        boat_amenities: [],
        boat_reviews: [],
        starting_price: prices.length > 0 ? Math.min(...prices) : undefined,
      };
    });

    // Client-side price filtering
    let filteredBoats = boats;
    if (params.minPrice !== undefined) {
      filteredBoats = filteredBoats.filter(
        (b) => b.starting_price && b.starting_price >= params.minPrice!
      );
    }
    if (params.maxPrice !== undefined) {
      filteredBoats = filteredBoats.filter(
        (b) => b.starting_price && b.starting_price <= params.maxPrice!
      );
    }

    return {
      data: filteredBoats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Fetches a boat by ID with full relations: images, trip types (with images and time slots),
   * amenities (with categories), and reviews. Computes avg_rating and starting_price.
   */
  static async getBoatById(id: string): Promise<BoatWithDetails | null> {
    const db = await createClient();

    const { data, error } = await db
      .from('boats')
      .select(
        `
        *,
        boat_images(id, image_url, alt_text, is_primary, display_order),
        trip_types(
          *,
          trip_type_images(id, image_url, alt_text, display_order),
          trip_time_slots(id, trip_type_id, start_time, end_time, label, is_active, display_order)
        ),
        boat_amenities(
          id,
          is_free,
          additional_charge,
          amenity:amenities(id, name, icon, category:amenity_categories(id, name))
        ),
        boat_reviews(*)
      `
      )
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error) {
      serverLog.error('Error getting boat by ID:', error);
      if (error.code === 'PGRST116') return null;
      return null;
    }

    const reviews = data.boat_reviews || [];
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + (r.overall_rating || 0), 0) /
          reviews.length /
          2
        : undefined;

    const tripTypes = data.trip_types || [];
    const prices = tripTypes
      .filter((tt: any) => tt.status === 'available')
      .map((tt: any) =>
        tt.pricing_model === 'per_person' ? tt.price_per_person : tt.price_per_boat
      )
      .filter(Boolean);

    return {
      ...data,
      avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : undefined,
      review_count: reviews.length,
      starting_price: prices.length > 0 ? Math.min(...prices) : undefined,
    };
  }

  /**
   * Same as getBoatById but looked up by URL slug.
   * Used by the boat detail page and the useBoatBySlug TanStack Query hook.
   */
  static async getBoatBySlug(slug: string): Promise<BoatWithDetails | null> {
    const db = await createClient();

    const { data, error } = await db
      .from('boats')
      .select(
        `
        *,
        boat_images(id, image_url, alt_text, is_primary, display_order),
        trip_types(
          *,
          trip_type_images(id, image_url, alt_text, display_order),
          trip_time_slots(id, trip_type_id, start_time, end_time, label, is_active, display_order)
        ),
        boat_amenities(
          id,
          is_free,
          additional_charge,
          amenity:amenities(id, name, icon, category:amenity_categories(id, name))
        ),
        boat_reviews(*)
      `
      )
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error) {
      serverLog.error('Error getting boat by slug:', error);
      if (error.code === 'PGRST116') return null;
      return null;
    }

    const reviews = data.boat_reviews || [];
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + (r.overall_rating || 0), 0) /
          reviews.length /
          2
        : undefined;

    const tripTypes = data.trip_types || [];
    const prices = tripTypes
      .filter((tt: any) => tt.status === 'available')
      .map((tt: any) =>
        tt.pricing_model === 'per_person' ? tt.price_per_person : tt.price_per_boat
      )
      .filter(Boolean);

    return {
      ...data,
      avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : undefined,
      review_count: reviews.length,
      starting_price: prices.length > 0 ? Math.min(...prices) : undefined,
    };
  }

  /**
   * Returns all available trip types for a boat, with their images and time slots.
   * Ordered by creation date (oldest first) to maintain consistent display order.
   */
  static async getTripTypes(boatId: string): Promise<TripTypeWithDetails[]> {
    const db = await createClient();

    const { data, error } = await db
      .from('trip_types')
      .select(
        `
        *,
        trip_type_images(id, image_url, alt_text, display_order),
        trip_time_slots(id, trip_type_id, start_time, end_time, label, is_active, display_order)
      `
      )
      .eq('boat_id', boatId)
      .eq('status', 'available')
      .order('created_at', { ascending: true });

    if (error) {
      serverLog.error('Error getting trip types:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Checks if a specific time slot has remaining passenger capacity for a given date.
   * Counts passengers (adults + children) across all non-cancelled bookings for that slot.
   */
  static async checkAvailability(
    tripTypeId: string,
    timeSlotId: string,
    tripDate: string
  ): Promise<{ available: boolean; spots_remaining: number }> {
    const db = await createClient();

    // Get trip type max passengers
    const { data: tripType, error: ttError } = await db
      .from('trip_types')
      .select('max_passengers')
      .eq('id', tripTypeId)
      .single();

    if (ttError || !tripType) {
      return { available: false, spots_remaining: 0 };
    }

    // Count existing non-cancelled bookings for this slot
    const { data: bookings, error: bError } = await db
      .from('boat_bookings')
      .select('num_adults, num_children')
      .eq('trip_type_id', tripTypeId)
      .eq('time_slot_id', timeSlotId)
      .eq('trip_date', tripDate)
      .neq('booking_status', 'cancelled');

    if (bError) {
      serverLog.error('Error checking availability:', bError);
      return { available: false, spots_remaining: 0 };
    }

    const bookedPassengers = (bookings || []).reduce(
      (sum, b) => sum + (b.num_adults || 0) + (b.num_children || 0),
      0
    );

    const spotsRemaining = tripType.max_passengers - bookedPassengers;

    return {
      available: spotsRemaining > 0,
      spots_remaining: Math.max(0, spotsRemaining),
    };
  }

  /**
   * Returns all active time slots for a trip type, enriched with spots_remaining.
   * spots_remaining = max_passengers minus total passengers in non-cancelled bookings for that date.
   * Used by the useAvailableSlots hook (2-minute stale time for near-real-time availability).
   */
  static async getAvailableSlots(
    tripTypeId: string,
    tripDate: string
  ): Promise<(TripTimeSlot & { spots_remaining: number })[]> {
    const db = await createClient();

    // Get trip type details
    const { data: tripType, error: ttError } = await db
      .from('trip_types')
      .select('max_passengers')
      .eq('id', tripTypeId)
      .single();

    if (ttError || !tripType) {
      return [];
    }

    // Get all active time slots
    const { data: slots, error: sError } = await db
      .from('trip_time_slots')
      .select('*')
      .eq('trip_type_id', tripTypeId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (sError || !slots) {
      return [];
    }

    // Get all non-cancelled bookings for this trip type on this date
    const { data: bookings } = await db
      .from('boat_bookings')
      .select('time_slot_id, num_adults, num_children')
      .eq('trip_type_id', tripTypeId)
      .eq('trip_date', tripDate)
      .neq('booking_status', 'cancelled');

    // Calculate spots remaining per slot
    const bookingsBySlot = (bookings || []).reduce((acc: Record<string, number>, b) => {
      acc[b.time_slot_id] = (acc[b.time_slot_id] || 0) + (b.num_adults || 0) + (b.num_children || 0);
      return acc;
    }, {});

    return slots.map((slot) => ({
      ...slot,
      spots_remaining: Math.max(
        0,
        tripType.max_passengers - (bookingsBySlot[slot.id] || 0)
      ),
    }));
  }

  /**
   * Returns the top N active boats ordered by creation date.
   * Used on the homepage featured section (gated by the `boats` feature flag).
   */
  static async getFeaturedBoats(limit: number = 6): Promise<BoatWithDetails[]> {
    const db = await createClient();

    const { data, error } = await db
      .from('boats')
      .select(
        `
        id,
        name,
        slug,
        description,
        boat_type,
        capacity,
        city,
        state,
        country,
        departure_point,
        status,
        created_at,
        boat_images(image_url, alt_text, is_primary, display_order),
        trip_types(id, name, pricing_model, price_per_person, price_per_boat, duration_minutes, status),
        boat_reviews(overall_rating)
      `
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      serverLog.error('Error fetching featured boats:', error);
      return [];
    }

    return (data || []).map((boat: any) => {
      const tripTypes = boat.trip_types || [];
      const reviews = boat.boat_reviews || [];
      const prices = tripTypes
        .filter((tt: any) => tt.status === 'available')
        .map((tt: any) =>
          tt.pricing_model === 'per_person' ? tt.price_per_person : tt.price_per_boat
        )
        .filter(Boolean);

      return {
        ...boat,
        boat_images: boat.boat_images || [],
        trip_types: tripTypes,
        boat_amenities: [],
        boat_reviews: reviews,
        avg_rating: reviews.length
          ? reviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) /
            reviews.length /
            2
          : undefined,
        review_count: reviews.length,
        starting_price: prices.length > 0 ? Math.min(...prices) : undefined,
      };
    });
  }
}
