'use client'

/**
 * Full-screen photo viewer for hotel and room photos (hotel/ImageGallery, hotel/RoomImageGallery).
 * Three rows that never overlap: a top bar (counter, title / caption, zoom, close), the photo
 * filling the rest of the height with previous / next buttons, and a centred thumbnail strip with
 * the keyboard hint. Arrow keys move between photos; Escape closes (the dialog handles it).
 * 360° photos (`panorama: true`) play in the live 360° viewer, marked "360°" in the strip; arrow
 * keys pressed inside that viewer look around instead of changing photo.
 *
 * The dialog is made full screen with `max-w-none sm:max-w-none`: the shared DialogContent caps
 * width at `sm:max-w-lg`, which a plain `max-w-full` does not override.
 */
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from '@/components/icons'
import { PanoramaViewer, panoramaViewerSrc } from '@/components/media/PanoramaViewer'
import { cn } from '@/lib/utils'

export interface LightboxPhoto {
  id: string
  src: string
  alt: string
  /** Shown in the top bar next to the title */
  caption?: string | null
  /** A 360° (2:1) photo, shown in the 360° viewer */
  panorama?: boolean
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[]
  open: boolean
  onOpenChange: (open: boolean) => void
  index: number
  onIndexChange: (index: number) => void
  /** The hotel or room name, in the top bar */
  title: string
}

export function PhotoLightbox({ photos, open, onOpenChange, index, onIndexChange, title }: PhotoLightboxProps) {
  const [zoomed, setZoomed] = useState(false)
  const [loading, setLoading] = useState(true)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const count = photos.length
  const photo = photos[index]

  const goTo = (next: number) => {
    if (count === 0) return
    const wrapped = (next + count) % count
    if (wrapped !== index) {
      setLoading(true)
      setZoomed(false)
      onIndexChange(wrapped)
    }
  }

  // A fresh start each time the viewer opens
  useEffect(() => {
    if (open) {
      setZoomed(false)
      setLoading(true)
    }
  }, [open])

  // ← → move between photos (Escape is handled by the dialog)
  useEffect(() => {
    if (!open || count < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('[role="application"]')) return // looking around a 360°
      if (e.key === 'ArrowLeft') goTo(index - 1)
      else if (e.key === 'ArrowRight') goTo(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, count])

  // Keep the current thumbnail in view
  useEffect(() => {
    if (!open) return
    const thumb = thumbsRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)
    thumb?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [open, index])

  if (!photo) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black p-0 text-white sm:max-w-none"
      >
        <DialogTitle className="sr-only">{title} photos</DialogTitle>

        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums">
              {index + 1} / {count}
            </span>
            <p className="min-w-0 truncate text-sm text-white/80">
              <span className="font-semibold text-white">{title}</span>
              {photo.caption && <span className="hidden sm:inline"> · {photo.caption}</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!photo.panorama && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/15 hover:text-white"
                onClick={() => setZoomed((z) => !z)}
                aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
                title={zoomed ? 'Zoom out' : 'Zoom in'}
              >
                {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 hover:text-white"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* ── The photo ───────────────────────────────────── */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {photo.panorama ? (
            <div className="absolute inset-4 sm:inset-x-20 sm:inset-y-4">
              <PanoramaViewer
                key={photo.id}
                src={panoramaViewerSrc(photo.src)}
                title={photo.caption}
                hotelName={title}
                className="aspect-auto h-full w-full"
              />
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                </div>
              )}
              <div
                className={cn(
                  'absolute inset-4 transition-transform duration-300 sm:inset-x-20 sm:inset-y-4',
                  zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                )}
                onClick={() => setZoomed((z) => !z)}
              >
                <Image
                  key={photo.id}
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  priority
                  sizes="100vw"
                  className={cn('object-contain transition-opacity duration-300', loading ? 'opacity-0' : 'opacity-100')}
                  onLoad={() => setLoading(false)}
                />
              </div>
            </>
          )}

          {count > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 border border-white/20 bg-black/40 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:left-5"
                onClick={() => goTo(index - 1)}
                aria-label="Previous photo"
                title="Previous (←)"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 border border-white/20 bg-black/40 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:right-5"
                onClick={() => goTo(index + 1)}
                aria-label="Next photo"
                title="Next (→)"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* ── Thumbnails ──────────────────────────────────── */}
        {count > 1 && (
          <div className="shrink-0 px-4 pb-4 pt-3 sm:px-6">
            <div ref={thumbsRef} className="overflow-x-auto">
              <div className="mx-auto flex w-max gap-2 p-1.5">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    data-index={i}
                    onClick={() => goTo(i)}
                    aria-label={p.panorama ? `Show 360° view ${p.caption ?? ''}`.trim() : `Show photo ${i + 1}`}
                    aria-current={i === index ? 'true' : undefined}
                    className={cn(
                      'relative h-12 w-16 shrink-0 overflow-hidden rounded-lg transition-all sm:h-14 sm:w-20',
                      i === index
                        ? 'opacity-100 ring-2 ring-white ring-offset-2 ring-offset-black'
                        : 'opacity-50 hover:opacity-100'
                    )}
                  >
                    <Image src={p.src} alt="" fill sizes="80px" className="object-cover" />
                    {p.panorama && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 font-heading text-xs font-extrabold text-white">
                        360°
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 hidden text-center text-xs text-white/50 md:block">
              {photo.panorama
                ? 'Drag to look around · Use ← → to move between photos · Esc to close'
                : 'Use ← → to move between photos · Esc to close · Click the photo to zoom'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
