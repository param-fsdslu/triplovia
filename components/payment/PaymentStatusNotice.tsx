/**
 * What happened when the Razorpay window closed without paying, shown above the review page's
 * retry button: cancelled (the guest closed it) or failed (an attempt in it was declined).
 */
import { AlertCircle, XCircle } from '@/components/icons'
import { STALE_BOOKING_MINUTES } from '@/lib/config/booking-hold'

export type PaymentResult = { kind: 'cancelled' } | { kind: 'failed'; message: string }

export function PaymentStatusNotice({ result }: { result: PaymentResult }) {
  const failed = result.kind === 'failed'

  return (
    <div
      role="alert"
      className={
        failed
          ? 'flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5'
          : 'flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5'
      }
    >
      {failed ? (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      )}
      <div className="min-w-0 text-sm">
        <p className={failed ? 'font-bold text-destructive' : 'font-bold text-amber-800'}>
          {failed ? 'Payment failed' : 'Payment cancelled'}
        </p>
        <p className={failed ? 'mt-0.5 text-foreground/80' : 'mt-0.5 text-amber-900/80'}>
          {failed
            ? `${result.message} If money left your account, your bank returns it, usually within 5–7 working days.`
            : 'You closed the payment window, so nothing was charged.'}{' '}
          Your rooms are held for {STALE_BOOKING_MINUTES} minutes: pay below to confirm the booking.
        </p>
      </div>
    </div>
  )
}
