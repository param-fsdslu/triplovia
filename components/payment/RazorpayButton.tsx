'use client'

/**
 * RazorpayButton — a "Pay ₹X" button for hotel or boat bookings that already exist.
 *
 * The payment flow itself (create order → Razorpay Checkout → verify) lives in
 * useRazorpayCheckout; the hotel review forms call that hook directly so
 * "Proceed to payment" opens the gateway in one click.
 *
 * bookingType defaults to 'hotel' but accepts 'boat' for the boat booking flow.
 * The button is disabled until the Razorpay script is ready or while a payment is in progress.
 */
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard } from '@/components/icons'
import { useRazorpayCheckout } from '@/lib/hooks/useRazorpayCheckout'

interface RazorpayButtonProps {
  /** Single booking ID — for boat bookings and backwards-compat hotel bookings. */
  bookingId?: string
  /** Multiple booking IDs — for multi-room hotel bookings. Overrides bookingId. */
  bookingIds?: string[]
  amount: number
  bookingReference: string
  guestName: string
  guestEmail?: string
  guestPhone: string
  bookingType?: 'hotel' | 'boat'
  disabled?: boolean
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export function RazorpayButton({
  bookingId,
  bookingIds,
  amount,
  bookingReference,
  guestName,
  guestEmail,
  guestPhone,
  bookingType = 'hotel',
  disabled,
}: RazorpayButtonProps) {
  const { startPayment, busy, isLoaded, isError } = useRazorpayCheckout()

  // Resolve which IDs to use: bookingIds array wins over single bookingId
  const resolvedIds = bookingIds?.length ? bookingIds : bookingId ? [bookingId] : []

  const handlePayment = () =>
    startPayment(
      { bookingIds: resolvedIds, bookingType, bookingReference, guestName, guestEmail, guestPhone },
      {
        onDismiss: () => alert('Payment cancelled. You can try again anytime.'),
        onError: (message) => alert(message),
      }
    )

  if (isError) {
    return (
      <Button disabled variant="destructive" size="lg" className="w-full">
        Payment system unavailable
      </Button>
    )
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || !isLoaded || busy}
      size="lg"
      className="w-full gap-2"
    >
      {busy ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Processing Payment...
        </>
      ) : !isLoaded ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Payment System...
        </>
      ) : (
        <>
          <CreditCard className="h-5 w-5" />
          Pay ₹{Math.round(amount).toLocaleString('en-IN')}
        </>
      )}
    </Button>
  )
}
