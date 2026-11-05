import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import {
  applyEmailVerificationCode,
  signInWithCustomToken,
  verifyPasswordResetCode,
} from '@/lib/firebase/auth/identity'
import { PASSWORD_RESET_COOKIE, startSession } from '@/lib/firebase/auth/session'
import { getAuthUserByEmail, recordEmailConfirmed } from '@/lib/firebase/auth/users'

/**
 * Landing route for the links in auth emails (lib/firebase/auth/emails.ts):
 *   ?mode=verifyEmail&oobCode=…   confirms the address and signs the user in
 *   ?mode=resetPassword&oobCode=… checks the code and continues to /auth/reset-password
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params
  const { searchParams, origin } = request.nextUrl
  const next = searchParams.get('next') ?? '/bookings'
  const redirectPath = `/${locale}${next.startsWith('/') ? next : `/${next}`}`

  const mode = searchParams.get('mode')
  const oobCode = searchParams.get('oobCode')

  if (oobCode && mode === 'verifyEmail') {
    try {
      const { email } = await applyEmailVerificationCode(oobCode)
      const user = await getAuthUserByEmail(email)
      if (user) {
        await recordEmailConfirmed(user.id)
        // Sign the user in, as the Supabase confirmation link did
        const { idToken } = await signInWithCustomToken(await adminAuth().createCustomToken(user.id))
        await startSession(idToken, user.id)
        return NextResponse.redirect(new URL(redirectPath, origin))
      }
    } catch (err) {
      console.error('auth/callback verifyEmail failed:', err)
    }
  }

  if (oobCode && mode === 'resetPassword') {
    try {
      await verifyPasswordResetCode(oobCode)
      const cookieStore = await cookies()
      cookieStore.set(PASSWORD_RESET_COOKIE, oobCode, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      })
      return NextResponse.redirect(new URL(`/${locale}/auth/reset-password`, origin))
    } catch (err) {
      console.error('auth/callback resetPassword failed:', err)
    }
  }

  return NextResponse.redirect(
    new URL(`/${locale}/auth/login?error=auth_callback_failed`, origin)
  )
}
