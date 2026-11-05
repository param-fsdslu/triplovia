import { CalendarCheck, Heart, UserCircle, type LucideIcon } from '@/components/icons'

export interface AccountLink {
  href: string
  label: string
  /** Shorter label for the phone tab switcher */
  shortLabel: string
  icon: LucideIcon
}

/** Account pages in menu order. The account sidebar, its phone tabs and the navbar account menu all use this. */
export const ACCOUNT_LINKS: AccountLink[] = [
  { href: '/profile', label: 'Profile', shortLabel: 'Profile', icon: UserCircle },
  { href: '/bookings', label: 'My Bookings', shortLabel: 'Bookings', icon: CalendarCheck },
  { href: '/wishlist', label: 'Wishlist', shortLabel: 'Wishlist', icon: Heart },
]
