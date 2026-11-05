'use client'

/**
 * useRazorpayCheckout — the Razorpay payment flow, callable straight after a booking is created
 * so "Proceed to payment" opens the gateway in one click.
 *
 * 1. POST /api/payment/create-order with only the booking ids (the server reads the amount from the DB)
 * 2. Opens Razorpay Checkout (an overlay on this page, so it needs no fresh click to open)
 * 3. On success POST /api/payment/verify (HMAC check on the server), then the success page
 *
 * Closing the window reports what happened: onDismiss when the guest just cancelled, onFailed when
 * a payment attempt failed in it (Razorpay keeps its window open after a failure so the guest can
 * retry, so the failure is reported once the window closes). Other problems go to onError.
 */
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRazorpay } from '@/lib/hooks/useRazorpay'
import { RAZORPAY_KEY_ID } from '@/lib/razorpay/config'

export interface CheckoutParams {
  bookingIds: string[]
  bookingType?: 'hotel' | 'boat'
  bookingReference: string
  guestName: string
  guestEmail?: string
  guestPhone: string
}

export interface CheckoutCallbacks {
  /** The guest closed the payment window without paying or trying to */
  onDismiss?: () => void
  /** A payment attempt failed (card declined, UPI timed out…) and the window was closed */
  onFailed?: (message: string) => void
  /** Order creation or the verification failed (or a payment failure, without onFailed) */
  onError?: (message: string) => void
}

/** 'idle' → 'starting' (creating the order) → 'open' (Razorpay showing) → 'verifying' */
export type CheckoutStage = 'idle' | 'starting' | 'open' | 'verifying'

/** useRazorpay adds the script on mount; a fast click can still beat it, so wait a little */
async function waitForRazorpay(timeoutMs = 15000) {
  const started = Date.now()
  while (!window.Razorpay) {
    if (Date.now() - started > timeoutMs) return false
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return true
}

export function useRazorpayCheckout() {
  const router = useRouter()
  const { isLoaded, isError } = useRazorpay()
  const [stage, setStage] = useState<CheckoutStage>('idle')

  const startPayment = useCallback(
    async (params: CheckoutParams, { onDismiss, onFailed, onError }: CheckoutCallbacks = {}) => {
      const { bookingIds, bookingType = 'hotel', bookingReference } = params
      const fail = (message: string) => {
        setStage('idle')
        onError?.(message)
      }

      if (!bookingIds.length) return fail('No booking found. Please try again.')
      setStage('starting')

      try {
        const [orderResponse, ready] = await Promise.all([
          fetch('/api/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingIds, bookingType }),
          }),
          waitForRazorpay(),
        ])
        const orderData = await orderResponse.json().catch(() => ({}))
        if (!orderResponse.ok) throw new Error(orderData.error || 'Failed to create payment order')
        if (!ready) throw new Error('The payment system did not load. Please check your connection and try again.')

        // The last failed attempt in this window, reported when it closes (unless a retry succeeds)
        let failure: string | null = null

        const razorpay = new window.Razorpay({
          key: RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Triplovia',
          description: `Booking: ${bookingReference}`,
          image: '/company-logo-only.svg',
          order_id: orderData.orderId,
          prefill: {
            name: params.guestName,
            email: params.guestEmail || undefined,
            contact: params.guestPhone,
          },
          notes: {
            booking_id: bookingIds[0],
            booking_reference: bookingReference,
          },
          theme: { color: '#107F78' },
          handler: async (response: any) => {
            setStage('verifying')
            try {
              const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingIds,
                  bookingType,
                }),
              })
              if (!verifyResponse.ok) throw new Error('Payment verification failed')
              const verifyData = await verifyResponse.json()
              router.push(`/payment/success?bookingRef=${verifyData.bookingReference}`)
            } catch (error) {
              console.error('Payment verification error:', error)
              fail('Payment was successful but verification failed. Please contact support.')
            }
          },
          modal: {
            ondismiss: () => {
              setStage('idle')
              if (failure) (onFailed ?? onError)?.(failure)
              else onDismiss?.()
            },
          },
        })

        razorpay.on('payment.failed', async (response: any) => {
          console.error('Payment failed:', response.error)
          failure = response.error?.description || 'The payment did not go through.'
          try {
            await fetch('/api/payment/failed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookingId: bookingIds[0],
                bookingType,
                errorCode: response.error?.code,
                errorDescription: response.error?.description,
                errorReason: response.error?.reason,
              }),
            })
          } catch (err) {
            console.error('Failed to update payment status:', err)
          }
        })

        razorpay.open()
        setStage('open')
      } catch (error: any) {
        console.error('Payment error:', error)
        fail(error?.message || 'Failed to initiate payment. Please try again.')
      }
    },
    [router]
  )

  return { startPayment, stage, busy: stage !== 'idle', isLoaded, isError }
}
