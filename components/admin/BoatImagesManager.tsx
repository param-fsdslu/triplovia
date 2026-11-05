'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { uploadBoatImage, deleteBoatImage } from '@/lib/actions/boat-admin'
import { Plus, Trash2, Image as ImageIcon, Upload } from '@/components/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BoatImagesManagerProps {
  boatId: string
  images: any[]
}

export function BoatImagesManager({ boatId, images }: BoatImagesManagerProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [newImage, setNewImage] = useState({ altText: '', displayOrder: images.length })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) { alert('Invalid file type. Only JPEG, PNG, and WebP allowed.'); return }
    if (file.size > 5 * 1024 * 1024) { alert('File size exceeds 5MB.'); return }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleUploadImage = async () => {
    if (!selectedFile) { alert('Please select an image file'); return }
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('altText', newImage.altText)
      formData.append('displayOrder', newImage.displayOrder.toString())
      const result = await uploadBoatImage(boatId, formData)
      if (result.success) {
        setIsAddDialogOpen(false); setSelectedFile(null); setPreviewUrl(''); setNewImage({ altText: '', displayOrder: images.length + 1 }); router.refresh()
      } else { alert(result.error || 'Failed to upload image') }
    } catch { alert('Failed to upload image') } finally { setIsUploading(false) }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return
    setIsDeleting(imageId)
    try {
      const result = await deleteBoatImage(imageId)
      if (result.success) { router.refresh() } else { alert(result.error || 'Failed to delete') }
    } catch { alert('Failed to delete image') } finally { setIsDeleting(null) }
  }

  const resetDialog = () => {
    setSelectedFile(null); setPreviewUrl(''); setNewImage({ altText: '', displayOrder: images.length })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{images.length} image(s)</p>
        <Button onClick={() => { resetDialog(); setIsAddDialogOpen(true) }}><Plus className="h-4 w-4 mr-2" />Upload Image</Button>
      </div>

      {images.length === 0 ? (
        <Alert><ImageIcon className="h-4 w-4" /><AlertDescription>No images uploaded yet.</AlertDescription></Alert>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.sort((a: any, b: any) => a.display_order - b.display_order).map((image: any) => (
            <div key={image.id} className="relative group border rounded-lg overflow-hidden bg-muted">
              <div className="aspect-video relative">
                <Image src={image.image_url} alt={image.alt_text || 'Boat image'} fill className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button size="sm" variant="destructive" onClick={() => handleDeleteImage(image.id)} disabled={isDeleting === image.id}>
                  <Trash2 className="h-4 w-4 mr-1" />{isDeleting === image.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
              {image.alt_text && <div className="p-2 bg-white"><p className="text-xs text-muted-foreground truncate">{image.alt_text}</p></div>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetDialog() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Boat Image</DialogTitle><DialogDescription>Select an image to upload</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Image File *</Label>
              <Input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileSelect} />
              <p className="text-xs text-muted-foreground">JPEG, PNG, WebP. Max 5MB</p>
            </div>
            {previewUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative w-full aspect-video border rounded-lg overflow-hidden bg-muted">
                  <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input value={newImage.altText} onChange={(e) => setNewImage(p => ({ ...p, altText: e.target.value }))} placeholder="Description" />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" value={newImage.displayOrder} onChange={(e) => setNewImage(p => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isUploading}>Cancel</Button>
            <Button onClick={handleUploadImage} disabled={isUploading || !selectedFile}>
              {isUploading ? <><Upload className="h-4 w-4 mr-2 animate-pulse" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
