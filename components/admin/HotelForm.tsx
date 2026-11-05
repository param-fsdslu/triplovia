'use client'

import { CancellationPolicyMatrix } from '@/components/hotel/CancellationPolicyMatrix'
import { HOTEL_CANCELLATION_POLICIES, hotelPolicyText, isHotelCancellationPolicy, type HotelCancellationPolicy } from '@/lib/config/hotel-cancellation-policy'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createHotel, updateHotel } from '@/lib/actions/admin'
import { Loader2, Plus, X } from '@/components/icons'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { LocationFields } from './LocationFields'
import { MAX_NEARBY_PLACES, NEARBY_PLACE_TYPES, nearestPlaces } from '@/lib/utils/nearby-places'

/** A nearby place being edited (distance as typed) */
interface NearbyRow {
  type: string
  name: string
  distance: string
}

// Extract the src URL from a Google Maps embed iframe code
function parseIframeSrc(iframeCode: string): string | null {
  const match = iframeCode.match(/src="([^"]+)"/)
  if (match) return match[1]
  return null
}

interface HotelFormProps {
  hotel?: any
  isEdit?: boolean
}

export function HotelForm({ hotel, isEdit = false }: HotelFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: hotel?.name || '',
    slug: hotel?.slug || '',
    description: hotel?.description || '',
    address_line_1: hotel?.address_line_1 || '',
    address_line_2: hotel?.address_line_2 || '',
    city: hotel?.city || '',
    district: hotel?.district || '',
    state: hotel?.state || '',
    postal_code: hotel?.postal_code || '',
    country: hotel?.country || 'India',
    latitude: hotel?.latitude || '',
    longitude: hotel?.longitude || '',
    maps_embed_url: hotel?.maps_embed_url || '',
    mapsEmbedCode: '',
    phone: hotel?.phone || '',
    email: hotel?.email || '',
    website: hotel?.website || '',
    star_rating: hotel?.star_rating || '',
    property_type: hotel?.property_type || '',
    check_in_from_time: hotel?.check_in_from_time || '14:00',
    check_in_to_time: hotel?.check_in_to_time || '23:00',
    check_out_time: hotel?.check_out_time || '11:00',
    cancellation_policy: hotel?.cancellation_policy || '',
    cancellation_policy_text: hotel?.cancellation_policy_text || '',
    child_policy_text: hotel?.child_policy_text || '',
    pet_policy_text: hotel?.pet_policy_text || '',
    status: hotel?.status || 'active',
  })
  // Nearby places & connectivity (hotels.nearby_places): the 2 nearest show on the search results card
  const [nearbyRows, setNearbyRows] = useState<NearbyRow[]>(() =>
    nearestPlaces(hotel?.nearby_places).map((p) => ({ type: p.type, name: p.name, distance: String(p.distance_km) }))
  )
  const updateNearbyRow = (index: number, patch: Partial<NearbyRow>) =>
    setNearbyRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Auto-generate slug from name
    if (field === 'name' && !isEdit) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }

  const handleLocationChange = useCallback((field: 'state' | 'district' | 'city', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isHotelCancellationPolicy(formData.cancellation_policy)) {
      alert('Select one cancellation policy')
      return
    }

    setIsSubmitting(true)

    try {
      const { mapsEmbedCode: _mapsEmbedCode, ...rest } = formData
      const hotelData = {
        ...rest,
        star_rating: formData.star_rating ? parseInt(formData.star_rating) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        // Rows without a name are dropped; the server cleans and sorts the rest
        nearby_places: nearbyRows
          .filter((row) => row.name.trim())
          .map((row) => ({ type: row.type, name: row.name.trim(), distance_km: parseFloat(row.distance) || 0 })),
      }

      const result = isEdit
        ? await updateHotel(hotel.id, hotelData)
        : await createHotel(hotelData)

      if (result.success) {
        router.push(`${ADMIN_PATH}/hotels`)
        router.refresh()
      } else {
        alert(result.error || 'Failed to save hotel')
      }
    } catch (error) {
      alert('Failed to save hotel')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Hotel Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="Grand Plaza Hotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              required
              placeholder="grand-plaza-hotel"
            />
            <p className="text-xs text-muted-foreground">Used in URL (e.g., /hotels/grand-plaza-hotel)</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            placeholder="Describe the hotel..."
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="star_rating">Star Rating</Label>
            <Select
              value={formData.star_rating}
              onValueChange={(value) => handleChange('star_rating', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Star</SelectItem>
                <SelectItem value="2">2 Star</SelectItem>
                <SelectItem value="3">3 Star</SelectItem>
                <SelectItem value="4">4 Star</SelectItem>
                <SelectItem value="5">5 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property_type">Property Type</Label>
            <Select
              value={formData.property_type}
              onValueChange={(value) => handleChange('property_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="resort">Resort</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="guesthouse">Guesthouse</SelectItem>
                <SelectItem value="hostel">Hostel</SelectItem>
                <SelectItem value="homestay">Homestay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Location</h3>

        <div className="space-y-2">
          <Label htmlFor="address_line_1">Address Line 1 *</Label>
          <Input
            id="address_line_1"
            value={formData.address_line_1}
            onChange={(e) => handleChange('address_line_1', e.target.value)}
            required
            placeholder="123 Main Street"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address_line_2">Address Line 2</Label>
          <Input
            id="address_line_2"
            value={formData.address_line_2}
            onChange={(e) => handleChange('address_line_2', e.target.value)}
            placeholder="Near Central Park"
          />
        </div>

        <LocationFields
          country={formData.country}
          state={formData.state}
          district={formData.district}
          city={formData.city}
          onChange={handleLocationChange}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              value={formData.postal_code}
              onChange={(e) => handleChange('postal_code', e.target.value)}
              placeholder="400001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="India"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mapsEmbedCode">Google Maps Embed Code</Label>
          <Textarea
            id="mapsEmbedCode"
            value={formData.mapsEmbedCode}
            onChange={(e) => {
              handleChange('mapsEmbedCode', e.target.value)
              const src = parseIframeSrc(e.target.value)
              if (src) handleChange('maps_embed_url', src)
            }}
            placeholder='Paste the <iframe> embed code from Google Maps → Share → Embed a map'
            rows={3}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            In Google Maps: click Share → Embed a map → select size Small → copy HTML → paste above.
          </p>
        </div>

        {formData.maps_embed_url && (
          <div className="rounded-md overflow-hidden border border-border">
            <iframe
              title="Location preview"
              width="100%"
              height="200"
              style={{ border: 0 }}
              src={formData.maps_embed_url}
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Nearby places & connectivity */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Nearby &amp; Connectivity</h3>
          <p className="text-sm text-muted-foreground">
            Railway station, bus stand, airport, beach… with the distance from the hotel. All show on the hotel
            page; the 2 nearest also show on the search results card.
          </p>
        </div>

        {nearbyRows.length > 0 && (
          <div className="space-y-3">
            {nearbyRows.map((row, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_8rem_auto] sm:items-center">
                <Select value={row.type} onValueChange={(value) => updateNearbyRow(index, { type: value })}>
                  <SelectTrigger aria-label={`Place ${index + 1} type`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEARBY_PLACE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  aria-label={`Place ${index + 1} name`}
                  value={row.name}
                  onChange={(e) => updateNearbyRow(index, { name: e.target.value })}
                  placeholder="Honnavar Railway Station"
                  maxLength={80}
                />
                <div className="relative">
                  <Input
                    aria-label={`Place ${index + 1} distance in km`}
                    type="number"
                    step="0.1"
                    min="0"
                    value={row.distance}
                    onChange={(e) => updateNearbyRow(index, { distance: e.target.value })}
                    placeholder="2.5"
                    className="pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    km
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setNearbyRows((rows) => rows.filter((_, i) => i !== index))}
                  aria-label={`Remove place ${index + 1}`}
                  className="justify-self-end text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={nearbyRows.length >= MAX_NEARBY_PLACES}
          onClick={() => setNearbyRows((rows) => [...rows, { type: 'railway', name: '', distance: '' }])}
        >
          <Plus className="h-4 w-4" />
          Add place
        </Button>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+91 1234567890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="info@hotel.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://hotel.com"
            />
          </div>
        </div>
      </div>

      {/* Policies & Timings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Check-in/Check-out</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="check_in_from_time">Check-in From</Label>
            <Input
              id="check_in_from_time"
              type="time"
              value={formData.check_in_from_time}
              onChange={(e) => handleChange('check_in_from_time', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="check_in_to_time">Check-in Until</Label>
            <Input
              id="check_in_to_time"
              type="time"
              value={formData.check_in_to_time}
              onChange={(e) => handleChange('check_in_to_time', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="check_out_time">Check-out Time</Label>
            <Input
              id="check_out_time"
              type="time"
              value={formData.check_out_time}
              onChange={(e) => handleChange('check_out_time', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Policies</h3>

        <div className="space-y-2">
          <Label>Cancellation Policy *</Label>
          <p className="text-sm text-muted-foreground">Select one policy. It applies to new bookings; existing bookings keep their original terms.</p>
          <Select value={formData.cancellation_policy} onValueChange={(value) => {
            if (isHotelCancellationPolicy(value)) setFormData(prev => ({ ...prev, cancellation_policy: value, cancellation_policy_text: hotelPolicyText(value) }))
          }}>
            <SelectTrigger aria-label="Cancellation policy"><SelectValue placeholder="Select a cancellation policy" /></SelectTrigger>
            <SelectContent>{(Object.keys(HOTEL_CANCELLATION_POLICIES) as HotelCancellationPolicy[]).map(policy => <SelectItem key={policy} value={policy}>{HOTEL_CANCELLATION_POLICIES[policy].title}</SelectItem>)}</SelectContent>
          </Select>
          {isHotelCancellationPolicy(formData.cancellation_policy) && <div className="rounded-xl border border-border bg-card p-4"><CancellationPolicyMatrix policy={formData.cancellation_policy} vendorTerms={false} commission /></div>}
          <p className="text-sm text-muted-foreground">If the vendor cancels a confirmed booking, 100% of the advance must be refunded within 48 hours, and full Triplovia commission remains payable.</p>

        </div>

        <div className="space-y-2">
          <Label htmlFor="child_policy_text">Child Policy</Label>
          <Textarea
            id="child_policy_text"
            value={formData.child_policy_text}
            onChange={(e) => handleChange('child_policy_text', e.target.value)}
            rows={2}
            placeholder="Children of all ages are welcome..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pet_policy_text">Pet Policy</Label>
          <Textarea
            id="pet_policy_text"
            value={formData.pet_policy_text}
            onChange={(e) => handleChange('pet_policy_text', e.target.value)}
            rows={2}
            placeholder="Pets are allowed with prior approval..."
          />
        </div>

      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[150px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>{isEdit ? 'Update Hotel' : 'Create Hotel'}</>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`${ADMIN_PATH}/hotels`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
