'use client'

/** 360° photos of a hotel or a room type: list with a live preview, upload (shrunk in the browser first), delete */
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, Plus, Rotate3d, Trash2, Upload } from '@/components/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PanoramaViewer, panoramaViewerSrc } from '@/components/media/PanoramaViewer'
import {
  deleteHotelPanorama,
  deleteRoomTypePanorama,
  uploadHotelPanorama,
  uploadRoomTypePanorama,
} from '@/lib/actions/admin'
import { PANORAMA_TYPES, preparePanorama } from '@/lib/utils/panorama'
import type { HotelPanorama } from '@/lib/types/hotel'

interface PanoramasManagerProps {
  /** Whose photos these are: the hotel itself or one of its room types */
  owner: { type: 'hotel' | 'room_type'; id: string }
  /** Shown over the viewer, as on the hotel page */
  hotelName: string
  panoramas: Pick<HotelPanorama, 'id' | 'image_url' | 'title' | 'display_order'>[]
}

export function PanoramasManager({ owner, hotelName, panoramas }: PanoramasManagerProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [prepared, setPrepared] = useState<{ file: File; previewUrl: string } | null>(null)
  const [title, setTitle] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<PanoramasManagerProps['panoramas'][number] | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const forRoom = owner.type === 'room_type'
  const busy = preparing || uploading
  const sorted = [...panoramas].sort((a, b) => a.display_order - b.display_order)

  const resetDialog = () => {
    if (prepared) URL.revokeObjectURL(prepared.previewUrl)
    setPrepared(null)
    setTitle('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (prepared) URL.revokeObjectURL(prepared.previewUrl)
    setPrepared(null)
    setError(null)
    if (!file) return

    setPreparing(true)
    try {
      const ready = await preparePanorama(file)
      setPrepared({ file: ready, previewUrl: URL.createObjectURL(ready) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This photo cannot be used')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setPreparing(false)
    }
  }

  const handleUpload = async () => {
    if (!prepared) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', prepared.file)
      formData.append('title', title)
      const result = forRoom
        ? await uploadRoomTypePanorama(owner.id, formData)
        : await uploadHotelPanorama(owner.id, formData)
      if (!result.success) throw new Error(result.error)
      setIsDialogOpen(false)
      resetDialog()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload the 360° photo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this 360° photo? This action cannot be undone.')) return
    setDeletingId(id)
    try {
      const result = forRoom ? await deleteRoomTypePanorama(id) : await deleteHotelPanorama(id)
      if (result.success) router.refresh()
      else alert(result.error || 'Failed to delete the 360° photo')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {panoramas.length} {panoramas.length === 1 ? '360° photo' : '360° photos'}
        </p>
        <Button
          onClick={() => {
            resetDialog()
            setIsDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload 360° Photo
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Alert>
          <Rotate3d className="h-4 w-4" />
          <AlertDescription>
            {forRoom
              ? 'No 360° photos of this room yet. Guests open them from the room’s card on the hotel page.'
              : 'No 360° photos yet. Guests can look around the property in the hotel page’s 360° viewer.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((panorama) => (
            <div key={panorama.id} className="overflow-hidden rounded-lg border bg-card">
              <div className="relative aspect-[2/1] bg-muted">
                <Image
                  src={panorama.image_url}
                  alt={panorama.title || '360° photo'}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">
                  360°
                </span>
              </div>
              <div className="flex items-center gap-2 p-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{panorama.title || 'Untitled'}</p>
                <Button size="sm" variant="outline" onClick={() => setPreviewing(panorama)}>
                  <Eye className="mr-1 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(panorama.id)}
                  disabled={deletingId === panorama.id}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (busy) return
          setIsDialogOpen(open)
          if (!open) resetDialog()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload 360° Photo</DialogTitle>
            <DialogDescription>
              An equirectangular panorama (twice as wide as it is tall) from a 360° camera or a phone's
              panorama / photo-sphere mode.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="panoramaFile">360° Photo *</Label>
              <Input
                ref={fileInputRef}
                id="panoramaFile"
                type="file"
                accept={PANORAMA_TYPES.join(',')}
                onChange={handleFileSelect}
                disabled={busy}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                JPEG, PNG or WebP, 2:1. Large photos are resized to 4096 px wide before upload.
              </p>
            </div>

            {preparing && <p className="text-sm text-muted-foreground">Preparing the photo…</p>}

            {prepared && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <PanoramaViewer src={prepared.previewUrl} title={title} hotelName={hotelName} />
                <p className="text-xs text-muted-foreground">
                  Ready to upload: {(prepared.file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="panoramaTitle">Title (Optional)</Label>
              <Input
                id="panoramaTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={forRoom ? 'e.g. Bedroom, Bathroom, Balcony' : 'e.g. Lobby, Deluxe Room, Pool deck'}
                disabled={busy}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={busy || !prepared}>
              <Upload className={uploading ? 'mr-2 h-4 w-4 animate-pulse' : 'mr-2 h-4 w-4'} />
              {uploading ? 'Uploading...' : 'Upload 360° Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={previewing !== null} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewing?.title || '360° photo'}</DialogTitle>
            <DialogDescription>This is how guests see it on the hotel page.</DialogDescription>
          </DialogHeader>
          {previewing && (
            <PanoramaViewer
              src={panoramaViewerSrc(previewing.image_url)}
              title={previewing.title}
              hotelName={hotelName}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
