'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { compressImage } from '@/lib/utils/image-compression'
import Image from 'next/image'

const MAX_IMAGES = 2

interface ReviewImageUploadProps {
  images: File[]
  onImagesChange: (files: File[]) => void
  existingUrls?: string[]
  disabled?: boolean
}

export function ReviewImageUpload({
  images,
  onImagesChange,
  existingUrls,
  disabled,
}: ReviewImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])

  // Read-only mode: show existing images
  if (existingUrls && existingUrls.length > 0) {
    return (
      <div className="space-y-1.5">
        <Label>Photos</Label>
        <div className="flex gap-3">
          {existingUrls.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
              <Image
                src={url}
                alt={`Review photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remaining = MAX_IMAGES - images.length
    const toProcess = files.slice(0, remaining)

    setCompressing(true)
    try {
      const compressed = await Promise.all(toProcess.map(compressImage))
      const newImages = [...images, ...compressed]
      onImagesChange(newImages)

      // Generate previews
      const newPreviews = await Promise.all(
        compressed.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(file)
            })
        )
      )
      setPreviews((prev) => [...prev, ...newPreviews])
    } catch {
      // Silently handle compression errors
    } finally {
      setCompressing(false)
      // Reset input so the same file can be selected again
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    onImagesChange(newImages)
    setPreviews(newPreviews)
  }

  return (
    <div className="space-y-2">
      <Label>Photos (Optional, max {MAX_IMAGES})</Label>

      <div className="flex items-center gap-3">
        {previews.map((preview, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
            <img
              src={preview}
              alt={`Preview ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-20 w-20 flex flex-col gap-1"
            disabled={disabled || compressing}
            onClick={() => inputRef.current?.click()}
          >
            {compressing ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Add</span>
              </>
            )}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <p className="text-xs text-muted-foreground">
        JPEG, PNG or WebP. Images are compressed automatically.
      </p>
    </div>
  )
}
