import type { BookingCancellationPolicy, HotelCancellationPolicy } from '@/lib/config/hotel-cancellation-policy';
/**
 * Hotel domain type definitions.
 *
 * Type hierarchy:
 * - Hotel → HotelWithDetails (adds images, room_types, amenities, reviews, nearby)
 * - RoomType → RoomTypeWithDetails (adds images, amenities)
 * - Booking → BookingWithDetails (adds hotel, room_type, guests, payments)
 *
 * Computed fields (not stored in DB, derived by service layer):
 * - Hotel.starting_price — minimum room base_price across room_types
 * - Hotel.avg_rating — average of Review.overall_rating (0-10 scale)
 * - Hotel.review_count — count of joined reviews
 *
 * Rating scale: Reviews use 0-10 internally (UI shows 1-5 stars, stored as × 2).
 * status field drives visibility: only 'active' hotels appear in search results.
 */

// Hotel domain types

import type { Amenity, PaymentStatus, ReviewStatus } from './common';

// Hotel-specific Status & Enum Types
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type HotelStatus = 'active' | 'inactive' | 'pending' | 'archived';
export type PropertyType = 'hotel' | 'apartment' | 'resort' | 'villa' | 'guesthouse' | 'hostel' | 'motel' | 'homestay';
/**
 * Inventory source for a hotel's room count management.
 * - 'manual': Admin sets num_available_rooms directly in the admin panel.
 * - 'api': Room counts are auto-synced from a channel manager / external API.
 *          Manual blocks can still be applied on top of API-sourced counts.
 */
export type InventorySource = 'manual' | 'api';

// Search and Filter Types
export interface HotelSearchParams {
  location?: string;
  city?: string;
  checkIn?: string | Date;
  checkOut?: string | Date;
  adults: number;
  children: number;
  childrenAges?: number[];
  rooms: number;
  minPrice?: number;
  maxPrice?: number;
  priceMin?: number;
  priceMax?: number;
  starRating?: number[];
  propertyType?: PropertyType[];
  amenities?: string[];
  sortBy?: 'recommended' | 'price_low' | 'price_high' | 'rating' | 'distance';
  page?: number;
  limit?: number;
}

// Hotel Types
export interface Hotel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  star_rating?: number;
  property_type: PropertyType;
  chain_brand?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  maps_embed_url?: string;
  /** Nearby places & connectivity, nearest first (lib/utils/nearby-places.ts) */
  nearby_places?: Array<{ type: string; name: string; distance_km: number }>;
  location_rating?: number;
  phone?: string;
  email?: string;
  website?: string;
  check_in_from_time?: string;
  check_in_to_time?: string;
  check_out_time?: string;
  cancellation_policy?: HotelCancellationPolicy;
  cancellation_policy_text?: string;
  child_policy_text?: string;
  pet_policy_text?: string;
  smoking_allowed?: boolean;
  parking_available?: boolean;
  parking_type?: string;
  parking_free?: boolean;
  starting_price?: number;
  avg_rating?: number;
  total_reviews?: number;
  review_count?: number;
  status: HotelStatus;
  /** Controls how room inventory counts are managed. Default: 'manual'. */
  inventory_source?: InventorySource;
  created_at: string;
  updated_at: string;
}

export interface HotelWithDetails extends Hotel {
  hotel_images: HotelImage[];
  hotel_panoramas?: HotelPanorama[];
  room_types: RoomType[];
  hotel_amenities: HotelAmenity[];
  reviews: Review[];
  nearby_attractions: import('./common').NearbyAttraction[];
}

