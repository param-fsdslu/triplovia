/**
 * Boat domain type definitions.
 *
 * Type hierarchy:
 * - Boat → BoatWithDetails (adds images, trip_types, amenities, reviews)
 * - TripType → TripTypeWithDetails (adds images, time_slots)
 * - BoatBooking → BoatBookingWithDetails (adds boat, trip_type, time_slot)
 *
 * Key concepts:
 * - PricingModel: 'per_person' charges per passenger; 'per_boat' is a flat rate.
 *   Child pricing (child_price_per_person) is optional — falls back to adult price.
 * - TripTimeSlot: Fixed time windows (e.g. "09:00–11:00") within a trip type.
 *   Availability is computed at runtime by counting booked passengers vs max_passengers.
 * - BoatBookingStatus: Unlike hotel bookings, boat bookings start as 'confirmed'
 *   immediately after creation (no pending state awaiting room assignment).
 */

// Boat domain types

import type { Amenity, PaymentStatus, ReviewStatus } from './common';

// Boat-specific Status & Enum Types
export type BoatType = 'motorboat' | 'sailboat' | 'speedboat' | 'houseboat' | 'kayak' | 'ferry';
export type BoatStatus = 'active' | 'inactive' | 'pending';
export type TripTypeStatus = 'available' | 'unavailable' | 'seasonal';
export type PricingModel = 'per_person' | 'per_boat';
export type BoatBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

// Boat Types
export interface Boat {
  id: string;
  name: string;
  slug: string;
  description?: string;
  boat_type: BoatType;
  capacity: number;
  owner_id?: string;
  address_line_1?: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  departure_point?: string;
  phone?: string;
  email?: string;
  cancellation_policy_text?: string;
  safety_info_text?: string;
  status: BoatStatus;
  created_at: string;
  updated_at: string;
}

export interface BoatWithDetails extends Boat {
  boat_images: BoatImage[];
  trip_types: TripTypeWithDetails[];
  boat_amenities: BoatAmenityWithDetails[];
  boat_reviews: BoatReview[];
  avg_rating?: number;
  review_count?: number;
  starting_price?: number;
}

export interface BoatImage {
  id: string;
  boat_id: string;
  image_url: string;
  storage_path?: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

export interface BoatAmenityWithDetails {
  id: string;
  boat_id: string;
  amenity: Amenity;
  is_free: boolean;
  additional_charge?: number;
}

// Trip Types
export interface TripType {
  id: string;
  boat_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  max_passengers: number;
  min_passengers: number;
  pricing_model: PricingModel;
  price_per_person?: number;
  price_per_boat?: number;
  child_price_per_person?: number;
  max_trips_per_day: number;
  includes_text?: string;
  what_to_bring_text?: string;
  free_cancellation_hours?: number;
  status: TripTypeStatus;
  created_at: string;
  updated_at: string;
}

export interface TripTypeWithDetails extends TripType {
  trip_type_images: TripTypeImage[];
  trip_time_slots: TripTimeSlot[];
}

export interface TripTypeImage {
  id: string;
  trip_type_id: string;
  image_url: string;
  storage_path?: string;
  alt_text?: string;
  display_order: number;
}

export interface TripTimeSlot {
  id: string;
  trip_type_id: string;
  start_time: string;
  end_time: string;
  label?: string;
  is_active: boolean;
  display_order: number;
}

/**
 * Full boat booking record. user_id is optional because guest bookings (no account)
 * are supported — guest contact info is stored directly on the booking row.
 * booking_status and payment_status are tracked separately (a booking can be
 * 'confirmed' but payment still 'pending' until Razorpay verifies).
 */
// Boat Booking Types
export interface BoatBooking {
  id: string;
  booking_reference: string;
  user_id?: string;
  boat_id: string;
  trip_type_id: string;
  time_slot_id: string;
  trip_date: string;
  num_adults: number;
  num_children: number;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string;
  pricing_model: PricingModel;
  price_per_person?: number;
  price_per_boat?: number;
  child_price_per_person?: number;
  subtotal: number;
  tax_amount: number;
  tax_percentage: number;
  service_fee: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  booking_status: BoatBookingStatus;
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_transaction_id?: string;
  special_requests?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  booking_source: string;
  created_at: string;
  updated_at: string;
}

export interface BoatBookingWithDetails extends BoatBooking {
  boat: Boat;
  trip_type: TripType;
  time_slot: TripTimeSlot;
}

export interface CreateBoatBookingData {
  userId?: string;
  boatId: string;
  tripTypeId: string;
  timeSlotId: string;
  tripDate: string;
  numAdults: number;
  numChildren: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  pricingModel: PricingModel;
  pricePerPerson?: number;
  pricePerBoat?: number;
  childPricePerPerson?: number;
  subtotal: number;
  taxAmount: number;
  serviceFee: number;
  totalAmount: number;
  specialRequests?: string;
}

// Boat Search Types
export interface BoatSearchParams {
  city?: string;
  tripDate?: string;
  passengers?: number;
  boatType?: BoatType[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'recommended' | 'price_low' | 'price_high' | 'rating';
  page?: number;
  limit?: number;
}

// Boat Review Types
export interface BoatReview {
  id: string;
  boat_id: string;
  boat_booking_id: string;
  user_id: string;
  overall_rating: number;
  safety_rating?: number;
  crew_rating?: number;
  experience_rating?: number;
  value_rating?: number;
  title?: string;
  comment?: string;
  trip_date?: string;
  image_urls?: string[];
  is_verified: boolean;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateBoatReviewDto {
  bookingId: string;
  boatId: string;
  overallRating: number;
  safetyRating?: number;
  crewRating?: number;
  experienceRating?: number;
  valueRating?: number;
  title?: string;
  comment?: string;
  imageUrls?: string[];
}
