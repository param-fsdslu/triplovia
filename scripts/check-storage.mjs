/** Read-only storage diagnostics. Run: node --env-file=.env scripts/check-storage.mjs */
import { cert, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

const zone = process.env.BUNNY_STORAGE_ZONE?.trim()
const password = process.env.BUNNY_STORAGE_PASSWORD?.trim()
const cdn = process.env.BUNNY_CDN_URL?.trim()
const region = process.env.BUNNY_STORAGE_REGION?.trim().toLowerCase()
const bunnyReady = Boolean(zone && password && cdn)
const summary = {
  readOnly: true,
  uploadBackend: bunnyReady ? 'Bunny Storage' : 'Firebase Storage',
  bunny: { configured: bunnyReady },
  firebase: {},
}

if (bunnyReady) {
  const host = !region || region === 'de' ? 'storage.bunnycdn.com' : `${region}.storage.bunnycdn.com`
  try {
    const response = await fetch(`https://${host}/${encodeURIComponent(zone)}/`, {
      headers: { AccessKey: password },
      signal: AbortSignal.timeout(20000),
    })
    summary.bunny = { configured: true, host, status: response.status, accessible: response.ok }
    await response.body?.cancel()
  } catch (error) {
    summary.bunny = { configured: true, host, accessible: false, error: error.message }
  }
}

const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
if (bucket) {
  let app
  try {
    const service = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : null
    const credential = service
      ? cert({ projectId: service.project_id, clientEmail: service.client_email, privateKey: service.private_key.replace(/\\n/g, '\n') })
      : cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') })
    app = initializeApp({ credential })
    await getStorage(app).bucket(bucket).getMetadata()
    summary.firebase = { bucket, accessible: true }
  } catch (error) {
    summary.firebase = { bucket, accessible: false, status: error.code ?? null, error: error.message }
  } finally {
    await app?.delete()
  }
} else {
  summary.firebase = { configured: false }
}

console.log(JSON.stringify(summary, null, 2))
