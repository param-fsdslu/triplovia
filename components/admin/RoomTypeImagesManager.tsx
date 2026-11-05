'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { uploadRoomTypeImage, deleteRoomTypeImage } from '@/lib/actions/admin'
import { Plus, Trash2, Image as ImageIcon, Upload } from '@/components/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RoomTypeImage {
  id: string
  image_url: string
  alt_text?: string
  display_order: number
}

interface RoomTypeImagesManagerProps {
  roomTypeId: string
  images: RoomTypeImage[]
}

export function RoomTypeImagesManager({ roomTypeId, images }: RoomTypeImagesManagerProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [newImage, setNewImage] = useState({
    altText: '',
    displayOrder: images.length,
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, and WebP images are allowed.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('File size exceeds 5MB. Please choose a smaller image.')
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUploadImage = async () => {
    if (!selectedFile) {
      alert('Please select an image file')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('altText', newImage.altText)
      formData.append('displayOrder', newImage.displayOrder.toString())

      const result = await uploadRoomTypeImage(roomTypeId, formData)

      if (result.success) {
        setIsAddDialogOpen(false)
        setSelectedFile(null)
        setPreviewUrl('')
        setNewImage({ altText: '', displayOrder: images.length + 1 })
        router.refresh()
      } else {
        alert(result.error || 'Failed to upload image')
      }
    } catch (error) {
      alert('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return
    }

    setIsDeleting(imageId)
    try {
      const result = await deleteRoomTypeImage(imageId)

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Failed to delete image')
      }
    } catch (error) {
      alert('Failed to delete image')
    } finally {
      setIsDeleting(null)
    }
  }

  const resetDialog = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setNewImage({ altText: '', displayOrder: images.length })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {images.length} {images.length === 1 ? 'image' : 'images'}
        </p>
        <Button onClick={() => {
          resetDialog()
          setIsAddDialogOpen(true)
        }} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Upload Image
        </Button>
      </div>

      {images.length === 0 ? (
        <Alert>
          <ImageIcon className="h-4 w-4" />
          <AlertDescription>
            No images uploaded yet. Click "Upload Image" to add room photos.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images
            .sort((a, b) => a.display_order - b.display_order)
            .map((image) => (
              <div
                key={image.id}
                className="relative group border rounded-lg overflow-hidden bg-muted"
              >
                <div className="aspect-video relative">
                  <Image
                    src={image.image_url}
                    alt={image.alt_text || 'Room image'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteImage(image.id)}
                    disabled={isDeleting === image.id}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {isDeleting === image.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
                {image.alt_text && (
                  <div className="p-2 bg-white">
                    <p className="text-xs text-muted-foreground truncate">
                      {image.alt_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Upload Image Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) resetDialog()
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Room Image</DialogTitle>
            <DialogDescription>
              Select an image file to upload
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="imageFile">Image File *</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="imageFile"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Accepted formats: JPEG, PNG, WebP. Max size: 5MB
              </p>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative w-full aspect-video border rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  File: {selectedFile?.name} ({(selectedFile!.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            )}

            {/* Alt Text */}
            <div className="space-y-2">
              <Label htmlFor="altText">Alt Text (Optional)</Label>
              <Input
                id="altText"
                value={newImage.altText}
                onChange={(e) =>
                  setNewImage((prev) => ({ ...prev, altText: e.target.value }))
                }
                placeholder="Description of the image for accessibility"
              />
              <p className="text-xs text-muted-foreground">
                Helps with SEO and accessibility
              </p>
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={newImage.displayOrder}
                onChange={(e) =>
                  setNewImage((prev) => ({
                    ...prev,
                    displayOrder: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadImage}
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
