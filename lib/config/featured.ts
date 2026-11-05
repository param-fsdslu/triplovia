/**
 * Homepage "Featured stays": at most this many show, and a super admin can feature at most this many
 * (admin Hotels list → Featured switch, `setHotelFeatured` in lib/actions/admin/hotels.ts).
 * Safe to import from client and server code.
 */
export const FEATURED_STAYS_LIMIT = 6
