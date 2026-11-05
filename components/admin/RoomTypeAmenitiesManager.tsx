'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getAllAmenities, addRoomTypeAmenity, removeRoomTypeAmenity } from '@/lib/actions/admin'
import { Plus, X, Loader2 } from '@/components/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Amenity {
  id: string
  name: string
  category_id?: string
  category?: {
    id: string
    name: string
  }
  icon?: string
}

interface RoomTypeAmenity {
  id: string
  amenity: Amenity
}

interface RoomTypeAmenitiesManagerProps {
  roomTypeId: string
  currentAmenities: RoomTypeAmenity[]
}

export function RoomTypeAmenitiesManager({
  roomTypeId,
  currentAmenities,
}: RoomTypeAmenitiesManagerProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const currentAmenityIds = currentAmenities.map((ra) => ra.amenity.id)

  useEffect(() => {
    if (isDialogOpen) {
      loadAmenities()
    }
  }, [isDialogOpen])

  const loadAmenities = async () => {
    setIsLoading(true)
    try {
      const result = await getAllAmenities()
      if (result.success) {
        setAllAmenities(result.amenities)
      }
    } catch (error) {
      console.error('Failed to load amenities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId]
    )
  }

  const handleAddAmenities = async () => {
    if (selectedAmenities.length === 0) {
      return
    }

    setIsAdding(true)
    try {
      const promises = selectedAmenities.map((amenityId) =>
        addRoomTypeAmenity(roomTypeId, amenityId)
      )

      await Promise.all(promises)

      setIsDialogOpen(false)
      setSelectedAmenities([])
      router.refresh()
    } catch (error) {
      alert('Failed to add amenities')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveAmenity = async (roomTypeAmenityId: string) => {
    if (!confirm('Remove this amenity from the room type?')) {
      return
    }

    setIsRemoving(roomTypeAmenityId)
    try {
      const result = await removeRoomTypeAmenity(roomTypeAmenityId)

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Failed to remove amenity')
      }
    } catch (error) {
      alert('Failed to remove amenity')
    } finally {
      setIsRemoving(null)
    }
  }

  const amenitiesByCategory = allAmenities.reduce((acc, amenity) => {
    const category = amenity.category?.name || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(amenity)
    return acc
  }, {} as Record<string, Amenity[]>)

  const currentByCategory = currentAmenities.reduce((acc, ra) => {
    const category = ra.amenity.category?.name || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(ra)
    return acc
  }, {} as Record<string, RoomTypeAmenity[]>)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {currentAmenities.length} {currentAmenities.length === 1 ? 'amenity' : 'amenities'}
        </p>
        <Button onClick={() => setIsDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Amenities
        </Button>
      </div>

      {currentAmenities.length === 0 ? (
        <Alert>
          <AlertDescription>
            No amenities added yet. Click "Add Amenities" to select features.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {Object.entries(currentByCategory).map(([category, amenities]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-foreground mb-2">
                {category}
              </h4>
              <div className="flex flex-wrap gap-2">
                {amenities.map((ra) => (
                  <Badge
                    key={ra.id}
                    variant="secondary"
                    className="pl-3 pr-1 py-1.5"
                  >
                    {ra.amenity.name}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                      onClick={() => handleRemoveAmenity(ra.id)}
                      disabled={isRemoving === ra.id}
                    >
                      {isRemoving === ra.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Amenities Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Amenities</DialogTitle>
            <DialogDescription>
              Select amenities to add to this room type
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {Object.entries(amenitiesByCategory).map(([category, amenities]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {amenities
                      .filter((amenity) => !currentAmenityIds.includes(amenity.id))
                      .map((amenity) => (
                        <div
                          key={amenity.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={amenity.id}
                            checked={selectedAmenities.includes(amenity.id)}
                            onCheckedChange={() => handleToggleAmenity(amenity.id)}
                          />
                          <label
                            htmlFor={amenity.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {amenity.name}
                          </label>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setSelectedAmenities([])
              }}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAmenities}
              disabled={isAdding || selectedAmenities.length === 0}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedAmenities.length} ${
                  selectedAmenities.length === 1 ? 'Amenity' : 'Amenities'
                }`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
