/**
 * Slides for the homepage hero, shown in this order: each photo comes with its own copy, and
 * the two change together. Images must be local (/public) or from a host allowed in
 * next.config.ts; use wide landscape shots (at least 1920px wide). Keep claims accurate:
 * cancellation copy must come from the cancellation policy config.
 */

export interface HeroSlide {
  image: string
  alt: string
  title: string
  text: string
}

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2400&q=80`

export const HERO_SLIDES: HeroSlide[] = [
  {
    image: unsplash('photo-1540541338287-41700207dee6'),
    alt: 'Resort infinity pool among palm trees, looking out to the sea',
    title: 'Your coastal escape starts here',
    text: 'Pool-side resorts, villas and homestays along the Honnavar coast, handpicked and ready to book.',
  },
  {
    image: unsplash('photo-1473116763249-2faaef81ccda'),
    alt: 'Waves rolling onto a sandy beach at sunset',
    title: 'Chase sunsets on the Arabian Sea',
    text: 'Stay close to the quiet beaches and backwaters of Honnavar and coastal Karnataka.',
  },
  {
    image: unsplash('photo-1611892440504-42a792e24d32'),
    alt: 'Warmly lit hotel room with wooden panels and a garden view',
    title: 'Rooms that feel like home',
    text: "Real photos, prices per night and what's included, all shown before you book.",
  },
  {
    image: unsplash('photo-1582719508461-905c673771fd'),
    alt: 'Wooden sun deck with loungers and umbrellas by the sea',
    title: 'Secure checkout, flexible plans',
    text: 'Pay with UPI, cards or net banking. Check each hotel’s cancellation policy before booking.',
  },
]
