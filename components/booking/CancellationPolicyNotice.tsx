import { CancellationPolicyMatrix } from '@/components/hotel/CancellationPolicyMatrix'
import { isHotelCancellationPolicy } from '@/lib/config/hotel-cancellation-policy'
import { ShieldAlert } from '@/components/icons'
import { FREE_CANCELLATION_HOURS, EFFECTIVE_GATEWAY_FEE_PERCENT } from '@/lib/config/cancellation-policy'

/**
 * Compact cancellation-terms summary shown before payment and on the booking
 * confirmation. Reads from lib/config/cancellation-policy.ts — the same source
 * the backend refund calculation uses — so this copy can never drift from what
 * actually gets refunded.
 */
export function CancellationPolicyNotice({ policy }: { policy?: string | null }) {
  if (isHotelCancellationPolicy(policy)) return <CancellationPolicyMatrix policy={policy} />
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm">
      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-amber-900">
        <p className="font-medium mb-1">Cancellation &amp; Refund Policy</p>
        <p className="text-amber-800">
          Free cancellation up to <strong>{FREE_CANCELLATION_HOURS} hours</strong> before check-in — refunded minus
          a {EFFECTIVE_GATEWAY_FEE_PERCENT.toFixed(2)}% non-refundable payment gateway fee. Cancelling within{' '}
          {FREE_CANCELLATION_HOURS} hours of check-in forfeits the full amount.{' '}
          <a href="/refund-policy" target="_blank" className="underline underline-offset-2 hover:text-amber-950">
            Read the full policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
