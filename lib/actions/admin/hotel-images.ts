'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { STORAGE_BUCKETS, extractStoragePath } from '@/lib/utils/storage'
import { requireHotelAdminPermission } from './_helpers'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { serverLog } from '@/lib/utils/server-log'

/**
 * Add hotel image (from URL)
 */
export async function addHotelImage(
  hotelId: string,
  imageUrl: string,
  altText?: string,
  displayOrder?: number
) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('images')
    const db = await createClient()

    const { data, error } = await db
      .from('hotel_images')
      .insert({
        hotel_id: hotelId,
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
    revalidatePath(`/hotels`)

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    serverLog.error('Error adding hotel image:', error)
    return {
      success: false,
      error: error.message || 'Failed to add image',
    }
  }
}

/**
 * Upload hotel image (from file)
 */
export async function uploadHotelImage(
  hotelId: string,
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
    const fileName = `${hotelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload to storage (Bunny CDN when configured, else Firebase)
    const { data: uploadData, error: uploadError } = await db.storage
      .from(STORAGE_BUCKETS.HOTEL_IMAGES)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = db.storage
      .from(STORAGE_BUCKETS.HOTEL_IMAGES)
      .getPublicUrl(uploadData.path)

    // Save to database
    const { data, error } = await db
      .from('hotel_images')
      .insert({
        hotel_id: hotelId,
        image_url: publicUrl,
        storage_path: uploadData.path,
        alt_text: altText || '',
        display_order: displayOrder ? parseInt(displayOrder) : 0,
      })
      .select()
      .single()

    if (error) {
      // Cleanup uploaded file if database insert fails
      await db.storage.from(STORAGE_BUCKETS.HOTEL_IMAGES).remove([uploadData.path])
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`/hotels`)

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    serverLog.error('Error uploading hotel image:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    }
  }
}

/**
 * Delete hotel image
 */
export async function deleteHotelImage(imageId: string) {
  try {
    await requireAdmin()
    await requireHotelAdminPermission('images')
    const db = await createClient()

    // Get image details first to delete from storage
    const { data: image } = await db
      .from('hotel_images')
      .select('storage_path, image_url')
      .eq('id', imageId)
      .single()

    // Delete from database
    const { error } = await db
      .from('hotel_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      throw new Error(error.message)
    }

    // Delete from storage if storage_path exists
    if (image?.storage_path) {
      await db.storage.from(STORAGE_BUCKETS.HOTEL_IMAGES).remove([image.storage_path])
    } else if (image?.image_url) {
      // Try to extract path from URL for old images
      const path = extractStoragePath(image.image_url, STORAGE_BUCKETS.HOTEL_IMAGES)
      if (path) {
        await db.storage.from(STORAGE_BUCKETS.HOTEL_IMAGES).remove([path])
      }
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath(`/hotels`)

    return {
      success: true,
    }
  } catch (error: any) {
    serverLog.error('Error deleting hotel image:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete image',
    }
  }
}
