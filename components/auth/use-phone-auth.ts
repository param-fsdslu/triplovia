'use client'

/**
 * Firebase phone auth for the login panel: sends a 6-digit SMS code behind an invisible
 * reCAPTCHA and confirms it, yielding an ID token for the signInWithProvider action.
 * Attach `recaptchaHost` to an element that stays mounted for the whole flow.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber, signOut, type ConfirmationResult } from 'firebase/auth'
import { clientAuth } from '@/lib/firebase/client'

const RESEND_SECONDS = 30

export function usePhoneAuth() {
  const recaptchaHost = useRef<HTMLDivElement>(null)
  const verifier = useRef<RecaptchaVerifier | null>(null)
  const confirmation = useRef<ConfirmationResult | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => () => verifier.current?.clear(), [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  /** Sends the code; throws a Firebase error on failure */
  const sendCode = useCallback(async (phone: string) => {
    const auth = clientAuth()
    // A fresh element per attempt: a reCAPTCHA widget can't be rendered twice into one
    verifier.current?.clear()
    const container = document.createElement('div')
    recaptchaHost.current!.replaceChildren(container)
    verifier.current = new RecaptchaVerifier(auth, container, { size: 'invisible' })
    try {
      confirmation.current = await signInWithPhoneNumber(auth, phone, verifier.current)
    } catch (err) {
      verifier.current.clear()
      verifier.current = null
      throw err
    }
    setSentTo(phone)
    setResendIn(RESEND_SECONDS)
  }, [])

  /** Confirms the code and returns an ID token; throws a Firebase error on a wrong/expired code */
  const confirm = useCallback(async (code: string) => {
    if (!confirmation.current) throw new Error('No verification code was requested')
    const credential = await confirmation.current.confirm(code)
    const idToken = await credential.user.getIdToken()
    await signOut(clientAuth()).catch(() => {})
    return idToken
  }, [])

  const reset = useCallback(() => setSentTo(null), [])

  return { recaptchaHost, sentTo, resendIn, sendCode, confirm, reset }
}
