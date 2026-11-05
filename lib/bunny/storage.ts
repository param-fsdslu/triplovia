/**
 * Bunny Storage behind the `db.storage` facade (lib/firebase/storage.ts): objects go to the
 * storage zone over its HTTP API and are served from the pull zone (BUNNY_CDN_URL). Object
 * paths keep the Firebase layout, '<folder>/<path inside the folder>'.
 *
 * Bunny overwrites an existing object on upload; callers name files uniquely (timestamp + random).
 */
import { bunnyStorageConfig, type BunnyStorageConfig } from './config'

const encodePath = (objectPath: string) => objectPath.split('/').map(encodeURIComponent).join('/')

function apiUrl(config: BunnyStorageConfig, objectPath: string): string {
  return `https://${config.host}/${config.zone}/${encodePath(objectPath)}`
}

export async function bunnyUpload(config: BunnyStorageConfig, objectPath: string, body: Buffer): Promise<void> {
  const res = await fetch(apiUrl(config, objectPath), {
    method: 'PUT',
    headers: { AccessKey: config.password, 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(body),
  })
  if (res.status !== 201) {
    throw new Error(`Bunny Storage upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
  }
}

/** Deletes one object; a missing object is not an error */
export async function bunnyRemove(config: BunnyStorageConfig, objectPath: string): Promise<void> {
  const res = await fetch(apiUrl(config, objectPath), {
    method: 'DELETE',
    headers: { AccessKey: config.password },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Bunny Storage delete failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
  }
}

export function bunnyPublicUrl(config: BunnyStorageConfig, objectPath: string): string {
  return `${config.cdnUrl}/${encodePath(objectPath)}`
}

/**
 * Inverse of bunnyPublicUrl for one folder (bucket): the path inside the folder, or null if the
 * URL is not one of ours.
 */
export function bunnyObjectPathFromUrl(url: string, bucket: string): string | null {
  const config = bunnyStorageConfig()
  if (!config || !url.startsWith(`${config.cdnUrl}/`)) return null
  const objectPath = decodeURIComponent(url.slice(config.cdnUrl.length + 1).split(/[?#]/)[0])
  return objectPath.startsWith(`${bucket}/`) ? objectPath.slice(bucket.length + 1) : null
}
