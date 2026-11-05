import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { ListPropertyButton } from '@/components/listing/ListPropertyButton'
import {
  ArrowRight,
  Eye,
  FileText,
  Globe,
  Heart,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Target,
  TreePalm,
  Users,
  type LucideIcon,
} from '@/components/icons'

export const metadata = {
  title: 'About Us',
  description:
    'Triplovia makes it easy to discover and book hotels, homestays and experiences across coastal Karnataka, with verified local hosts and secure payments.',
}

/** Palm-lined beach with shacks and fishing boats, tagged Gokarna on Unsplash (Vivek, @viveksxr) */
const TRAVEL_PHOTO =
  'https://images.unsplash.com/photo-1593359652766-b77c5795bd65?auto=format&fit=crop&w=2400&q=80'

const VALUES: Array<{ icon: LucideIcon; title: string; description: string }> = [
  { icon: Heart, title: 'Guest first', description: 'Every decision we make starts with what is best for our guests.' },
  { icon: Shield, title: 'Trust & safety', description: 'Verified properties, secure payments and transparent pricing.' },
  { icon: Users, title: 'Local partnerships', description: 'We work with local hosts to bring you authentic coastal experiences.' },
  { icon: Globe, title: 'Sustainable tourism', description: 'Promoting responsible travel that benefits local communities.' },
]

const STEPS: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Search,
    title: 'Search and compare',
    description: 'Browse hotels, resorts and homestays across coastal Karnataka with real photos, amenities and prices.',
  },
  {
    icon: ShieldCheck,
    title: 'Book securely',
    description: 'Pay through Razorpay and receive your confirmation and GST tax invoice straight away.',
  },
  {
    icon: TreePalm,
    title: 'Stay with local hosts',
    description: 'Check in with hosts who know the coast, with our team a message away if you need anything.',
  },
]

const POLICIES: Array<{ icon: LucideIcon; label: string; text: string; href: string }> = [
  { icon: FileText, label: 'Terms & Conditions', text: 'The agreement for using Triplovia and making bookings', href: '/terms' },
  { icon: RotateCcw, label: 'Cancellation & Refunds', text: 'Cancellation windows, gateway charges and timelines', href: '/refund-policy' },
  { icon: Shield, label: 'Privacy Policy', text: 'How we collect, use and protect your information', href: '/privacy' },
]

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar transparent={false} />

      <main className="grow pt-16 sm:pt-[72px]">
        {/* ── Intro over the beach photo: a cover like the blog post page's (not full screen, by request) ── */}
        <section className="relative isolate overflow-hidden bg-foreground">
          <Image
            src={TRAVEL_PHOTO}
            alt="A palm-lined beach with fishing boats on India's west coast"
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
          />
          {/* Neutral dark scrim (not teal, by request), strongest at the bottom where the copy sits */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/50 via-black/15 to-transparent md:block" />

          <div className="page-container flex min-h-[420px] flex-col justify-end pb-10 pt-10 sm:min-h-[480px] sm:pb-12 lg:min-h-[540px]">
            <div className="max-w-2xl text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.3)]">
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem]">
                Your trusted travel partner
                <br />
                <span className="text-gold">on the Karnataka coast.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                Triplovia makes it easy to discover, book and enjoy the best hotels, homestays and experiences across
                coastal Karnataka. We connect travellers with verified local hosts for stays worth remembering.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 [text-shadow:none]">
                <Link
                  href="/hotels"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-white"
                >
                  Explore stays
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <ListPropertyButton className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
                  List your property
                </ListPropertyButton>
              </div>
            </div>
          </div>
        </section>

        {/* ── Vision and mission ─────────────────────────────── */}
        <section className="py-14 sm:py-20">
          <div className="page-container">
            <SectionHeader title="Built for travellers, rooted in the coast" />
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-7 sm:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-primary">
                  <Eye className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-xl font-bold text-foreground">Our vision</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  To become the most trusted travel platform for coastal Karnataka, making it effortless for every
                  traveller to discover hidden gems, book with confidence and create memories that last a lifetime. We
                  envision a future where tourism uplifts local communities while preserving the natural beauty of the
                  coast.
                </p>
              </div>
              <div className="rounded-3xl bg-secondary p-7 text-white sm:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-secondary">
                  <Target className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-xl font-bold">Our mission</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-white/75">
                  To provide a seamless booking experience with verified properties, transparent pricing and exceptional
                  customer support. We are committed to partnering with local hotels, boat operators and experience hosts
                  to bring the best of coastal Karnataka to travellers from around the world.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────── */}
        <section className="border-y border-border bg-card py-14 sm:py-20">
          <div className="page-container">
            <SectionHeader title="From search to check-in" />
            <ol className="grid gap-5 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, description }, i) => (
                <li key={title} className="relative rounded-3xl border border-border bg-background p-6">
                  <span className="absolute right-6 top-6 text-4xl font-extrabold leading-none text-border">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Values ────────────────────────────────────────── */}
        <section className="py-14 sm:py-20">
          <div className="page-container">
            <SectionHeader title="Our values" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="group rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_18px_40px_-20px_rgba(7,63,61,0.35)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Policies ──────────────────────────────────────── */}
        <section className="pb-14 sm:pb-20">
          <div className="page-container">
            <SectionHeader title="Our policies" />
            <div className="grid gap-4 md:grid-cols-3">
              {POLICIES.map(({ icon: Icon, label, text, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-foreground group-hover:text-primary">{label}</span>
                    <span className="block text-xs leading-snug text-muted-foreground">{text}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>

            {/* ── Closing call to action ───────────────────── */}
            <div className="relative isolate mt-12 overflow-hidden rounded-3xl bg-secondary px-6 py-10 text-white sm:px-10 sm:py-12">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-72 w-72 rounded-full bg-primary/50 blur-3xl" />
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold sm:text-3xl">Ready to explore the coast?</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                    Find a stay in Honnavar, Bhatkal and beyond, or bring your property to travellers looking for it.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <Link
                    href="/hotels"
                    className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-white"
                  >
                    Explore stays
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <ListPropertyButton className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                    List your property
                  </ListPropertyButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
