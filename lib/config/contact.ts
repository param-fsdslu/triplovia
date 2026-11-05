/**
 * Triplovia's contact details, for the Contact page, the legal pages' contact card and the footer.
 * (Some older components still repeat these; point them here when you touch them.)
 */
export const CONTACT = {
  email: 'triplovia@gmail.com',
  /** E.164, for tel: links */
  phone: '+919113887712',
  phoneDisplay: '+91 91138 87712',
  /** wa.me number: country code + number, digits only */
  whatsapp: '919113887712',
  address: {
    lines: ['First floor, 612, Honnavar Areangadi Road', 'Near BSNL Office, Hosakuli', 'Uttarakannada, Karnataka – 581334'],
    /** One line, for copy */
    singleLine: 'First floor, 612, Honnavar Areangadi Road, Near BSNL Office, Hosakuli, Uttarakannada, Karnataka – 581334',
  },
  businessType: 'Online travel platform',
  gstin: '29AAZFT3826C1ZO',
} as const

/**
 * Triplovia's social profiles, shown as icons in the footer and the phone menu.
 * PLACEHOLDER handles (no public profiles were found): replace each `url` with the real profile
 * link before going live. A profile with an empty `url` is hidden.
 */
export const SOCIAL_LINKS = [
  { name: 'Instagram', url: 'https://www.instagram.com/triplovia' },
  { name: 'Facebook', url: 'https://www.facebook.com/triplovia' },
  { name: 'YouTube', url: 'https://www.youtube.com/@triplovia' },
] as const satisfies ReadonlyArray<{ name: 'Instagram' | 'Facebook' | 'YouTube'; url: string }>

/** A wa.me link, optionally with a prefilled message */
export function whatsappUrl(text?: string) {
  return `https://wa.me/${CONTACT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
