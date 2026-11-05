/**
 * Labels and formatting shared by the admin Users list (client) and a user's profile page
 * (server), so both show the same status and dates.
 */
import type { SignInMethod, WebsiteUser } from '@/lib/actions/website-users'

export const SIGN_IN_LABELS: Record<SignInMethod, string> = { phone: 'Mobile', google: 'Google', email: 'Email' }

// India time on the server and in the browser alike, so the rendered dates match
const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
const TIME = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

/** "1 Nov 2026"; `fallback` when there is no date */
export const formatUserDate = (iso: string | null, fallback = 'Never') => (iso ? DATE.format(new Date(iso)) : fallback)
/** "11:04 am" */
export const formatUserTime = (iso: string | null) => (iso ? TIME.format(new Date(iso)) : '')

export function userStatus(user: WebsiteUser) {
  if (user.disabled) return { label: 'Disabled', className: 'bg-red-100 text-red-800' }
  if (user.incomplete) return { label: 'Sign-in not finished', className: 'bg-amber-100 text-amber-800' }
  if (user.email && !user.emailConfirmed && user.methods.length === 1 && user.methods[0] === 'email') {
    return { label: 'Email not confirmed', className: 'bg-amber-100 text-amber-800' }
  }
  return { label: 'Active', className: 'bg-primary/10 text-secondary' }
}
