'use client'

/** On the payment success page: the paid hotel's rooms leave the floating cart (use-cart-store) */
import { useEffect } from 'react'
import { useCartStore } from '@/lib/stores/use-cart-store'

export function ClearPaidCart({ hotelId }: { hotelId?: string | null }) {
  useEffect(() => {
    const cart = useCartStore.getState()
    if (hotelId && cart.hotel?.id === hotelId) cart.clearCart()
  }, [hotelId])
  return null
}
