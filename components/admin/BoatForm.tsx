'use client'

import { useState } from 'react'
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
import { createBoat, updateBoat } from '@/lib/actions/boat-admin'
import { Loader2 } from '@/components/icons'
import { ADMIN_PATH } from '@/lib/config/admin-path'

interface BoatFormProps {
  boat?: any
  isEdit?: boolean
}

export function BoatForm({ boat, isEdit = false }: BoatFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: boat?.name || '',
    slug: boat?.slug || '',
    description: boat?.description || '',
    boat_type: boat?.boat_type || '',
    capacity: boat?.capacity || '',
    departure_point: boat?.departure_point || '',
    city: boat?.city || 'Honnavar',
    state: boat?.state || 'Karnataka',
    country: boat?.country || 'India',
    latitude: boat?.latitude || '',
    longitude: boat?.longitude || '',
    phone: boat?.phone || '',
    email: boat?.email || '',
    cancellation_policy_text: boat?.cancellation_policy_text || '',
    safety_info_text: boat?.safety_info_text || '',
    status: boat?.status || 'active',
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const boatData = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      }

      const result = isEdit
        ? await updateBoat(boat.id, boatData)
        : await createBoat(boatData)

      if (result.success) {
        router.push(`${ADMIN_PATH}/boats`)
        router.refresh()
      } else {
        alert(result.error || 'Failed to save boat')
      }
    } catch (error) {
      alert('Failed to save boat')
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
            <Label htmlFor="name">Boat Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="Sunset Cruiser"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              required
              placeholder="sunset-cruiser"
            />
            <p className="text-xs text-muted-foreground">Used in URL (e.g., /boats/sunset-cruiser)</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            placeholder="Describe the boat..."
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="boat_type">Boat Type</Label>
            <Select
              value={formData.boat_type}
              onValueChange={(value) => handleChange('boat_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="motorboat">Motorboat</SelectItem>
                <SelectItem value="sailboat">Sailboat</SelectItem>
                <SelectItem value="speedboat">Speedboat</SelectItem>
                <SelectItem value="houseboat">Houseboat</SelectItem>
                <SelectItem value="kayak">Kayak</SelectItem>
                <SelectItem value="ferry">Ferry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => handleChange('capacity', e.target.value)}
              placeholder="20"
            />
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
          <Label htmlFor="departure_point">Departure Point *</Label>
          <Input
            id="departure_point"
            value={formData.departure_point}
            onChange={(e) => handleChange('departure_point', e.target.value)}
            required
            placeholder="Honnavar Jetty"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              required
              placeholder="Honnavar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              required
              placeholder="Karnataka"
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

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => handleChange('latitude', e.target.value)}
              placeholder="14.2798"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => handleChange('longitude', e.target.value)}
              placeholder="74.4439"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>

        <div className="grid md:grid-cols-2 gap-4">
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
              placeholder="info@boat.com"
            />
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Policies</h3>

        <div className="space-y-2">
          <Label htmlFor="cancellation_policy_text">Cancellation Policy</Label>
          <Textarea
            id="cancellation_policy_text"
            value={formData.cancellation_policy_text}
            onChange={(e) => handleChange('cancellation_policy_text', e.target.value)}
            rows={3}
            placeholder="Free cancellation up to 24 hours before departure..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="safety_info_text">Safety Information</Label>
          <Textarea
            id="safety_info_text"
            value={formData.safety_info_text}
            onChange={(e) => handleChange('safety_info_text', e.target.value)}
            rows={3}
            placeholder="Life jackets provided for all passengers..."
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
            <>{isEdit ? 'Update Boat' : 'Create Boat'}</>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`${ADMIN_PATH}/boats`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
