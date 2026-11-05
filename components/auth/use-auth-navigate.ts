'use client'

import { useCallback } from 'react'
import { useRouter } from '@/i18n/routing'

/** Navigates after sign-in (guest site only: the admin panel has its own sign-in page) */
export function useAuthNavigate() {
  const router = useRouter()
  return useCallback(
    (path: string) => {
      router.push(path)
      router.refresh()
    },
    [router]
  )
}
