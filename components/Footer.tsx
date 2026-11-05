import Image from 'next/image'
import { Mail, MapPin, Phone, ShieldCheck } from '@/components/icons'
import { isFeatureEnabled } from '@/lib/config/features'
import { CONTACT } from '@/lib/config/contact'
import { ListPropertyButton } from '@/components/listing/ListPropertyButton'
import { PackageEnquiryButton } from '@/components/packages/PackageEnquiryButton'
import { SocialLinks } from '@/components/layout/SocialLinks'
import { PaymentMarks } from '@/components/payment/PaymentMarks'
import { cn } from '@/lib/utils'

const serviceLinks = [
  { href: '/hotels', label: 'Hotels & homestays', show: isFeatureEnabled('hotels') },
  { href: '/boats', label: 'Boat trips', show: isFeatureEnabled('boats') },
].filter((l) => l.show)

/** Experiences & packages: each opens the WhatsApp enquiry form (packageName goes into the message) */
const packageLinks = [
  { packageName: 'Group Travel', label: 'Group travel' },
  { packageName: 'Wedding Photo Shoot', label: 'Wedding photo shoots' },
  { packageName: 'Tourism Package', label: 'Tourism packages' },
  { packageName: 'Adventure Sports', label: 'Adventure sports' },
]

const exploreLinks = [
  { href: '/blog', label: 'Travel blog', show: isFeatureEnabled('blogs') },
  { href: '/reviews', label: 'Guest reviews', show: true },
  { href: '/about', label: 'About us', show: true },
  { href: '/contact', label: 'Contact us', show: true },
].filter((l) => l.show)

const legalLinks = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Cancellation & Refunds' },
  { href: '/privacy', label: 'Privacy Policy' },
]

const linkClass = 'text-sm text-white/65 transition-colors hover:text-white'

/** Contact icons (solid, like every icon from components/icons) in gold */
const solidIcon = 'h-[18px] w-[18px] shrink-0 text-gold'

/** `className` adds to the footer, e.g. bottom padding to clear a bar pinned over it */
export function Footer({ className }: { className?: string } = {}) {
  return (
    <footer className={cn('bg-secondary text-white', className)}>
      <div className="page-container pt-14 pb-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {/* Brand mark as-is (a white filter would flatten it); wordmark in white */}
              <Image src="/company-logo-only.svg" alt="Triplovia" width={32} height={32} className="h-8 w-8" />
              <Image src="/company-logo-text-only.svg" alt="Triplovia" width={110} height={26} className="h-6 w-auto brightness-0 invert" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/65">
              Your trusted travel partner for exploring the beautiful coastal Karnataka.
            </p>
            <SocialLinks className="mt-5" />
            <p className="mt-5 text-xs text-white/45">GSTIN: {CONTACT.gstin}</p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Explore</h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                </li>
              ))}
              {packageLinks.map((p) => (
                <li key={p.packageName}>
                  <PackageEnquiryButton packageName={p.packageName} className={`${linkClass} text-left`}>
                    {p.label}
                  </PackageEnquiryButton>
                </li>
              ))}
              {exploreLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <ListPropertyButton className={`${linkClass} text-left`}>List your property</ListPropertyButton>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Policies</h4>
            <ul className="space-y-2.5">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href={`mailto:${CONTACT.email}`} className={`${linkClass} inline-flex items-center gap-2.5`}>
                  <Mail className={solidIcon} />
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <a href={`tel:${CONTACT.phone}`} className={`${linkClass} inline-flex items-center gap-2.5`}>
                  <Phone className={solidIcon} />
                  {CONTACT.phoneDisplay}
                </a>
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed text-white/65">
                <MapPin className={`mt-0.5 ${solidIcon}`} />
                <span>{CONTACT.address.singleLine}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright, then the payment gateway and the methods it takes as small marks */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/50">&copy; {new Date().getFullYear()} Triplovia. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-white/65">
              <ShieldCheck className="h-4 w-4 text-gold" />
              Secure payments by Razorpay
            </span>
            <PaymentMarks />
          </div>
        </div>
      </div>
    </footer>
  )
}
