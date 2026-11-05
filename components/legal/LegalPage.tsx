/**
 * The layout of the legal pages (/terms, /privacy, /refund-policy): a teal header with the title and
 * a one-line description, an "On this page" list of numbered sections (sticky beside the text
 * on desktop, a fold-out menu on phones), each section in its own card, and one contact card at the
 * end. Pages pass their sections as { title, content }; ids for the anchors come from the titles.
 */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ArrowRight, ChevronDown, Mail, MapPin, Phone } from '@/components/icons'
import { CONTACT } from '@/lib/config/contact'
import { cn } from '@/lib/utils'

export interface LegalSection {
  title: string
  content: ReactNode
}

interface LegalPageProps {
  title: string
  description: string
  /** Paragraphs before the numbered sections */
  intro?: ReactNode
  sections: LegalSection[]
}

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const number = (i: number) => String(i + 1).padStart(2, '0')

/** Typography for the policy text (plain Tailwind, so the 65ch cap on .prose doesn't apply) */
const TEXT = cn(
  'text-[15px] leading-relaxed text-muted-foreground',
  '[&_p]:mt-3 [&_p:first-child]:mt-0',
  '[&_h3]:mt-7 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground',
  '[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5',
  '[&_li]:pl-1 [&_li]:marker:text-primary',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-2 [&_a:hover]:underline'
)

function SectionList({ sections, onPage }: { sections: { id: string; title: string }[]; onPage?: boolean }) {
  return (
    <ol className="space-y-0.5">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className={cn(
              'flex gap-3 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-mint hover:text-primary',
              onPage && 'py-2'
            )}
          >
            <span className="w-5 shrink-0 font-semibold tabular-nums text-gold">{number(i)}</span>
            <span className="min-w-0">{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}

export function LegalPage({ title, description, intro, sections }: LegalPageProps) {
  const toc = sections.map((s) => ({ id: slug(s.title), title: s.title }))

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar transparent={false} />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="relative overflow-clip bg-secondary pt-16 sm:pt-[72px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/40 blur-3xl"
        />
        <div className="page-container relative py-10 sm:py-14">
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">{description}</p>
        </div>
      </header>

      {/* ── Sections beside their list ─────────────────────── */}
      <main className="grow">
        <div className="page-container py-10 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              {/* Desktop: always open */}
              <div className="hidden rounded-2xl border border-border bg-card p-4 lg:block">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-gold">On this page</p>
                <div className="max-h-[calc(100vh-11rem)] overflow-y-auto pr-1">
                  <SectionList sections={toc} />
                </div>
              </div>
              {/* Phones and tablets: folds out */}
              <details className="group rounded-2xl border border-border bg-card lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  On this page
                  <span className="text-xs font-normal text-muted-foreground">
                    {sections.length} sections
                    <ChevronDown className="ml-1.5 inline h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="border-t border-border p-2">
                  <SectionList sections={toc} onPage />
                </div>
              </details>
            </aside>

            <div className="min-w-0 space-y-5">
              {intro && (
                <div className={cn('rounded-2xl border border-primary/15 bg-mint/60 p-6 sm:p-8', TEXT, 'text-foreground/80')}>
                  {intro}
                </div>
              )}

              {sections.map((section, i) => (
                <section
                  key={toc[i].id}
                  id={toc[i].id}
                  className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 sm:scroll-mt-28 sm:p-8"
                >
                  <div className="mb-4 flex items-baseline gap-3">
                    <span className="text-sm font-bold tabular-nums text-gold">{number(i)}</span>
                    <h2 className="text-lg font-bold leading-snug text-foreground sm:text-xl">{section.title}</h2>
                  </div>
                  <div className={TEXT}>{section.content}</div>
                </section>
              ))}

              {/* ── Contact ───────────────────────────────────── */}
              <section className="rounded-2xl bg-secondary p-6 text-white sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Questions about this policy?</p>
                <p className="mt-2 text-lg font-bold">Talk to Triplovia</p>
                <ul className="mt-5 grid gap-3 text-sm text-white/80 sm:grid-cols-2">
                  <li>
                    <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2.5 hover:text-white">
                      <Mail className="h-[18px] w-[18px] shrink-0 text-gold" />
                      {CONTACT.email}
                    </a>
                  </li>
                  <li>
                    <a href={`tel:${CONTACT.phone}`} className="inline-flex items-center gap-2.5 hover:text-white">
                      <Phone className="h-[18px] w-[18px] shrink-0 text-gold" />
                      {CONTACT.phoneDisplay}
                    </a>
                  </li>
                  <li className="flex gap-2.5 sm:col-span-2">
                    <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-gold" />
                    <span>
                      Triplovia ({CONTACT.businessType.toLowerCase()}), {CONTACT.address.singleLine}
                      <span className="mt-1 block text-white/60">GSTIN {CONTACT.gstin}</span>
                    </span>
                  </li>
                </ul>
                <Link
                  href="/contact"
                  className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-white"
                >
                  All ways to reach us
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
