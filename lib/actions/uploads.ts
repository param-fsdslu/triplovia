'use server'

/**
 * Image uploads from client components (profile photos, review photos). Storage is
 * closed to direct browser writes, so files are posted here, validated, and stored under
 * the signed-in user's folder.
 */
import { createClient } from '@/lib/db/server'
import { STORAGE_BUCKETS, validateImageFile } from '@/lib/utils/storage'
import { serverLog } from '@/lib/utils/server-log'

const USER_UPLOAD_FOLDERS = [STORAGE_BUCKETS.PROFILE_IMAGES, STORAGE_BUCKETS.REVIEW_IMAGES] as const
type UserUploadFolder = (typeof USER_UPLOAD_FOLDERS)[number]

/** Expects FormData with a `file` field; returns the public URL of the stored image */
export async function uploadUserImage(
  folder: UserUploadFolder,
  formData: FormData
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  if (!USER_UPLOAD_FOLDERS.includes(folder)) return { error: 'Invalid upload folder' }

  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return { error: 'You must be logged in' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'No file provided' }

  const validation = validateImageFile(file)
  if (!validation.valid) return { error: validation.error ?? 'Invalid image' }

  const ext = file.name.split('.').pop() || 'webp'
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

  const { data, error } = await db.storage
    .from(folder)
    .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (error || !data) {
    serverLog.error('uploadUserImage error:', error)
    return { error: 'Failed to upload image' }
  }

  return { url: db.storage.from(folder).getPublicUrl(data.path).data.publicUrl }
}
