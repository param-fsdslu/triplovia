/**
 * Firebase Admin SDK setup (server only).
 *
 * Credentials, in order of preference:
 *   1. FIREBASE_SERVICE_ACCOUNT_KEY — the service-account JSON (one line)
 *   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   3. Emulators (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST) need only a project id
 */
import { cert, getApp, getApps, initializeApp, type App, type Credential } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

export function firebaseProjectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
}

export function storageBucketName(): string {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!bucket) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured')
  return bucket
}

function credential(): Credential | undefined {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (json) {
    const parsed = JSON.parse(json)
    return cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
    })
  }

  const projectId = firebaseProjectId()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (projectId && clientEmail && privateKey) return cert({ projectId, clientEmail, privateKey })

  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) return undefined

  throw new Error(
    'Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_KEY, or ' +
      'FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (Firebase console → ' +
      'Project settings → Service accounts → Generate new private key).'
  )
}

export function firebaseApp(): App {
  if (getApps().length > 0) return getApp()
  return initializeApp({
    credential: credential(),
    projectId: firebaseProjectId(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

export function adminAuth(): Auth {
  return getAuth(firebaseApp())
}

// settings() may only run once per Firestore instance; keep the flag on globalThis so
// dev-server module reloads don't call it again.
const globalForFirestore = globalThis as unknown as { __firestoreConfigured?: boolean }

export function adminFirestore(): Firestore {
  const db = getFirestore(firebaseApp())
  if (!globalForFirestore.__firestoreConfigured) {
    db.settings({ ignoreUndefinedProperties: true })
    globalForFirestore.__firestoreConfigured = true
  }
  return db
}

export function adminBucket() {
  return getStorage(firebaseApp()).bucket(storageBucketName())
}
