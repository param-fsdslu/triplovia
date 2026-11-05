'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { STORAGE_BUCKETS, extractStoragePath } from '@/lib/utils/storage'
import { requireHotelAdminPermission } from './_helpers'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Add room type image (from URL)
 */
export async function addRoomTypeImage(
  roomTypeId: string,
  imageUrl: string,
  altText?: string,
  displayOrder?: number
) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('images')
    const db = await createClient()

    const { data, error } = await db
      .from('room_type_images')
      .insert({
        room_type_id: roomTypeId,
        image_url: imageUrl,
        alt_text: altText || '',
        display_order: displayOrder || 0,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    serverLog.error('Error adding room type image:', error)
    return {
      success: false,
      error: error.message || 'Failed to add image',
    }
  }
}

/**
 * Upload room type image (from file)
 */
export async function uploadRoomTypeImage(
  roomTypeId: string,
  formData: FormData
) {
  try {
    await requireAdmin()
    const db = await createClient()

    const file = formData.get('file') as File
    const altText = formData.get('altText') as string
    const displayOrder = formData.get('displayOrder') as string

    if (!file) {
      throw new Error('No file provided')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${roomTypeId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload to storage (Bunny CDN when configured, else Firebase)
    const { data: uploadData, error: uploadError } = await db.storage
      .from(STORAGE_BUCKETS.ROOM_IMAGES)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = db.storage
      .from(STORAGE_BUCKETS.ROOM_IMAGES)
      .getPublicUrl(uploadData.path)

    // Save to database
    const { data, error } = await db
      .from('room_type_images')
      .insert({
        room_type_id: roomTypeId,
        image_url: publicUrl,
        storage_path: uploadData.path,
        alt_text: altText || '',
        display_order: displayOrder ? parseInt(displayOrder) : 0,
      })
      .select()
      .single()

    if (error) {
      // Cleanup uploaded file if database insert fails
      await db.storage.from(STORAGE_BUCKETS.ROOM_IMAGES).remove([uploadData.path])
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    serverLog.error('Error uploading room type image:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    }
  }
}

/**
 * Delete room type image
 */
export async function deleteRoomTypeImage(imageId: string) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('images')
    const db = await createClient()

    // Get image details first to delete from storage
    const { data: image } = await db
      .from('room_type_images')
      .select('storage_path, image_url')
      .eq('id', imageId)
      .single()

    // Delete from database
    const { error } = await db
      .from('room_type_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      throw new Error(error.message)
    }

    // Delete from storage if storage_path exists
    if (image?.storage_path) {
      await db.storage.from(STORAGE_BUCKETS.ROOM_IMAGES).remove([image.storage_path])
    } else if (image?.image_url) {
      // Try to extract path from URL for old images
      const path = extractStoragePath(image.image_url, STORAGE_BUCKETS.ROOM_IMAGES)
      if (path) {
        await db.storage.from(STORAGE_BUCKETS.ROOM_IMAGES).remove([path])
      }
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error deleting room type image:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete image',
    }
  }
}