export interface HotelImage {
  id: string;
  hotel_id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

/** A place the destination search suggests: a city with active stays */
export interface DestinationPlace {
  kind: 'city';
  name: string;
  /** "District, State", e.g. "Uttara Kannada, Karnataka" */
  region: string;
  stays: number;
}

/** What the destination search can suggest (GET /api/hotels/destinations) */
export interface DestinationIndex {
  places: DestinationPlace[];
  stays: { name: string; slug: string; region: string }[];
}

/** A 360° photo (equirectangular, 2:1) shown in the hotel page's viewer */
export interface HotelPanorama {
  id: string;
  hotel_id: string;
  image_url: string;
  title: string | null;
  display_order: number;
}

/** A 360° photo of a room type, opened from its room card on the hotel page */
export interface RoomTypePanorama {
  id: string;
  room_type_id: string;
  image_url: string;
  title: string | null;
  display_order: number;
}

export interface HotelAmenity {
  id: string;
  hotel_id: string;
  amenity: Amenity;
  is_free: boolean;
  additional_charge?: number;
}

// Room Types
export interface RoomType {
  id: string;
  hotel_id: string;
  name: string;
  description?: string;
  size_sqm?: number;
  max_occupancy: number;
  max_adults: number;
  max_children: number;
  /** Guests included in base_price before extra_bed_price applies per additional guest. */
  standard_occupancy: number;
  /** Per-night charge for each guest beyond standard_occupancy, up to max_occupancy. */
  extra_bed_price: number;
  /** Per-night charge for every child aged 6–11; unset = extra_bed_price, 0 = free. */
  child_price?: number | null;
  bed_configuration?: string;
  base_price: number;
  num_available_rooms: number;
  free_cancellation_until?: string;
  prepayment_required: boolean;
  credit_card_required: boolean;
  status: 'available' | 'unavailable';
  created_at: string;
  updated_at: string;
}

export interface RoomTypeWithDetails extends RoomType {
  room_type_images: RoomTypeImage[];
  room_type_panoramas?: RoomTypePanorama[];
  room_type_amenities: RoomTypeAmenity[];
  current_price?: number;
}

/**
 * A weekend / festival / long-weekend / custom date-range price rule for a room type.
 * weekend rows have day_of_week set (0=Sun..6=Sat) and a wide/open-ended valid range;
 * festival/long_weekend/custom rows have day_of_week null and an explicit date range.
 * See lib/utils.ts getRoomPriceForNight() for resolution precedence.
 */
export interface PriceRule {
  id: string;
  room_type_id: string;
  valid_from: string;
  valid_to: string;
  price_per_night: number;
  day_of_week: number | null;
  is_active: boolean;
  label: string | null;
  price_type: 'weekend' | 'festival' | 'long_weekend' | 'custom';
  created_at: string;
}

export interface RoomTypeImage {
  id: string;
  room_type_id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
}

export interface RoomTypeAmenity {
  id: string;
  room_type_id: string;
  amenity: Amenity;
}

export interface Room {
  id: string;
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  floor?: number;
  status: import('./common').RoomStatus;
}

/**
 * Full booking record as returned from the bookings table with joins.
 * booking_status drives UI flow (what actions are available to the user).
 * payment_status drives refund eligibility and receipt display.
 * status and booking_status may overlap — prefer booking_status for domain logic.
 */
// Booking Types
export interface Booking {
  cancellation_policy?: BookingCancellationPolicy;
  cancellation_check_in_time?: string;
  id: string;
  booking_reference: string;
  user_id: string;
  hotel_id: string;
  room_type_id: string;
  room_id?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  num_adults: number;
  num_children: number;
  children_ages?: number[];
  num_rooms: number;
  num_nights?: number;
  total_nights: number;
  price_per_night: number;
  subtotal: number;
  tax_amount: number;
  tax_percentage?: number;
  service_charge: number;
  service_fee?: number;
  discount_amount: number;
  meal_plan_total: number;
  extra_bed_charge?: number;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  booking_status?: string;
  payment_status?: string;
  special_requests?: string;
  /** Travelling with pets (search box / review page checkbox) */
  with_pets?: boolean;
  cancellation_deadline?: string;
  prepayment_required: boolean;
  credit_card_required: boolean;
  booking_source: 'web' | 'mobile' | 'api' | 'phone';
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export interface BookingWithDetails extends Booking {
  hotel: Hotel;
  room_type: RoomType;
  booking_guests: BookingGuest[];
  payments: Payment[];
}

export interface BookingGuest {
  id: string;
  booking_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
}

export interface CreateBookingDto {
  userId?: string;
  hotelId: string;
  roomTypeId: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  numAdults: number;
  numChildren: number;
  children_ages?: number[];
  numRooms: number;
  pricePerNight?: number;
  taxAmount?: number;
  serviceFee?: number;
  totalAmount?: number;
  guests?: Omit<BookingGuest, 'id' | 'booking_id'>[];
  specialRequests?: string;
  promo_code?: string;
}

// Payment Types
export interface Payment {
  id: string;
  booking_id: string;
  payment_reference?: string;
  amount: number;
  currency: string;
  payment_method_id?: string;
  payment_gateway?: string;
  transaction_id?: string;
  status: PaymentStatus;
  paid_at?: string;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  icon_url?: string;
  is_active: boolean;
}

export interface ProcessPaymentDto {
  booking_id: string;
  payment_method_code: string;
  amount: number;
  payment_details?: Record<string, unknown>;
}

/**
 * Hotel review record. Ratings (overall_rating, staff_rating, etc.) use 0-10 scale.
 * UI input is 1-5 stars, converted × 2 before insertion (see lib/actions/reviews.ts).
 * status must be 'approved' before a review appears publicly on hotel pages.
 */
// Review Types
export interface Review {
  id: string;
  hotel_id: string;
  booking_id: string;
  user_id: string;
  reviewer_name?: string;
  reviewer_country?: string;
  reviewer_avatar_url?: string;
  overall_rating: number;
  staff_rating?: number;
  facilities_rating?: number;
  cleanliness_rating?: number;
  comfort_rating?: number;
  value_rating?: number;
  location_rating?: number;
  free_wifi_rating?: number;
  title?: string;
  comment?: string;
  stayed_date?: string;
  image_urls?: string[];
  is_verified: boolean;
  helpful_count: number;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface ReviewWithResponse extends Review {
  review_response?: ReviewResponse;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  hotel_id: string;
  response_text: string;
  responded_by?: string;
  created_at: string;
}

export interface CreateReviewDto {
  bookingId: string;
  hotelId: string;
  overallRating: number;
  staffRating?: number;
  facilitiesRating?: number;
  cleanlinessRating?: number;
  comfortRating?: number;
  valueRating?: number;
  locationRating?: number;
  freeWifiRating?: number;
  title?: string;
  comment?: string;
  imageUrls?: string[];
}

// Meal Plan Types — optional add-ons attached to a booking at creation time
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealPlan {
  id: string;
  hotel_id: string;
  meal_type: MealType;
  name: string;
  description?: string;
  /** Adult price per person per night. */
  price_per_person: number;
  /**
   * Child price per person per night (ages 6–11).
   * Ages 0–5 are infants (no charge). Ages 12+ use price_per_person.
   * Requires DB migration: ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS child_price_per_person numeric(10,2);
   */
  child_price_per_person?: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface BookingMealPlan {
  id: string;
  booking_id: string;
  meal_plan_id: string;
  meal_type: MealType;
  name: string;
  price_per_person: number;
  num_guests: number;
  num_nights: number;
  total_amount: number;
  created_at: string;
}

/**
 * Manual inventory block — prevents a number of rooms from being available
 * for a specific date range, regardless of inventory source mode.
 * Used both in Manual mode (e.g. maintenance) and API mode (override blocks).
 *
 * DB migration:
 *   CREATE TABLE IF NOT EXISTS room_inventory_blocks (
 *     id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *     hotel_id        uuid        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
 *     room_type_id    uuid        NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
 *     start_date      date        NOT NULL,
 *     end_date        date        NOT NULL,
 *     rooms_blocked   integer     NOT NULL DEFAULT 1 CHECK (rooms_blocked > 0),
 *     reason          text,
 *     created_by      uuid        REFERENCES auth.users(id),
 *     created_at      timestamptz NOT NULL DEFAULT now(),
 *     updated_at      timestamptz NOT NULL DEFAULT now(),
 *     CONSTRAINT valid_date_range CHECK (end_date >= start_date)
 *   );
 *   CREATE INDEX ON room_inventory_blocks (room_type_id, start_date, end_date);
 */
export interface RoomInventoryBlock {
  id: string;
  hotel_id: string;
  room_type_id: string;
  start_date: string;
  end_date: string;
  rooms_blocked: number;
  reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
