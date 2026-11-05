/**
 * Mobile number helpers shared by the browser (sign-in / signup forms) and server actions.
 * Numbers are stored in E.164 form (+919876543210), which is also what Firebase phone auth uses.
 */

export const COUNTRY_CODES = [
  { code: '+91', label: 'India', iso: 'IN' },
  { code: '+971', label: 'UAE', iso: 'AE' },
  { code: '+1', label: 'USA / Canada', iso: 'US' },
  { code: '+44', label: 'United Kingdom', iso: 'GB' },
  { code: '+61', label: 'Australia', iso: 'AU' },
  { code: '+65', label: 'Singapore', iso: 'SG' },
  { code: '+49', label: 'Germany', iso: 'DE' },
  { code: '+33', label: 'France', iso: 'FR' },
  { code: '+34', label: 'Spain', iso: 'ES' },
] as const

export const DEFAULT_COUNTRY_CODE = '+91'

const E164 = /^\+[1-9]\d{7,14}$/

/** Combines a country code and a national number into E.164, or null when it isn't a valid mobile number */
export function toE164(countryCode: string, national: string): string | null {
  const digits = national.replace(/\D/g, '').replace(/^0+/, '')
  if (countryCode === '+91') return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
  const value = `${countryCode}${digits}`
  return E164.test(value) ? value : null
}

/**
 * An Indian mobile number as typed in the booking form ("98765 43210", "+91 98765 43210", "098…")
 * in E.164, the form Firebase phone sign-in reports; null when it isn't one
 */
export function normalizeIndianMobile(input: string | null | undefined): string | null {
  const compact = (input ?? '').replace(/[\s()-]/g, '')
  return toE164('+91', compact.replace(/^(\+?91|0)(?=\d{10}$)/, ''))
}

/** Validates a full number typed or submitted as "+<country><number>" (spaces and dashes allowed) */
export function normalizePhone(input: string | null | undefined): string | null {
  const compact = (input ?? '').replace(/[\s()-]/g, '')
  if (compact.startsWith('+91')) return toE164('+91', compact.slice(3))
  return E164.test(compact) ? compact : null
}

/** "+919876543210" → "+91 98765 43210" (other countries: code + number) */
export function formatPhone(e164: string): string {
  if (e164.startsWith('+91') && e164.length === 13) {
    return `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`
  }
  const match = COUNTRY_CODES.find((c) => e164.startsWith(c.code))
  return match ? `${match.code} ${e164.slice(match.code.length)}` : e164
}
