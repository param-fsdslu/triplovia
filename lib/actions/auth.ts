'use server'

/**
 * Auth server actions — Firebase Authentication behind Next.js form submissions.
 *
 * All functions follow the React useActionState pattern: they accept
 * (prevState, formData) and return { success, error?, redirectTo? }.
 * Redirect after login/logout is done client-side (using the redirectTo field)
 * or via next/navigation redirect() for server-initiated flows.
 *
 * Sessions are httpOnly Firebase session cookies (lib/firebase/auth/session.ts).
 * User metadata (first_name, last_name, full_name, phone) is stored in the auth_users
 * collection and mirrored to the profiles table (lib/firebase/auth/users.ts).
 *
 * Google and mobile-number (SMS code) sign-in run in the browser with the Firebase SDK;
 * signInWithProvider exchanges the resulting ID token for the same session cookie.
 */
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/firebase/admin'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/firebase/auth/emails'
import {
  confirmPasswordReset,
  identityErrorMessage,
  signInWithPassword,
} from '@/lib/firebase/auth/identity'
import { endSession, getSessionUser, PASSWORD_RESET_COOKIE, startSession } from '@/lib/firebase/auth/session'
import {
  createAuthUser,
  fillMissingUserDetails,
  getAuthUserByEmail,
  getAuthUserById,
  updateAuthUser,
  upsertFederatedUser,
} from '@/lib/firebase/auth/users'
import type { AuthUser } from '@/lib/firebase/auth/types'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { normalizePhone } from '@/lib/utils/phone'
import { getAdminRole } from '@/lib/utils/roles'
import { safeRedirectPath } from '@/lib/utils/safe-redirect'
import { claimGuestRecords } from '@/lib/services/guest-checkout.service'
import { serverLog } from '@/lib/utils/server-log'
import { logActivity } from '@/lib/services/activity-log.service'
import { accountLabel } from '@/lib/utils/account-label'

import { phoneFromProof, verifiedProfilePhone } from '@/lib/firebase/auth/phone-proof'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Signs in with email + password. On success, revalidates layout cache and
 * returns redirectTo so the client can navigate without a full page reload.
 * Accepts an optional `redirect` FormData field to redirect elsewhere (e.g. after
 * a login-gated action).
 */
export async function signIn(
  prevState: { error?: string; success?: boolean; redirectTo?: string } | null,
  formData: FormData
): Promise<ProviderSignInResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirect') as string

  let session: { idToken: string; localId: string }
  try {
    session = await signInWithPassword(email, password)
  } catch (err) {
    return { error: identityErrorMessage(err) }
  }

  // Accounts must confirm their email first (same rule as before the move to Firebase)
  const user = await getAuthUserById(session.localId)
  if (!user?.email_confirmed_at) {
    return { error: 'Please confirm your email first. Check your inbox for the verification link.' }
  }

  await startSession(session.idToken, session.localId)
  revalidatePath('/', 'layout')

  // Return success with redirect URL for client-side navigation
  await claimGuestRecords(user.id, verifiedProfilePhone(user.user_metadata))
  return { success: true, redirectTo: safeRedirectPath(redirectTo), ...profileOf(user) }
}

/**
 * Admin panel sign-in (ADMIN_PATH/login), email + password only. The role is checked before
 * the session starts, so a guest account never gets signed in here. On success it goes
 * straight to the panel.
 */
export async function signInAdmin(_prevState: { error?: string } | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  let session: { idToken: string; localId: string }
  try {
    session = await signInWithPassword(email, password)
  } catch (err) {
    return { error: identityErrorMessage(err) }
  }

  const user = await getAuthUserById(session.localId)
  if (!user?.email_confirmed_at) {
    return { error: 'Please confirm your email first. Check your inbox for the verification link.' }
  }
  if (!getAdminRole(user)) {
    return { error: 'This account has no admin access.' }
  }

  await startSession(session.idToken, session.localId)
  revalidatePath('/', 'layout')
  redirect(ADMIN_PATH)
}

/**
 * Registers a new user. Stores first_name, last_name, and full_name in
 * user_metadata and emails a confirmation link to /auth/callback, which
 * verifies the address and signs the user in.
 */
