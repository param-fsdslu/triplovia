'use client'

/**
 * PayButton — "Pay ₹X" for a booking the review form already created, driven by the form's
 * useRazorpayCheckout so it shows the same progress as the automatic first attempt.
 */
import { CreditCard, Loader2 } from '@/components/icons'
import { Button } from '@/components/ui/button'
import type { useRazorpayCheckout } from '@/lib/hooks/useRazorpayCheckout'

const BUSY_LABELS = {
  starting: 'Opening secure payment…',
  open: 'Waiting for payment…',
  verifying: 'Confirming your payment…',
} as const

interface PayButtonProps {
  amount: number
  checkout: ReturnType<typeof useRazorpayCheckout>
  onPay: () => void
  /** The last attempt was cancelled or failed: "Try again" */
  retry?: boolean
}

export function PayButton({ amount, checkout, onPay, retry = false }: PayButtonProps) {
  const { stage, isError } = checkout

  return (
    <Button
      type="button"
      size="lg"
      onClick={onPay}
      disabled={isError || stage !== 'idle'}
      variant={isError ? 'destructive' : 'default'}
      className="h-12 w-full gap-2 rounded-full text-base font-bold"
    >
      {isError ? (
        'Payment system unavailable'
      ) : stage !== 'idle' ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {BUSY_LABELS[stage]}
        </>
      ) : (
        <>
          <CreditCard className="h-5 w-5" />
          {retry ? 'Try again · ' : ''}Pay ₹{Math.round(amount).toLocaleString('en-IN')}
        </>
      )}
    </Button>
  )
}
