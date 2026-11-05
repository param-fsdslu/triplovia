/**
 * Slides shown beside the login / sign-up panel (popup and auth pages). Swap images or copy
 * here; images must be local (/public) or from a host allowed in next.config.ts.
 * Keep claims accurate: cancellation copy must come from the cancellation policy config.
 */

export interface AuthPromo {
  image: string
  eyebrow: string
  title: string
  text: string
}

export const AUTH_PROMOS: AuthPromo[] = [
  {
    image: '/images/hero-background.png',
    eyebrow: 'Coastal Karnataka',
    title: 'Stays by the beaches and backwaters of Honnavar',
    text: 'Handpicked homestays and hotels, booked in a few taps.',
  },
  {
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    eyebrow: 'Flexible plans',
    title: 'Know your cancellation terms',
    text: 'See the hotel’s refund policy before you book.',
  },
  {
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80',
    eyebrow: 'Pay securely',
    title: 'Checkout secured by Razorpay',
    text: 'Pay with UPI, cards or net banking.',
  },
  {
    image: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=900&q=80',
    eyebrow: 'Plan with us',
    title: 'Group trips, tours and wedding shoots',
    text: "Tell us what you need and we'll get back to you on WhatsApp.",
  },
]
