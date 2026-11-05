import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'

export interface GuestDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface BookingStateData {
  guestDetails: GuestDetails
}

interface BookingActions {
  setGuestDetails: (details: Partial<GuestDetails>) => void
  clearGuestDetails: () => void
}

export type BookingState = BookingStateData & BookingActions

const initialGuestDetails: GuestDetails = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      guestDetails: initialGuestDetails,

      setGuestDetails: (details) =>
        set((state) => ({
          guestDetails: { ...state.guestDetails, ...details },
        })),

      clearGuestDetails: () =>
        set({ guestDetails: initialGuestDetails }),
    }),
    {
      name: 'ht-booking-guest',
      version: 1,
      partialize: (state) => ({ guestDetails: state.guestDetails }),
    }
  )
)

/**
 * Hook to safely read persisted Zustand state after hydration.
 * Prevents SSR/hydration mismatches with localStorage-persisted stores.
 */
export function useBookingHydration() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const unsub = useBookingStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })

    // If already hydrated (e.g. store was created before this component mounted)
    if (useBookingStore.persist.hasHydrated()) {
      setHydrated(true)
    }

    return unsub
  }, [])

  return hydrated
}
