import { createClient } from '@/lib/db/server'
import { bunnyObjectPathFromUrl } from '@/lib/bunny/storage'
import { objectPathFromUrl } from '@/lib/firebase/storage'

/** Top-level storage folders, in Bunny Storage or the Firebase bucket (the former Supabase bucket names) */
export const STORAGE_BUCKETS = {
  HOTEL_IMAGES: 'hotel-images',
  ROOM_IMAGES: 'room-images',
  BOAT_IMAGES: 'boat-images',
  TRIP_IMAGES: 'trip-images',
  REVIEW_IMAGES: 'review-images',
  PROFILE_IMAGES: 'profile-images',
} as const

/**
 * Upload an image to storage (Bunny when configured, else Firebase)
 */
export async function uploadImage(
  file: File,
  bucket: string,
  path: string
): Promise<{ url: string; path: string } | null> {
  try {
    const db = await createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${path}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload file
    const { data, error } = await db.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = db.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      url: publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

/**
 * Delete an image from storage
 */
export async function deleteImage(
  bucket: string,
  path: string
): Promise<boolean> {
  try {
    const db = await createClient()

    const { error } = await db.storage.from(bucket).remove([path])

    if (error) {
      console.error('Storage delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean
  error?: string
} {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    }
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 5MB. Please choose a smaller image.',
    }
  }

  return { valid: true }
}

/**
 * Extract the path inside a storage folder from a public image URL
 */
export function extractStoragePath(url: string, bucket: string): string | null {
  try {
    // <BUNNY_CDN_URL>/<folder>/<path>
    const bunnyPath = bunnyObjectPathFromUrl(url, bucket)
    if (bunnyPath) return bunnyPath

    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<folder>%2F<path>?alt=media
    const firebasePath = objectPathFromUrl(url, bucket)
    if (firebasePath) return firebasePath

    // Legacy Supabase URL: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const pattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)`)
    const match = url.match(pattern)
    return match ? match[1] : null
  } catch (error) {
    return null
  }
}
