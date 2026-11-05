'use server'

/**
 * 360° panoramas of a hotel (hotel_panoramas). The browser shrinks the photo first
 * (lib/utils/panorama.ts) so it fits the server action body limit; the file is stored under
 * hotel-images/<hotelId>/360/.
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { STORAGE_BUCKETS, extractStoragePath } from '@/lib/utils/storage'
import { PANORAMA_MAX_BYTES, PANORAMA_TYPES } from '@/lib/utils/panorama'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { requireHotelAdminPermission, verifyHotelAccess } from './_helpers'
import { serverLog } from '@/lib/utils/server-log'

export async function uploadHotelPanorama(hotelId: string, formData: FormData) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('images')
    await verifyHotelAccess(hotelId)
    const db = await createClient()

    const file = formData.get('file')
    const title = String(formData.get('title') ?? '').trim()
    if (!(file instanceof File)) throw new Error('No file provided')
    if (!PANORAMA_TYPES.includes(file.type)) throw new Error('360° photos must be JPEG, PNG or WebP')
    if (file.size > PANORAMA_MAX_BYTES) throw new Error('The 360° photo is too large after resizing')

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const fileName = `${hotelId}/360/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const bucket = db.storage.from(STORAGE_BUCKETS.HOTEL_IMAGES)
    const { data: uploadData, error: uploadError } = await bucket.upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { count } = await db
      .from('hotel_panoramas')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)

    const { data, error } = await db
      .from('hotel_panoramas')
      .insert({
        hotel_id: hotelId,
        image_url: bucket.getPublicUrl(uploadData.path).data.publicUrl,
        storage_path: uploadData.path,
        title: title || null,
        display_order: count ?? 0,
      })
      .select()
      .single()

    if (error) {
      await bucket.remove([uploadData.path])
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`/hotels`)
    return { success: true, data }
  } catch (error: any) {
    serverLog.error('Error uploading hotel panorama:', error)
    return { success: false, error: error.message || 'Failed to upload 360° photo' }
  }
}

export async function deleteHotelPanorama(panoramaId: string) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('images')
    const db = await createClient()

    const { data: panorama } = await db
      .from('hotel_panoramas')
      .select('hotel_id, storage_path, image_url')
      .eq('id', panoramaId)
      .maybeSingle()
    if (!panorama) throw new Error('360° photo not found')
    await verifyHotelAccess(panorama.hotel_id)

    const { error } = await db.from('hotel_panoramas').delete().eq('id', panoramaId)
    if (error) throw new Error(error.message)

    const path =
      panorama.storage_path || extractStoragePath(panorama.image_url, STORAGE_BUCKETS.HOTEL_IMAGES)
    if (path) await db.storage.from(STORAGE_BUCKETS.HOTEL_IMAGES).remove([path])

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`/hotels`)
    return { success: true }
  } catch (error: any) {
    serverLog.error('Error deleting hotel panorama:', error)
    return { success: false, error: error.message || 'Failed to delete 360° photo' }
  }
}
