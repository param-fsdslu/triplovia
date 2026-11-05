'use client'

/**
 * Full-screen loader on the review page while the guest waits on us: creating the booking, opening
 * the Razorpay window, and confirming the payment after it (until the success page loads). Nothing
 * shows while the Razorpay window itself is open.
 */
import { Loader2, ShieldCheck } from '@/components/icons'

export type PaymentProgress = 'creating' | 'starting' | 'open' | 'verifying' | 'idle'

const COPY = {
  creating: { title: 'Reserving your rooms…', text: 'Then we take you to secure payment.' },
  starting: { title: 'Taking you to secure payment…', text: 'The Razorpay window opens in a moment.' },
  verifying: { title: 'Confirming your payment…', text: 'This takes a few seconds.' },
} as const

export function PaymentProgressOverlay({ progress }: { progress: PaymentProgress }) {
  if (progress === 'idle' || progress === 'open') return null
  const copy = COPY[progress]

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 px-6 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-primary">
          <Loader2 className="h-7 w-7 animate-spin" />
        </span>
        <p className="mt-4 font-heading text-lg font-bold text-foreground">{copy.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.text}</p>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Please don&apos;t refresh or close this page
        </p>
      </div>
    </div>
  )
}
