/**
 * 360° photos (equirectangular, twice as wide as tall). preparePanorama runs in the browser
 * before upload: it checks the shape and re-encodes the photo as a JPEG at most 4096 px wide
 * (the largest texture phones reliably handle) that fits the 3 MB server action body limit.
 * hotelPanoramaViews lists a hotel's 360° photos (its own, then its rooms') for the photo viewers.
 */

import type { HotelPanorama } from '@/lib/types/hotel'

export const PANORAMA_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** Under next.config.ts serverActions.bodySizeLimit (3 MB), leaving room for the form fields */
export const PANORAMA_MAX_BYTES = Math.floor(2.8 * 1024 * 1024)

const MAX_WIDTH = 4096
const MIN_WIDTH = 2000
const WIDTHS = [MAX_WIDTH, 3072, 2048]
const QUALITIES = [0.88, 0.8, 0.72, 0.64]

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  return img
    .decode()
    .then(() => img)
    .catch(() => {
      throw new Error('This file could not be read as an image.')
    })
    .finally(() => URL.revokeObjectURL(url))
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))), 'image/jpeg', quality)
  )
}

/** Returns an upload-ready JPEG of the panorama, or throws a message for the admin */
export async function preparePanorama(file: File): Promise<File> {
  if (!PANORAMA_TYPES.includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.')

  const img = await loadImage(file)
  const ratio = img.naturalWidth / img.naturalHeight
  if (ratio < 1.9 || ratio > 2.1) {
    throw new Error(
      `This photo is ${img.naturalWidth}×${img.naturalHeight}. A 360° photo must be twice as wide as it is tall ` +
        '(equirectangular): export it that way from the 360° camera or panorama app.'
    )
  }
  if (img.naturalWidth < MIN_WIDTH) {
    throw new Error(`This photo is too small for a 360° view: it needs to be at least ${MIN_WIDTH} px wide.`)
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'panorama'
  for (const width of WIDTHS.map((w) => Math.min(w, img.naturalWidth)).filter((w, i, all) => all.indexOf(w) === i)) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.round(width / 2)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser cannot prepare the photo.')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    for (const quality of QUALITIES) {
      const blob = await toJpeg(canvas, quality)
      if (blob.size <= PANORAMA_MAX_BYTES) return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
    }
  }
  throw new Error('This photo could not be made small enough to upload.')
}

type StoredPanorama = Pick<HotelPanorama, 'id' | 'image_url' | 'title' | 'display_order'>

/** One 360° photo as the hotel page lists it */
export interface PanoramaView {
  id: string
  image_url: string
  /** e.g. "Pool deck" or "Deluxe Room · Balcony" */
  label: string
}

const byOrder = (a: StoredPanorama, b: StoredPanorama) => a.display_order - b.display_order

/** All of a hotel's 360° photos in order: the property's own, then each room type's */
export function hotelPanoramaViews(
  hotelPanoramas: StoredPanorama[] | undefined,
  roomTypes: { name: string; room_type_panoramas?: StoredPanorama[] }[] | undefined
): PanoramaView[] {
  const own = [...(hotelPanoramas ?? [])].sort(byOrder)
  return [
    ...own.map((p, i) => ({
      id: p.id,
      image_url: p.image_url,
      label: p.title || (own.length > 1 ? `Property ${i + 1}` : 'Property'),
    })),
    ...(roomTypes ?? []).flatMap((room) =>
      [...(room.room_type_panoramas ?? [])].sort(byOrder).map((p) => ({
        id: p.id,
        image_url: p.image_url,
        label: p.title ? `${room.name} · ${p.title}` : room.name,
      }))
    ),
  ]
}
