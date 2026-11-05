/**
 * Deploy check: GET /api/health says whether the server can load the Firebase SDK and read
 * Firestore, on which Node version, and which required environment variables are missing (names
 * only, never values). 200 when everything works, 503 otherwise.
 *
 * The data layer is imported inside the handler so a module that fails to load (e.g. a
 * dependency the host's Node version can't require) shows up here as an error message instead of
 * Next's blank 500 page.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REQUIRED_ENV = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
]

const hasFirebaseCredentials = () =>
  !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
  !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)

const message = (error: unknown) => String((error as Error)?.message ?? error).split('\n')[0].slice(0, 300)

export async function GET() {
  const checks: Record<string, string> = {}

  try {
    await import('@/lib/db/server')
    checks.serverModules = 'ok'
  } catch (error) {
    checks.serverModules = `failed: ${message(error)}`
  }

  try {
    const { adminFirestore } = await import('@/lib/firebase/admin')
    await adminFirestore().collection('hotels').limit(1).get()
    checks.firestore = 'ok'
  } catch (error) {
    checks.firestore = `failed: ${message(error)}`
  }

  const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name])
  if (!hasFirebaseCredentials()) missingEnv.unshift('FIREBASE_SERVICE_ACCOUNT_KEY (or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)')

  const ok = Object.values(checks).every((v) => v === 'ok') && missingEnv.length === 0
  return NextResponse.json(
    { ok, node: process.version, checks, missingEnv },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
