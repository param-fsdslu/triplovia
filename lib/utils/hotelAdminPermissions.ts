/**
 * Hotel admin permission keys and utilities.
 *
 * Controls what hotel_admin users are allowed to do in the admin panel.
 * super_admin users bypass all permission checks.
 *
 * Permissions are stored in the `hotel_admin_permissions` collection (document id =
 * permission_key; fields: enabled, requires_approval, updated_at) and cached in memory
 * for the duration of the request. A missing row means the permission is enabled by
 * default (fail-open for super_admin only; hotel_admin falls back to denied).
 */

export type HotelAdminPermissionKey =
  | 'room_pricing'
  | 'room_availability'
  | 'property_details'
  | 'amenities'
  | 'images'
  | 'offers'
  | 'cancellation_policy'
  | 'meal_pricing'

export const HOTEL_ADMIN_PERMISSION_LABELS: Record<HotelAdminPermissionKey, string> = {
  room_pricing: 'Room Pricing',
  room_availability: 'Room Availability',
  property_details: 'Property Details',
  amenities: 'Amenities',
  images: 'Images',
  offers: 'Offers & Promotions',
  cancellation_policy: 'Cancellation Policy',
  meal_pricing: 'Meal Plan Pricing',
}

export const HOTEL_ADMIN_PERMISSION_DESCRIPTIONS: Record<HotelAdminPermissionKey, string> = {
  room_pricing: 'Allow hotel admins to edit room base price and pricing rules',
  room_availability: 'Allow hotel admins to toggle room availability and manage inventory',
  property_details: 'Allow hotel admins to edit hotel name, description, address, and contact info',
  amenities: 'Allow hotel admins to add or remove amenities for hotel and room types',
  images: 'Allow hotel admins to upload, reorder, and delete hotel and room images',
  offers: 'Allow hotel admins to create and manage discount offers and promotions',
  cancellation_policy: 'Allow hotel admins to edit the cancellation policy text',
  meal_pricing: 'Allow hotel admins to create, edit, and delete meal plans and their prices',
}

export const ALL_PERMISSION_KEYS: HotelAdminPermissionKey[] = [
  'room_pricing',
  'room_availability',
  'property_details',
  'amenities',
  'images',
  'offers',
  'cancellation_policy',
  'meal_pricing',
]

export interface HotelAdminPermission {
  permission_key: HotelAdminPermissionKey
  enabled: boolean
  requires_approval: boolean
  updated_at: string
}
