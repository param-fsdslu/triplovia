import { HOTEL_CANCELLATION_POLICIES, VENDOR_CANCELLATION_TERMS, type HotelCancellationPolicy } from '@/lib/config/hotel-cancellation-policy'
import { cn } from '@/lib/utils'

export function CancellationPolicyMatrix({ policy, vendorTerms = true, commission = false }: { policy: HotelCancellationPolicy; vendorTerms?: boolean; commission?: boolean }) {
  const selected = HOTEL_CANCELLATION_POLICIES[policy]
  return <div className="space-y-4 text-sm">
    <ol className="space-y-0">
      {selected.rows.map(([timing, refund], index) => {
        const refundable = refund.startsWith('100%') || refund.startsWith('50%')
        return <li key={timing} className="relative flex gap-3 pb-4 last:pb-0">
          {index < selected.rows.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[5px] top-3 w-px bg-border" />}
          <span aria-hidden="true" className={cn('relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2', refundable ? 'border-primary bg-card' : 'border-muted-foreground/50 bg-transparent')} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className={cn('font-heading text-sm font-bold leading-5', refundable ? 'text-primary' : 'text-foreground')}>{refund}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{timing}.</p>
          </div>
        </li>
      })}
    </ol>

    <div className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
      <p>All cutoffs follow the scheduled check-in time (India time). No gateway fee is deducted from eligible refunds.</p>
    </div>
    {commission && <p className="text-xs leading-relaxed text-muted-foreground">{selected.commission}</p>}
    {vendorTerms && <div className="space-y-1.5 border-t border-border pt-3">
      <p className="text-xs font-semibold text-foreground">If the property cancels</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{VENDOR_CANCELLATION_TERMS}</p>
    </div>}
  </div>
}
