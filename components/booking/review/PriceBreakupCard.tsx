'use client'

/**
 * PriceBreakupCard — the only thing in the sticky right column of "Review your booking"
 * (MakeMyTrip-style): charge lines, one "Taxes & service fees" line that expands into the
 * GST / service-charge split, the total to pay, and the pay step (`children`: terms, Proceed to
 * payment / Razorpay). Hotel, dates and guests stay on the left.
 */
import { useState, type ReactNode } from 'react'
import { ChevronDown, Lock } from '@/components/icons'
import { cn } from '@/lib/utils'

export interface PriceLine {
  label: string
  amount: number
  /** Small grey line under the label (e.g. nightly prices) */
  detail?: ReactNode
}

interface PriceBreakupCardProps {
  /** Room, meal and other charges before taxes */
  lines: PriceLine[]
  /** GST, service charge, extra-bed charge… shown folded under one line */
  taxes: PriceLine[]
  total: number
  /** False until both dates are picked */
  ready: boolean
  /** Pay step under the total (terms, submit / Razorpay button, errors) */
  children?: ReactNode
  className?: string
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export function PriceBreakupCard({ lines, taxes, total, ready, children, className }: PriceBreakupCardProps) {
  const [showTaxes, setShowTaxes] = useState(false)
  const taxTotal = taxes.reduce((sum, t) => sum + t.amount, 0)

  return (
    <section className={cn('overflow-hidden rounded-2xl border border-border bg-card', className)}>
      <h2 className="border-b border-border px-5 py-4 font-heading text-lg font-bold text-foreground">Price breakup</h2>

      {!ready ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Pick your check-in and check-out dates to see the price for your stay.
        </p>
      ) : (
        <>
          <div className="divide-y divide-border px-5">
            {lines.map((line) => (
              <div key={line.label} className="py-3">
                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="font-medium text-foreground">{line.label}</span>
                  <span className="shrink-0 font-semibold text-foreground">{rupees(line.amount)}</span>
                </div>
                {line.detail && <div className="mt-1 text-xs text-muted-foreground">{line.detail}</div>}
              </div>
            ))}

            {taxes.length > 0 && (
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => setShowTaxes((v) => !v)}
                  aria-expanded={showTaxes}
                  className="flex w-full items-start justify-between gap-4 text-left text-sm"
                >
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    Taxes &amp; service fees
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showTaxes && 'rotate-180')} />
                  </span>
                  <span className="shrink-0 font-semibold text-foreground">{rupees(taxTotal)}</span>
                </button>
                {showTaxes && (
                  <div className="mt-2 space-y-1 rounded-lg bg-muted/40 px-3 py-2">
                    {taxes.map((t) => (
                      <div key={t.label} className="flex justify-between gap-4 text-xs text-muted-foreground">
                        <span>{t.label}</span>
                        <span>{rupees(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-border bg-mint/40 px-5 py-4">
            <div>
              <p className="font-heading text-base font-bold text-foreground">Total amount to be paid</p>
              <p className="text-[11px] text-muted-foreground">All taxes &amp; fees included</p>
            </div>
            <p className="font-heading text-2xl font-extrabold text-primary">{rupees(total)}</p>
          </div>
        </>
      )}

      {children && <div className="space-y-3 border-t border-border px-5 py-4">{children}</div>}

      <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
        Secure payment by Razorpay · UPI, cards and net banking
      </p>
    </section>
  )
}
