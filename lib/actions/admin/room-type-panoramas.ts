'use server'

/**
 * 360° panoramas of a room type (room_type_panoramas). Same flow as the hotel's
 * (hotel-panoramas.ts): the browser shrinks the photo first, the file is stored under
 * room-images/<roomTypeId>/360/.
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { STORAGE_BUCKETS, extractStoragePath } from '@/lib/utils/storage'
import { PANORAMA_MAX_BYTES, PANORAMA_TYPES } from '@/lib/utils/panorama'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { requireHotelAdminPermission, verifyHotelAccess } from './_helpers'
import { serverLog } from '@/lib/utils/server-log'

type Db = Awaited<ReturnType<typeof createClient>>

/** Throws unless the room type exists and the admin manages its hotel */
async function verifyRoomTypeAccess(db: Db, roomTypeId: string) {
  const { data: roomType } = await db.from('room_types').select('hotel_id').eq('id', roomTypeId).maybeSingle()
  if (!roomType) throw new Error('Room type not found')
  await verifyHotelAccess(roomType.hotel_id)
}

export async function uploadRoomTypePanorama(roomTypeId: string, formData: FormData) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('images')
    const db = await createClient()
    await verifyRoomTypeAccess(db, roomTypeId)

    const file = formData.get('file')
    const title = String(formData.get('title') ?? '').trim()
    if (!(file instanceof File)) throw new Error('No file provided')
    if (!PANORAMA_TYPES.includes(file.type)) throw new Error('360° photos must be JPEG, PNG or WebP')
    if (file.size > PANORAMA_MAX_BYTES) throw new Error('The 360° photo is too large after resizing')

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const fileName = `${roomTypeId}/360/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const bucket = db.storage.from(STORAGE_BUCKETS.ROOM_IMAGES)
    const { data: uploadData, error: uploadError } = await bucket.upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { count } = await db
      .from('room_type_panoramas')
      .select('id', { count: 'exact', head: true })
      .eq('room_type_id', roomTypeId)

    const { data, error } = await db
      .from('room_type_panoramas')
      .insert({
        room_type_id: roomTypeId,
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
    serverLog.error('Error uploading room type panorama:', error)
    return { success: false, error: error.message || 'Failed to upload 360° photo' }
  }
}

export async function deleteRoomTypePanorama(panoramaId: string) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('images')
    const db = await createClient()

    const { data: panorama } = await db
      .from('room_type_panoramas')
      .select('room_type_id, storage_path, image_url')
      .eq('id', panoramaId)
      .maybeSingle()
    if (!panorama) throw new Error('360° photo not found')
    await verifyRoomTypeAccess(db, panorama.room_type_id)

    const { error } = await db.from('room_type_panoramas').delete().eq('id', panoramaId)
    if (error) throw new Error(error.message)

    const path =
      panorama.storage_path || extractStoragePath(panorama.image_url, STORAGE_BUCKETS.ROOM_IMAGES)
    if (path) await db.storage.from(STORAGE_BUCKETS.ROOM_IMAGES).remove([path])

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`/hotels`)
    return { success: true }
  } catch (error: any) {
    serverLog.error('Error deleting room type panorama:', error)
    return { success: false, error: error.message || 'Failed to delete 360° photo' }
  }
}
