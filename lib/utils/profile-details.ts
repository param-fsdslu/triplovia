/**
 * The guest profile's details (My Profile page): options, the form schema shared by the page and
 * `updateProfile`, and the clean-up the server applies before saving. Client- and server-safe.
 */
import { z } from 'zod'
import { normalizeIndianMobile, normalizePhone } from '@/lib/utils/phone'

export const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

/**
 * Photo IDs hotels in India accept at check-in. Aadhaar is never stored in full: only its last
 * 4 digits are kept (as "XXXX XXXX 1234"), so it can't be misused if the data leaks.
 */
export const ID_TYPES = [
  { value: 'passport', label: 'Passport', placeholder: 'e.g. K1234567' },
  { value: 'driving_licence', label: 'Driving licence', placeholder: 'e.g. KA19 20210012345' },
  { value: 'voter_id', label: 'Voter ID (EPIC)', placeholder: 'e.g. ABC1234567' },
  { value: 'aadhaar', label: 'Aadhaar (last 4 digits saved)', placeholder: '12-digit Aadhaar number' },
] as const

export type IdType = (typeof ID_TYPES)[number]['value']

const MASKED_AADHAAR = /^XXXX XXXX \d{4}$/

/** "1234 5678 9012" → "XXXX XXXX 9012"; an already masked value stays; null when it isn't 12 digits */
export function maskAadhaar(input: string): string | null {
  const value = input.trim().toUpperCase()
  if (MASKED_AADHAAR.test(value)) return value
  const digits = value.replace(/[\s-]/g, '')
  return /^\d{12}$/.test(digits) ? `XXXX XXXX ${digits.slice(-4)}` : null
}

/** A typed phone number in E.164 (Indian 10-digit numbers without the code too), or null */
export function parseProfilePhone(input: string): string | null {
  return normalizeIndianMobile(input) ?? normalizePhone(input)
}

const ID_PATTERNS: Record<Exclude<IdType, 'aadhaar'>, { test: RegExp; message: string }> = {
  passport: { test: /^[A-Z0-9]{6,12}$/, message: 'Enter the passport number as printed (6–12 letters and digits)' },
  driving_licence: { test: /^[A-Z0-9 -]{8,20}$/, message: 'Enter the licence number as printed' },
  voter_id: { test: /^[A-Z]{3}\d{7}$/, message: 'A Voter ID is 3 letters and 7 digits (e.g. ABC1234567)' },
}

const text = (max: number) => z.string().trim().max(max, `At most ${max} characters`)

/** The profile form's fields (empty strings for "not set"); the server parses the same schema */
export const profileDetailsSchema = z
  .object({
    firstName: text(50),
    lastName: text(50),
    phone: text(20),
    dateOfBirth: z.string().trim(),
    gender: z.union([z.literal(''), z.enum(GENDERS.map((g) => g.value) as [string, ...string[]])]),
    nationality: text(50),
    bio: text(500),
    addressLine1: text(120),
    addressLine2: text(120),
    city: text(60),
    state: text(60),
    postalCode: text(12),
    country: text(60),
    emergencyContactName: text(80),
    emergencyContactPhone: text(20),
    idType: z.union([z.literal(''), z.enum(ID_TYPES.map((t) => t.value) as [string, ...string[]])]),
    idNumber: text(24),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })

    if (v.phone && !parseProfilePhone(v.phone)) issue('phone', 'Enter a valid mobile number')
    if (v.emergencyContactPhone && !parseProfilePhone(v.emergencyContactPhone)) {
      issue('emergencyContactPhone', 'Enter a valid mobile number')
    }

    if (v.dateOfBirth) {
      const date = new Date(`${v.dateOfBirth}T00:00:00`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v.dateOfBirth) || Number.isNaN(date.getTime())) {
        issue('dateOfBirth', 'Enter a valid date')
      } else if (date > new Date() || date.getFullYear() < 1900) {
        issue('dateOfBirth', 'Enter your real date of birth')
      }
    }

    const india = !v.country || /^india$/i.test(v.country)
    if (v.postalCode && india && !/^[1-9]\d{5}$/.test(v.postalCode)) issue('postalCode', 'A PIN code is 6 digits')

    if (v.idType && !v.idNumber) issue('idNumber', 'Enter the ID number')
    if (!v.idType && v.idNumber) issue('idType', 'Pick the ID type')
    if (v.idType && v.idNumber) {
      if (v.idType === 'aadhaar') {
        if (!maskAadhaar(v.idNumber)) issue('idNumber', 'An Aadhaar number is 12 digits')
      } else {
        const rule = ID_PATTERNS[v.idType as Exclude<IdType, 'aadhaar'>]
        if (!rule.test.test(v.idNumber.toUpperCase())) issue('idNumber', rule.message)
      }
    }
  })

export type ProfileDetails = z.infer<typeof profileDetailsSchema>

/** A profiles row → the form's values */
export function profileToForm(profile: Record<string, any> | null | undefined): ProfileDetails {
  const get = (key: string) => (typeof profile?.[key] === 'string' ? profile[key] : '')
  return {
    firstName: get('first_name'),
    lastName: get('last_name'),
    phone: get('phone'),
    dateOfBirth: get('date_of_birth'),
    gender: get('gender'),
    nationality: get('nationality'),
    bio: get('bio'),
    addressLine1: get('address_line_1'),
    addressLine2: get('address_line_2'),
    city: get('city'),
    state: get('state'),
    postalCode: get('postal_code'),
    country: get('country') || 'India',
    emergencyContactName: get('emergency_contact_name'),
    emergencyContactPhone: get('emergency_contact_phone'),
    idType: get('id_type'),
    idNumber: get('id_number'),
  }
}

/** Parsed form values → profiles columns (empty → null, phones in E.164, Aadhaar masked) */
export function formToProfileColumns(v: ProfileDetails): Record<string, string | null> {
  const orNull = (value: string) => value || null
  const idNumber = !v.idType || !v.idNumber
    ? null
    : v.idType === 'aadhaar'
      ? maskAadhaar(v.idNumber)
      : v.idNumber.toUpperCase().replace(/\s+/g, ' ')
  return {
    first_name: orNull(v.firstName),
    last_name: orNull(v.lastName),
    phone: v.phone ? parseProfilePhone(v.phone) : null,
    date_of_birth: orNull(v.dateOfBirth),
    gender: orNull(v.gender),
    nationality: orNull(v.nationality),
    bio: orNull(v.bio),
    address_line_1: orNull(v.addressLine1),
    address_line_2: orNull(v.addressLine2),
    city: orNull(v.city),
    state: orNull(v.state),
    postal_code: orNull(v.postalCode),
    country: orNull(v.country),
    emergency_contact_name: orNull(v.emergencyContactName),
    emergency_contact_phone: v.emergencyContactPhone ? parseProfilePhone(v.emergencyContactPhone) : null,
    id_type: v.idType && idNumber ? v.idType : null,
    id_number: idNumber,
  }
}
