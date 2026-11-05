'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber, signOut, type ConfirmationResult } from 'firebase/auth'
import { clientAuth } from '@/lib/firebase/client'

const RESEND_SECONDS = 30

export function usePhoneAuth() {
  const recaptchaHost = useRef<HTMLDivElement>(null)
  const verifier = useRef<RecaptchaVerifier | null>(null)
  const confirmation = useRef<ConfirmationResult | null>(null)
  const deadline = useRef(0)
  const sending = useRef(false)
  const mounted = useRef(true)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      try { verifier.current?.clear() } catch { /* Widget may already have been removed. */ }
      verifier.current = null
    }
  }, [])

  useEffect(() => {
    if (!resendIn) return
    const timer = window.setInterval(() => setResendIn(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const sendCode = useCallback(async (phone: string) => {
    if (sending.current || Date.now() < deadline.current) throw Object.assign(new Error('Please wait before requesting another code'), { code: 'auth/too-many-requests' })
    const host = recaptchaHost.current
    if (!host) throw new Error('Phone verification is not ready. Please try again.')
    sending.current = true
    try {
      const auth = clientAuth()
      try { verifier.current?.clear() } catch { /* A fresh widget replaces the previous one. */ }
      verifier.current = null
      const container = document.createElement('div')
      host.replaceChildren(container)
      const widget = new RecaptchaVerifier(auth, container, { size: 'invisible' })
      verifier.current = widget
      const result = await signInWithPhoneNumber(auth, phone, widget)
      if (mounted.current) {
        confirmation.current = result
        setSentTo(phone)
        deadline.current = Date.now() + RESEND_SECONDS * 1000
        setResendIn(RESEND_SECONDS)
      }
    } catch (error) {
      try { verifier.current?.clear() } catch { /* Ignore an already-cleared widget. */ }
      verifier.current = null
      // No OTP was confirmed sent: let the user correct the problem and retry.
      deadline.current = 0
      if (mounted.current) setResendIn(0)
      throw error
    } finally { sending.current = false }
  }, [])

  const confirm = useCallback(async (code: string) => {
    if (!confirmation.current) throw new Error('No verification code was requested')
    const credential = await confirmation.current.confirm(code)
    try { return await credential.user.getIdToken(true) } finally { await signOut(clientAuth()).catch(() => {}) }
  }, [])

  const reset = useCallback(() => { confirmation.current = null; setSentTo(null) }, [])
  return { recaptchaHost, sentTo, resendIn, sendCode, confirm, reset }
}