export async function signUp(
  prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  // Optional: the login popup uses a single password field with a show/hide toggle
  const confirmPassword = formData.get('confirmPassword') as string | null
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phone = normalizePhone(formData.get('phone') as string)

  if (!phone) {
    return { error: 'Please enter a valid mobile number' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long' }
  }

  if (confirmPassword !== null && password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  let verifiedPhone: string
  try {
    const token = formData.get('phoneIdToken')
    if (typeof token !== 'string' || !token) return { error: 'Please verify your mobile number with the SMS code.' }
    verifiedPhone = phoneFromProof(await adminAuth().verifyIdToken(token, true), phone)
  } catch {
    return { error: 'Mobile verification expired or failed. Please request a new SMS code.' }
  }

  // Don't reveal whether an address is registered: an existing account gets the same response
  if (await getAuthUserByEmail(email)) {
    return { success: true }
  }

  const { user, error } = await createAuthUser({
    email,
    password,
    userMetadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone: verifiedPhone,
      verified_phone: verifiedPhone,
      phone_verified_at: new Date().toISOString(),
    },
  })

  if (error || !user) {
    return { error: error?.message ?? 'Failed to create account' }
  }
  await logSignUp(user, 'email')

  const sent = await sendVerificationEmail(email, { name: firstName })
  if (!sent.success) {
    return { error: 'Your account was created, but we could not send the confirmation email. Please try again later.' }
  }

  return { success: true }
}

/** A new website account, for the admin activity log (the new user is the actor: there's no session yet) */
async function logSignUp(user: AuthUser, method: string) {
  const who = accountLabel(user)
  await logActivity({
    entity: 'user',
    action: 'signed_up',
    entityId: user.id,
    label: who,
    summary: `New sign-up: ${who} (${method})`,
    href: `/users/${user.id}`,
    actor: { id: user.id, name: who, role: 'guest' },
  })
}

export type ProfileField = 'name' | 'email' | 'phone'

export type ProviderSignInResult =
  | {
      success: true
      error?: never
      redirectTo: string
      /** Required details the provider didn't supply; the client asks for them before continuing */
      missing: ProfileField[]
      /** Asked for alongside, but can be skipped (an email: guests can book with just a mobile number) */
      optional: ProfileField[]
      profile: { firstName: string; lastName: string; email: string; phone: string }
    }
  | { success?: false; error: string }

function profileOf(user: AuthUser) {
  const meta = user.user_metadata
  const profile = {
    firstName: meta.first_name ?? '',
    lastName: meta.last_name ?? '',
    email: user.email ?? '',
    phone: meta.phone ?? '',
  }
  const missing: ProfileField[] = []
  if (!profile.firstName) missing.push('name')
  if (!verifiedProfilePhone(meta)) missing.push('phone')
  const optional: ProfileField[] = profile.email ? [] : ['email']
  return { profile, missing, optional }
}

/** Signs in with an ID token from a Google popup or SMS code confirmed in the browser */
export async function signInWithProvider(idToken: string, redirectTo?: string): Promise<ProviderSignInResult> {
  let uid: string
  let provider: 'google' | 'phone'
  let verifiedPhone: string | undefined
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true)
    const method = decoded.firebase?.sign_in_provider
    if (method !== 'google.com' && method !== 'phone') {
      return { error: 'This sign-in method is not supported.' }
    }
    // Session cookies may only be minted from a fresh sign-in
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return { error: 'Your sign-in took too long. Please try again.' }
    }
    uid = decoded.uid
    provider = method === 'google.com' ? 'google' : 'phone'
    // The SMS code proved this number belongs to the user
    if (provider === 'phone') verifiedPhone = decoded.phone_number
  } catch (err: any) {
    if (err?.code === 'auth/user-disabled') return { error: 'This account has been disabled.' }
    return { error: 'We could not verify your sign-in. Please try again.' }
  }

  const user = await upsertFederatedUser(await adminAuth().getUser(uid), provider, (created) =>
    logSignUp(created, provider === 'google' ? 'Google' : 'mobile number')
  )
  await startSession(idToken, uid)
  // Bookings and rooms a guest left under this number (no sign-in) move onto the account
  await claimGuestRecords(uid, verifiedPhone)
  revalidatePath('/', 'layout')

  return { success: true, redirectTo: safeRedirectPath(redirectTo), ...profileOf(user) }
}

