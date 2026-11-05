'use client'

import { useState } from 'react'
import { ArrowRight, Phone } from '@/components/icons'
import { ListPropertyDialog } from '@/components/listing/ListPropertyDialog'

/** Deep Teal call-to-action card inviting owners to list their property */
export function ListPropertyCta() {
  const [open, setOpen] = useState(false)

  return (
    <section className="py-12 sm:py-16">
      <div className="page-container">
        <div className="relative overflow-hidden rounded-3xl bg-secondary px-6 py-10 sm:px-12 sm:py-14">
          {/* Soft teal glow for depth */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/40 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                List your property with Triplovia
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/70">
                Reach travellers exploring coastal Karnataka. Share a few details and our team will get in touch.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3
                           text-sm font-semibold text-secondary transition-colors hover:bg-gold/90"
              >
                List your property
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="tel:+919113887712"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-3
                           text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Phone className="h-4 w-4" />
                Talk to us
              </a>
            </div>
          </div>
        </div>
      </div>

      <ListPropertyDialog open={open} onOpenChange={setOpen} />
    </section>
  )
}
