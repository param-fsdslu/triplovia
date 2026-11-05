/**
 * Google Maps "directions to the hotel" link (opens the Maps app on phones): to the hotel's
 * coordinates when it has them, else to its name and address.
 */
export function directionsUrl(hotel: {
  name?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
}) {
  const lat = hotel.latitude == null || hotel.latitude === '' ? NaN : Number(hotel.latitude)
  const lng = hotel.longitude == null || hotel.longitude === '' ? NaN : Number(hotel.longitude)
  const destination =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat},${lng}`
      : [hotel.name, hotel.address_line_1, hotel.address_line_2, hotel.city, hotel.state, hotel.postal_code]
          .filter(Boolean)
          .join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
