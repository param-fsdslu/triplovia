/**
 * Auth emails. Firebase generates the one-time action codes; we send them through Resend
 * (same sender and styling as the booking emails) with links to our own /auth/callback,
 * which consumes the code (see app/[locale]/auth/callback/route.ts).
 */
import { adminAuth } from '@/lib/firebase/admin'
import { emailService } from '@/lib/services/email.service'

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function callbackUrl(locale: string, mode: 'verifyEmail' | 'resetPassword', firebaseLink: string) {
  const oobCode = new URL(firebaseLink).searchParams.get('oobCode')
  if (!oobCode) throw new Error('Firebase action link did not contain an oobCode')
  const params = new URLSearchParams({ mode, oobCode })
  return `${siteUrl()}/${locale}/auth/callback?${params.toString()}`
}

export async function sendVerificationEmail(email: string, options: { locale?: string; name?: string | null } = {}) {
  const link = await adminAuth().generateEmailVerificationLink(email)
  return emailService.sendEmailVerification({
    to: email,
    name: options.name,
    actionUrl: callbackUrl(options.locale ?? 'en', 'verifyEmail', link),
  })
}

/** Sends a reset link. Unknown emails succeed silently so the form can't be used to probe accounts. */
export async function sendPasswordResetEmail(email: string, options: { locale?: string } = {}) {
  let link: string
  try {
    link = await adminAuth().generatePasswordResetLink(email)
  } catch (err) {
    if ((err as any)?.code === 'auth/user-not-found' || (err as any)?.code === 'auth/email-not-found') {
      return { success: true }
    }
    throw err
  }
  return emailService.sendPasswordReset({ to: email, actionUrl: callbackUrl(options.locale ?? 'en', 'resetPassword', link) })
}
