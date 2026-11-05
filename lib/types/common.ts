/**
 * Shared types used across the hotel, boat, and auth domains.
 * Import from '@/lib/types' (the barrel) rather than directly from this file.
 *
 * Key shared types:
 * - PaymentStatus / ReviewStatus — used in both hotel and boat booking records
 * - ApiResponse<T> / PaginatedResponse<T> — standard shapes returned by API routes
 * - Amenity / AmenityCategory — shared amenity catalogue for hotels and boats
 * - DeepPartial / Nullable / Optional — utility types for form state and partial updates
 */

// Common types shared across all domains

/** Roles for guest-facing access control. Admin roles are in lib/utils/roles.ts. */
export type UserRole = 'guest' | 'hotel_manager' | 'admin';
/** Physical room status — tracks the housekeeping and occupancy lifecycle. */
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning';
export type NotificationType = 'booking_confirmation' | 'reminder' | 'promotion' | 'review_request' | 'cancellation';

export interface DateRange {
  from: Date;
  to: Date;
}

// API Response Types — standard envelopes for all /api/* route responses
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Location Types
export interface NearbyAttraction {
  id: string;
  name: string;
  category: 'restaurant' | 'attraction' | 'natural_beauty' | 'public_transit' | 'airport' | 'shopping' | 'entertainment';
  latitude?: number;
  longitude?: number;
  description?: string;
  distance_meters?: number;
  distance_text?: string;
}

// FAQ Types
export interface FAQ {
  id: string;
  hotel_id?: string;
  question: string;
  answer: string;
  category?: string;
  display_order: number;
  is_active: boolean;
}

// Wishlist Types
export interface Wishlist {
  id: string;
  user_id: string;
  hotel_id: string;
  created_at: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Promotion Types
export interface Promotion {
  id: string;
  hotel_id?: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_booking_amount?: number;
  max_discount?: number;
  valid_from?: string;
  valid_to?: string;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
}

export interface ValidatePromoCodeDto {
  code: string;
  hotel_id?: string;
  booking_amount: number;
}

export interface PromoCodeValidation {
  valid: boolean;
  promotion?: Promotion;
  discount_amount?: number;
  message?: string;
}

// Shared Status Types (used across hotel and boat domains)
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded' | 'partially_refunded';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// Amenity Types (shared across hotel and boat)
export interface Amenity {
  id: string;
  name: string;
  icon?: string;
  category?: AmenityCategory;
}

export interface AmenityCategory {
  id: string;
  name: string;
  icon?: string;
  display_order: number;
}

// Utility Types — generic helpers for form state and partial DB updates
/** Makes all nested properties optional. Useful for deep partial update payloads. */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Shorthand for T | null — use in interfaces where a field may be absent. */
export type Nullable<T> = T | null;

/** Makes specific keys K of T optional while keeping all other keys required. */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