/**
 * Saves the name, email and/or mobile number asked for after a Google or phone sign-in.
 * Fields the account already has are left unchanged. Email is optional.
 */
export async function completeProfile(input: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  phoneIdToken?: string
}): Promise<{ success: true } | { success?: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { missing, optional } = profileOf(user)
  const firstName = input.firstName?.trim().slice(0, 50) ?? ''
  const lastName = input.lastName?.trim().slice(0, 50) ?? ''
  const email = input.email?.trim() ?? ''
  const phone = normalizePhone(input.phone)

  if (missing.includes('name') && (!firstName || !lastName)) {
    return { error: 'Please enter your first and last name' }
  }
  // Email can be left blank; one that is typed must be valid
  if (optional.includes('email') && email && !EMAIL_PATTERN.test(email)) {
    return { error: 'Please enter a valid email address' }
  }
  if (missing.includes('phone') && !phone) {
    return { error: 'Please enter a valid mobile number' }
  }

  let verifiedPhone: string | undefined
  if (missing.includes('phone')) {
    try {
      if (!input.phoneIdToken || !phone) return { error: 'Please verify your mobile number with the SMS code.' }
      verifiedPhone = phoneFromProof(await adminAuth().verifyIdToken(input.phoneIdToken, true), phone)
    } catch {
      return { error: 'Mobile verification expired or failed. Please request a new SMS code.' }
    }
  }

  const updated = await fillMissingUserDetails(user.id, {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: email || undefined,
    verifiedPhone,
  })
  if (!updated) return { error: 'Could not save your profile. Please try again.' }
  await claimGuestRecords(user.id, verifiedPhone ?? verifiedProfilePhone(updated.user_metadata))
  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Signs out the current user (all sessions), revalidates the layout cache, and redirects to the homepage.
 */
export async function signOut() {
  await endSession()

  revalidatePath('/', 'layout')
  redirect('/')
}

/** Signs out from the admin panel (all sessions) and goes back to the admin sign-in page. */
export async function signOutAdmin() {
  await endSession()

  revalidatePath('/', 'layout')
  redirect(`${ADMIN_PATH}/login`)
}

/**
 * Sends a password-reset email. The link goes to /auth/callback, which validates the
 * code and forwards to /auth/reset-password where the user completes the flow via updatePassword.
 */
export async function resetPasswordRequest(
  _prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const email = formData.get('email') as string

  try {
    const result = await sendPasswordResetEmail(email)
    if (!result.success) {
      return { error: 'Could not send the reset email. Please try again later.' }
    }
  } catch (err: any) {
    serverLog.error('resetPasswordRequest error:', err)
    return { error: err?.message || 'Could not send the reset email. Please try again later.' }
  }

  return { success: true }
}

/**
 * Sets a new password on the /auth/reset-password page — using the reset code from the
 * email link, or for a signed-in user, directly. Redirects to /auth/login on success.
 */
export async function updatePassword(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const cookieStore = await cookies()
  const resetCode = cookieStore.get(PASSWORD_RESET_COOKIE)?.value

  if (resetCode) {
    let email: string
    try {
      ;({ email } = await confirmPasswordReset(resetCode, password))
    } catch (err) {
      return { error: identityErrorMessage(err) }
    }
    cookieStore.delete(PASSWORD_RESET_COOKIE)

    // Log out every existing session of the account whose password was reset
    try {
      const account = await getAuthUserByEmail(email)
      if (account) await adminAuth().revokeRefreshTokens(account.id)
    } catch (err) {
      serverLog.error('updatePassword: failed to revoke sessions:', err)
    }
  } else {
    const user = await getSessionUser()
    if (!user) {
      return { error: 'Your reset link has expired. Please request a new one.' }
    }
    const { error } = await updateAuthUser(user.id, { password })
    if (error) {
      return { error: error.message }
    }
  }

  // Sign out so the user lands on login with a clean state (also revokes other sessions)
  await endSession()

  revalidatePath('/', 'layout')
  redirect('/en/auth/login')
}
