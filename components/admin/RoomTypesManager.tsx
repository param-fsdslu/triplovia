'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Image as ImageIcon, Rotate3d, Users } from '@/components/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { deleteRoomType } from '@/lib/actions/admin'
import { RoomTypeForm } from './RoomTypeForm'
import { RoomTypeDetailsDialog } from './RoomTypeDetailsDialog'

interface RoomType {
  id: string
  name: string
  description?: string
  base_price: number
  max_occupancy: number
  max_adults: number
  max_children: number
  bed_configuration?: string
  size_sqm?: number
  num_available_rooms: number
  status: string
  room_type_images?: any[]
  room_type_panoramas?: any[]
  room_type_amenities?: any[]
}

interface RoomTypesManagerProps {
  hotelId: string
  hotelName: string
  roomTypes: RoomType[]
}

export function RoomTypesManager({ hotelId, hotelName, roomTypes }: RoomTypesManagerProps) {
  const router = useRouter()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null)
  // Looked up in the latest props, so photos added in the open dialog show after router.refresh()
  const [viewingRoomTypeId, setViewingRoomTypeId] = useState<string | null>(null)
  const viewingRoomType = roomTypes.find((rt) => rt.id === viewingRoomTypeId) ?? null
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDeleteRoomType = async (roomTypeId: string, roomTypeName: string) => {
    if (!confirm(`Are you sure you want to delete "${roomTypeName}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(roomTypeId)
    try {
      const result = await deleteRoomType(roomTypeId)

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Failed to delete room type')
      }
    } catch (error) {
      alert('Failed to delete room type')
    } finally {
      setIsDeleting(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      available: 'default',
      unavailable: 'destructive',
      maintenance: 'secondary',
    }
    return variants[status] || 'secondary'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {roomTypes.length} {roomTypes.length === 1 ? 'room type' : 'room types'}
        </p>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room Type
        </Button>
      </div>

      {roomTypes.length === 0 ? (
        <Alert>
          <AlertDescription>
            No room types added yet. Click "Add Room Type" to create your first room.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {roomTypes.map((roomType) => (
            <div
              key={roomType.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {roomType.name}
                    </h3>
                    <Badge variant={getStatusBadge(roomType.status)}>
                      {roomType.status}
                    </Badge>
                  </div>

                  {roomType.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {roomType.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Max: {roomType.max_occupancy} guests</span>
                    </div>
                    {roomType.bed_configuration && (
                      <div>
                        <span>{roomType.bed_configuration}</span>
                      </div>
                    )}
                    {roomType.size_sqm && (
                      <div>
                        <span>{roomType.size_sqm} sqm</span>
                      </div>
                    )}
                    <div>
                      <span>{roomType.num_available_rooms} rooms available</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    {roomType.room_type_images && roomType.room_type_images.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {roomType.room_type_images.length} {roomType.room_type_images.length === 1 ? 'image' : 'images'}
                      </Badge>
                    )}
                    {roomType.room_type_panoramas && roomType.room_type_panoramas.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Rotate3d className="h-3 w-3 mr-1" />
                        {roomType.room_type_panoramas.length} × 360°
                      </Badge>
                    )}
                    {roomType.room_type_amenities && roomType.room_type_amenities.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {roomType.room_type_amenities.length} {roomType.room_type_amenities.length === 1 ? 'amenity' : 'amenities'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-right ml-4">
                  <p className="text-2xl font-bold text-primary">
                    ₹{roomType.base_price.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground">per night</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingRoomTypeId(roomType.id)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingRoomType(roomType)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteRoomType(roomType.id, roomType.name)}
                  disabled={isDeleting === roomType.id}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isDeleting === roomType.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Room Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Room Type</DialogTitle>
            <DialogDescription>
              Create a new room type for this hotel
            </DialogDescription>
          </DialogHeader>
          <RoomTypeForm
            hotelId={hotelId}
            onSuccess={() => {
              setIsAddDialogOpen(false)
              router.refresh()
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Room Type Dialog */}
      {editingRoomType && (
        <Dialog open={!!editingRoomType} onOpenChange={() => setEditingRoomType(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Room Type</DialogTitle>
              <DialogDescription>
                Update room type details
              </DialogDescription>
            </DialogHeader>
            <RoomTypeForm
              hotelId={hotelId}
              roomType={editingRoomType}
              isEdit={true}
              onSuccess={() => {
                setEditingRoomType(null)
                router.refresh()
              }}
              onCancel={() => setEditingRoomType(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* View Room Type Details Dialog */}
      {viewingRoomType && (
        <RoomTypeDetailsDialog
          roomType={viewingRoomType}
          hotelName={hotelName}
          onClose={() => setViewingRoomTypeId(null)}
        />
      )}
    </div>
  )
}
