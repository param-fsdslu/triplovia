import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ContactForm } from '@/components/contact/ContactForm'
import { ListPropertyButton } from '@/components/listing/ListPropertyButton'
import { SectionHeader } from '@/components/layout/SectionHeader'
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  type LucideIcon,
} from '@/components/icons'
import { CONTACT, whatsappUrl } from '@/lib/config/contact'

export const metadata = {
  title: 'Contact Us',
  description:
    'Contact Triplovia for help with bookings, payments, cancellations and refunds, or to list your property. Reach us by phone, WhatsApp or email.',
}

const CHANNELS: Array<{ icon: LucideIcon; label: string; value: string; href: string; external?: boolean }> = [
  { icon: Phone, label: 'Call customer support', value: CONTACT.phoneDisplay, href: `tel:${CONTACT.phone}` },
  {
    icon: MessageCircle,
    label: 'Chat on WhatsApp',
    value: CONTACT.phoneDisplay,
    href: whatsappUrl('Hello Triplovia, I would like some assistance.'),
    external: true,
  },
  { icon: Mail, label: 'Email our team', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
]

const SELF_SERVICE: Array<{ icon: LucideIcon; title: string; text: string; cta: string; href: string }> = [
  {
    icon: CalendarCheck,
    title: 'Manage your bookings',
    text: 'View booking details, download tax invoices or cancel a booking in a few clicks.',
    cta: 'Go to My Bookings',
    href: '/bookings',
  },
  {
    icon: RotateCcw,
    title: 'Cancellations & refunds',
    text: 'Check cancellation windows, gateway charges and how long a refund takes to reach you.',
    cta: 'Read the policy',
    href: '/refund-policy',
  },
]

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar transparent={false} />

      <main className="grow">
        {/* ── Intro + channels (left) and the form (right) ─────── */}
        <section className="relative isolate overflow-clip bg-secondary pt-16 sm:pt-[72px]">
          <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-10 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/35 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />

          <div className="page-container grid items-start gap-10 pb-12 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-14 lg:pb-16">
            <div className="text-white lg:pt-4">
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Let&apos;s talk about
                <br />
                <span className="text-gold">your next stay.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75">
                Questions about a booking, a payment or a refund, or interested in partnering with us? Reach our team
                directly or send a message, whichever suits you.
              </p>

              <div className="mt-8 space-y-3 sm:max-w-md">
                {CHANNELS.map(({ icon: Icon, label, value, href, external }) => (
                  <a
                    key={label}
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3.5 pr-5 backdrop-blur-sm
                               transition-colors hover:border-white/25 hover:bg-white/10"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-secondary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-white/60">{label}</span>
                      <span className="block truncate text-base font-semibold text-white sm:text-lg">{value}</span>
                    </span>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-white/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold" />
                  </a>
                ))}
              </div>

              <p className="mt-6 flex items-center gap-2 text-sm text-white/60">
                <MapPin className="h-4 w-4 shrink-0 text-gold" />
                Registered office · Honnavar, Uttarakannada, Karnataka
              </p>
            </div>

            {/* The form, on the right from desktop */}
            <div className="relative z-10 rounded-3xl bg-card p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] sm:p-8">
              <h2 className="text-2xl font-bold text-foreground">Send us a message</h2>
              <p className="mb-6 mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Tell us what you need and our team will get back to you. For an existing booking, include your booking
                reference so we can help faster.
              </p>
              <ContactForm />
            </div>
          </div>
        </section>

        {/* ── Self-service and partners ─────────────────────── */}
        <section className="pb-14 pt-12 sm:pb-20 sm:pt-16">
          <div className="page-container">
            <SectionHeader eyebrow="Self-service" title="Find answers faster" description="Most booking questions can be sorted in a minute, any time of day." />

            <div className="grid gap-5 md:grid-cols-3">
              {SELF_SERVICE.map(({ icon: Icon, title, text, cta, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_18px_40px_-20px_rgba(7,63,61,0.35)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}

              <div className="relative isolate flex flex-col overflow-hidden rounded-3xl bg-secondary p-6 text-white">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-48 w-48 rounded-full bg-primary/50 blur-2xl" />
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-secondary">
                  <Building2 className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold">Partner with Triplovia</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-white/75">
                  Own a hotel, resort or homestay in coastal Karnataka? List your property and reach more travellers.
                </p>
                <ListPropertyButton
                  className="group mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold
                             text-secondary transition-colors hover:bg-gold"
                >
                  List your property
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </ListPropertyButton>
              </div>
            </div>

            {/* ── Business details + security ─────────────────── */}
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="rounded-3xl border border-border bg-card p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Business information</p>
                <dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2 xl:grid-cols-[auto_auto_auto_minmax(0,1.6fr)]">
                  <div>
                    <dt className="text-muted-foreground">Registered name</dt>
                    <dd className="mt-0.5 font-semibold text-foreground">Triplovia</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Business type</dt>
                    <dd className="mt-0.5 font-semibold text-foreground">{CONTACT.businessType}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">GSTIN</dt>
                    <dd className="mt-0.5 font-semibold tracking-wide text-foreground">{CONTACT.gstin}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registered office</dt>
                    <dd className="mt-0.5 leading-relaxed text-foreground">{CONTACT.address.singleLine}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex gap-4 rounded-3xl border border-gold/40 bg-gold/10 p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <p className="text-sm leading-relaxed text-foreground">
                  <span className="block font-semibold">Stay safe from fraud</span>
                  Triplovia will never ask for your OTP, card PIN, UPI PIN or banking passwords. We only contact you
                  through the channels on this page.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
