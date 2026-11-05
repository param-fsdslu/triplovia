import imageCompression from 'browser-image-compression'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp' as const,
}

/**
 * Compress an image file client-side before uploading.
 * Outputs WebP at max 800KB, max 1200px width/height.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip compression if already small enough
  if (file.size <= COMPRESSION_OPTIONS.maxSizeMB * 1024 * 1024) {
    return file
  }

  const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
  return compressed
}
