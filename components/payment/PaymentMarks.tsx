import { Landmark } from '@/components/icons'
import { cn } from '@/lib/utils'

/*
 * Small marks for the payment methods Razorpay takes on Triplovia: UPI, Visa, Mastercard, RuPay and
 * net banking. Drawn inline (no hotlinked logos), each on a small white tile so the brand
 * colours read on the teal footer. Simplified wordmarks, sized for a 24px-high tile (footer bottom line).
 */

const FONT = 'Arial, Helvetica, sans-serif'

function UpiMark() {
  return (
    <svg viewBox="0 0 50 20" className="h-3 w-auto" aria-hidden="true">
      <text x="0" y="16" fontFamily={FONT} fontSize="17" fontWeight="800" fontStyle="italic" fill="#5f6368">
        UPI
      </text>
      <path d="M35 2.5 42.5 10 35 17.5Z" fill="#097939" />
      <path d="M40.5 2.5 48 10 40.5 17.5Z" fill="#ed752e" />
    </svg>
  )
}

function VisaMark() {
  return (
    <svg viewBox="0 0 46 16" className="h-2.5 w-auto" aria-hidden="true">
      <text x="0" y="14.5" fontFamily={FONT} fontSize="17" fontWeight="900" fontStyle="italic" letterSpacing="0.5" fill="#1a1f71">
        VISA
      </text>
    </svg>
  )
}

function MastercardMark() {
  return (
    <svg viewBox="0 0 34 21" className="h-3.5 w-auto" aria-hidden="true">
      <circle cx="11" cy="10.5" r="9.5" fill="#eb001b" />
      <circle cx="23" cy="10.5" r="9.5" fill="#f79e1b" />
      {/* Where the two circles overlap */}
      <path d="M17 3.13a9.5 9.5 0 0 1 0 14.74 9.5 9.5 0 0 1 0-14.74Z" fill="#ff5f00" />
    </svg>
  )
}

function RupayMark() {
  return (
    <svg viewBox="0 0 70 18" className="h-3 w-auto" aria-hidden="true">
      <text x="0" y="14.5" fontFamily={FONT} fontSize="16" fontWeight="900" fontStyle="italic" fill="#1b3c87">
        RuPay
      </text>
      <path d="M56 2 63.5 9 56 16Z" fill="#f47920" />
      <path d="M61 2 68.5 9 61 16Z" fill="#108a3f" />
    </svg>
  )
}

const METHODS = [
  { label: 'UPI', Mark: UpiMark },
  { label: 'Visa', Mark: VisaMark },
  { label: 'Mastercard', Mark: MastercardMark },
  { label: 'RuPay', Mark: RupayMark },
]

const tile = 'flex h-6 items-center justify-center rounded bg-white px-1.5'

/** The accepted payment methods as a row of white tiles (wraps on narrow screens) */
export function PaymentMarks({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-1.5', className)} aria-label="Payment methods we accept">
      {METHODS.map(({ label, Mark }) => (
        <li key={label} className={cn(tile, 'min-w-[2.5rem]')} title={label}>
          <Mark />
          <span className="sr-only">{label}</span>
        </li>
      ))}
      <li className={cn(tile, 'gap-1 text-[10px] font-semibold text-secondary')}>
        <Landmark className="h-3 w-3 text-primary" />
        Net banking
      </li>
    </ul>
  )
}
