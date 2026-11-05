'use client'

/**
 * Browser Firebase Auth, used only to run the Google popup and the SMS-code flow. The ID
 * token it yields is handed to the signInWithProvider server action, which sets the httpOnly
 * session cookie; the browser SDK keeps nothing (in-memory persistence), so the server
 * session stays the single source of truth.
 */
import { getApp, getApps, initializeApp } from 'firebase/app'
import { browserPopupRedirectResolver, inMemoryPersistence, initializeAuth, type Auth } from 'firebase/auth'

let auth: Auth | null = null

export function clientAuth(): Auth {
  if (auth) return auth
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      })
  auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  })
  auth.useDeviceLanguage()
  return auth
}

/** User-facing message for a Firebase client auth error */
export function clientAuthErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : ''
  // The friendly messages below hide which Firebase error it was; keep that visible while developing
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[auth]', code || err)
    // Firebase rejects SMS to real numbers from http://localhost (test numbers still work)
    if (code === 'auth/invalid-app-credential' && location.hostname === 'localhost') {
      console.warn('[auth] Real-number SMS fails on localhost: open http://127.0.0.1:3000 instead (127.0.0.1 must be a Firebase authorized domain) or use a test number')
    }
  }
  switch (code) {
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Please allow pop-ups and try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email. Please sign in with your email and password.'
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return 'Please enter a valid mobile number.'
    case 'auth/invalid-verification-code':
      return 'That code is incorrect. Please check the SMS and try again.'
    case 'auth/code-expired':
      return 'This code has expired. Please request a new one.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/quota-exceeded':
      return 'We can’t send more codes right now. Please try again later or use email.'
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return 'Security check failed. Please refresh the page and try again.'
    case 'auth/operation-not-allowed':
    case 'auth/billing-not-enabled':
      return 'This sign-in option isn’t available yet. Please use email for now.'
    case 'auth/unauthorized-domain':
      return 'Sign-in isn’t enabled for this website address yet.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
