/**
 * bunny.net settings. Server code only (scripts too, hence no 'server-only' import): the
 * storage password must never reach the browser.
 *
 *   BUNNY_STORAGE_ZONE      storage zone name (images)
 *   BUNNY_STORAGE_PASSWORD  storage zone → FTP & API Access → Password (not the read-only one)
 *   BUNNY_STORAGE_REGION    primary region code: empty for Frankfurt, else ny, la, sg, syd, uk, se, br, jh
 *   BUNNY_CDN_URL           pull zone in front of the storage zone, e.g. https://triplovia.b-cdn.net
 *
 * Read on each call so scripts that load the env late still see it.
 */

export interface BunnyStorageConfig {
  zone: string
  password: string
  host: string
  cdnUrl: string
}

/** Firebase is used only when Bunny has not been configured at all. */
export function bunnyStorageConfig(): BunnyStorageConfig | null {
  const zone = process.env.BUNNY_STORAGE_ZONE?.trim()
  const password = process.env.BUNNY_STORAGE_PASSWORD?.trim()
  const cdnUrl = process.env.BUNNY_CDN_URL?.trim().replace(/\/+$/, '')
  if (!zone && !password && !cdnUrl) return null
  if (!zone || !password || !cdnUrl) {
    const missing = [
      !zone && 'BUNNY_STORAGE_ZONE',
      !password && 'BUNNY_STORAGE_PASSWORD',
      !cdnUrl && 'BUNNY_CDN_URL',
    ].filter(Boolean)
    throw new Error(
      `Image storage is not fully configured. Set ${missing.join(', ')} in the server environment ` +
      '(Netlify: include Functions scope), then redeploy.'
    )
  }

  const region = (process.env.BUNNY_STORAGE_REGION ?? '').trim().toLowerCase()
  const host = !region || region === 'de' ? 'storage.bunnycdn.com' : `${region}.storage.bunnycdn.com`
  return { zone, password, host, cdnUrl: /^https?:\/\//.test(cdnUrl) ? cdnUrl : `https://${cdnUrl}` }
}
