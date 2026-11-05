/**
 * The `db.storage` facade on Firebase Storage. The old Supabase buckets (hotel-images,
 * room-images, boat-images, trip-images, blog-images, review-images, profile-images) are
 * top-level folders in the project's default bucket; storage.rules makes them publicly
 * readable and closed to direct client writes, so uploads go through server code.
 *
 * With the BUNNY_STORAGE_* env set (lib/bunny/config.ts), new uploads go to Bunny Storage and
 * are served from its CDN instead, under the same folder/path layout. Removal tries both, so
 * images uploaded before the switch are cleaned up too.
 */
import { adminBucket, storageBucketName } from '@/lib/firebase/admin'
import { bunnyStorageConfig } from '@/lib/bunny/config'
import { bunnyPublicUrl, bunnyRemove, bunnyUpload } from '@/lib/bunny/storage'

type UploadBody = Blob | ArrayBuffer | ArrayBufferView | Buffer | string

export interface StorageError {
  message: string
  statusCode: string
}

/** Public download URL for an object path such as 'hotel-images/<hotelId>/<file>.webp' */
export function publicUrlFor(objectPath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucketName()}/o/${encodeURIComponent(objectPath)}?alt=media`
}

/**
 * Inverse of publicUrlFor for a given folder (bucket): returns the path inside the folder,
 * or null if the URL is not one of ours.
 */
export function objectPathFromUrl(url: string, bucket: string): string | null {
  const match = url.match(/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/)
  if (!match) return null
  const objectPath = decodeURIComponent(match[1])
  const prefix = `${bucket}/`
  return objectPath.startsWith(prefix) ? objectPath.slice(prefix.length) : null
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
}

async function toBuffer(body: UploadBody): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body
  if (typeof body === 'string') return Buffer.from(body)
  if (body instanceof ArrayBuffer) return Buffer.from(body)
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength)
  return Buffer.from(await (body as Blob).arrayBuffer())
}

function storageError(err: unknown): StorageError {
  const code = (err as any)?.code
  if (code === 412) return { message: 'The resource already exists', statusCode: '409' }
  if (code === 404) return { message: 'Object not found', statusCode: '404' }
  return { message: err instanceof Error ? err.message : 'Storage error', statusCode: String(code ?? 500) }
}

function bucketApi(bucket: string) {
  const objectName = (path: string) => `${bucket}/${path.replace(/^\/+/, '')}`

  return {
    async upload(
      path: string,
      body: UploadBody,
      options: { contentType?: string; upsert?: boolean; cacheControl?: string } = {}
    ): Promise<
      | { data: { id: string; path: string; fullPath: string }; error: null }
      | { data: null; error: StorageError }
    > {
      const name = objectName(path)
      const extension = path.split('.').pop()?.toLowerCase() ?? ''
      const contentType =
        options.contentType ||
        (typeof Blob !== 'undefined' && body instanceof Blob && body.type) ||
        CONTENT_TYPES[extension] ||
        'application/octet-stream'
      try {
        const bunny = bunnyStorageConfig()
        if (bunny) {
          await bunnyUpload(bunny, name, await toBuffer(body))
          return { data: { id: name, path, fullPath: name }, error: null }
        }

        await adminBucket()
          .file(name)
          .save(await toBuffer(body), {
            resumable: false,
            contentType,
            metadata: { cacheControl: `public, max-age=${options.cacheControl ?? '3600'}` },
            // Without upsert, fail if the object already exists (Supabase default)
            preconditionOpts: options.upsert ? undefined : { ifGenerationMatch: 0 },
          })
        return { data: { id: name, path, fullPath: name }, error: null }
      } catch (err) {
        return { data: null, error: storageError(err) }
      }
    },

    getPublicUrl(path: string): { data: { publicUrl: string } } {
      const bunny = bunnyStorageConfig()
      const name = objectName(path)
      return { data: { publicUrl: bunny ? bunnyPublicUrl(bunny, name) : publicUrlFor(name) } }
    },

    async remove(
      paths: string[]
    ): Promise<{ data: { name: string }[]; error: null } | { data: null; error: StorageError }> {
      try {
        const bunny = bunnyStorageConfig()
        if (bunny) {
          await Promise.all(paths.map((p) => bunnyRemove(bunny, objectName(p))))
          // Older uploads still live in Firebase Storage: best effort there
          await Promise.allSettled(
            paths.map((p) => adminBucket().file(objectName(p)).delete({ ignoreNotFound: true }))
          )
          return { data: paths.map((name) => ({ name })), error: null }
        }

        await Promise.all(paths.map((p) => adminBucket().file(objectName(p)).delete({ ignoreNotFound: true })))
        return { data: paths.map((name) => ({ name })), error: null }
      } catch (err) {
        return { data: null, error: storageError(err) }
      }
    },
  }
}

export function createStorageApi() {
  return { from: bucketApi }
}

export type StorageApi = ReturnType<typeof createStorageApi>
