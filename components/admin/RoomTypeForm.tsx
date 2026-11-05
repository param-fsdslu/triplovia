'use client'

import { useState } from 'react'
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
import { createRoomType, updateRoomType } from '@/lib/actions/admin'
import { Loader2 } from '@/components/icons'

interface RoomTypeFormProps {
  hotelId: string
  roomType?: any
  isEdit?: boolean
  onSuccess: () => void
  onCancel: () => void
}

export function RoomTypeForm({
  hotelId,
  roomType,
  isEdit = false,
  onSuccess,
  onCancel,
}: RoomTypeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: roomType?.name || '',
    description: roomType?.description || '',
    base_price: roomType?.base_price || '',
    max_occupancy: roomType?.max_occupancy || 2,
    max_adults: roomType?.max_adults || 2,
    max_children: roomType?.max_children || 0,
    standard_occupancy: roomType?.standard_occupancy ?? 2,
    extra_bed_price: roomType?.extra_bed_price ?? 0,
    // Empty = children pay the extra-bed price (as before child prices existed)
    child_price: roomType?.child_price ?? '',
    bed_configuration: roomType?.bed_configuration || '',
    size_sqm: roomType?.size_sqm || '',
    num_available_rooms: roomType?.num_available_rooms || 1,
    status: roomType?.status || 'available',
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data = {
        hotel_id: hotelId,
        name: formData.name,
        description: formData.description || null,
        base_price: parseFloat(formData.base_price),
        max_occupancy: parseInt(formData.max_occupancy.toString()),
        max_adults: parseInt(formData.max_adults.toString()),
        max_children: parseInt(formData.max_children.toString()),
        standard_occupancy: parseInt(formData.standard_occupancy.toString()),
        extra_bed_price: parseFloat(formData.extra_bed_price.toString()) || 0,
        child_price: formData.child_price === '' ? null : Math.max(0, parseFloat(formData.child_price.toString()) || 0),
        bed_configuration: formData.bed_configuration || null,
        size_sqm: formData.size_sqm ? parseFloat(formData.size_sqm) : null,
        num_available_rooms: parseInt(formData.num_available_rooms.toString()),
        status: formData.status,
      }

      const result = isEdit
        ? await updateRoomType(roomType.id, data)
        : await createRoomType(data)

      if (result.success) {
        onSuccess()
      } else {
        alert(result.error || 'Failed to save room type')
      }
    } catch (error) {
      alert('Failed to save room type')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Type Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="Deluxe Suite"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_price">Base Price (₹) *</Label>
            <Input
              id="base_price"
              type="number"
              step="0.01"
              value={formData.base_price}
              onChange={(e) => handleChange('base_price', e.target.value)}
              required
              placeholder="5000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            placeholder="Describe the room type..."
          />
        </div>
      </div>

      {/* Capacity */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Capacity</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max_occupancy">Max Occupancy *</Label>
            <Input
              id="max_occupancy"
              type="number"
              min="1"
              value={formData.max_occupancy}
              onChange={(e) => handleChange('max_occupancy', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_adults">Max Adults *</Label>
            <Input
              id="max_adults"
              type="number"
              min="1"
              value={formData.max_adults}
              onChange={(e) => handleChange('max_adults', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_children">Max Children</Label>
            <Input
              id="max_children"
              type="number"
              min="0"
              value={formData.max_children}
              onChange={(e) => handleChange('max_children', e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="standard_occupancy">Standard Occupancy *</Label>
            <Input
              id="standard_occupancy"
              type="number"
              min="1"
              value={formData.standard_occupancy}
              onChange={(e) => handleChange('standard_occupancy', e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Adults included in the base price before extra-bed charges apply
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra_bed_price">Extra Bed / Adult Price (₹ per night)</Label>
            <Input
              id="extra_bed_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.extra_bed_price}
              onChange={(e) => handleChange('extra_bed_price', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Charged per adult beyond standard occupancy, up to max occupancy
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="child_price">Child Price, Ages 6–11 (₹ per night)</Label>
            <Input
              id="child_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.child_price}
              onChange={(e) => handleChange('child_price', e.target.value)}
              placeholder="Same as extra bed"
            />
            <p className="text-xs text-muted-foreground">
              Charged per night for every child aged 6–11; ages 1–5 stay free. Empty = extra bed price, 0 = free
            </p>
          </div>
        </div>
      </div>

      {/* Room Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Room Details</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bed_configuration">Bed Configuration</Label>
            <Input
              id="bed_configuration"
              value={formData.bed_configuration}
              onChange={(e) => handleChange('bed_configuration', e.target.value)}
              placeholder="1 King Bed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="size_sqm">Size (sqm)</Label>
            <Input
              id="size_sqm"
              type="number"
              step="0.1"
              value={formData.size_sqm}
              onChange={(e) => handleChange('size_sqm', e.target.value)}
              placeholder="35"
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Availability</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="num_available_rooms">Number of Rooms *</Label>
            <Input
              id="num_available_rooms"
              type="number"
              min="0"
              value={formData.num_available_rooms}
              onChange={(e) => handleChange('num_available_rooms', e.target.value)}
              required
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
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>{isEdit ? 'Update' : 'Create'} Room Type</>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
