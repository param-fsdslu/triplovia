'use client'

import { useRef, useState } from 'react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { clientAuthErrorMessage } from '@/lib/firebase/client'
import { formatPhone } from '@/lib/utils/phone'
import { PhoneNumberInput } from './PhoneNumberInput'
import { FormError, PillButton } from './auth-ui'
import { usePhoneAuth } from './use-phone-auth'
import { ResendOtpButton } from './ResendOtpButton'

/** Proves a contact number without replacing the site's existing httpOnly session. */
export function VerifiedPhoneInput({ id, defaultValue, onVerified }: { id: string; defaultValue?: string; onVerified: (value: { phone: string; idToken: string } | null) => void }) {
  const auth = usePhoneAuth()
  const [phone, setPhone] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null)
  const lock = useRef(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!phone || lock.current || auth.resendIn > 0) return
    lock.current = true; setBusy('send'); setError(null)
    try { await auth.sendCode(phone); setCode('') } catch (error) { setError(clientAuthErrorMessage(error)) }
    finally { lock.current = false; setBusy(null) }
  }
  async function verify(value: string) {
    if (value.length !== 6 || !phone || phone !== auth.sentTo || lock.current || verified) return
    lock.current = true; setBusy('verify'); setError(null)
    try {
      const idToken = await auth.confirm(value)
      onVerified({ phone, idToken }); setVerified(true)
    } catch (error) { setError(clientAuthErrorMessage(error)); setCode('') }
    finally { lock.current = false; setBusy(null) }
  }
  return <div className="relative space-y-3">
    <div ref={auth.recaptchaHost} className="absolute" />
    <PhoneNumberInput id={id} defaultValue={defaultValue} required disabled={busy !== null || verified || !!auth.sentTo} onValueChange={value => { setPhone(value); onVerified(null) }} />
    {verified ? <p role="status" className="text-xs font-semibold text-primary">Mobile number verified <button type="button" onClick={() => { setVerified(false); auth.reset(); setCode(''); onVerified(null) }} className="ml-2 font-medium underline underline-offset-4">Change / verify again</button></p> : auth.sentTo ? <>
      <p className="text-xs text-muted-foreground">Enter the code sent to {formatPhone(auth.sentTo)}. <button type="button" disabled={busy !== null} onClick={() => { auth.reset(); setCode(''); setError(null); onVerified(null) }} className="font-semibold text-primary">Edit number</button></p>
      <InputOTP id={id + '-otp'} aria-label="Mobile verification code" maxLength={6} pattern={REGEXP_ONLY_DIGITS} autoComplete="one-time-code" value={code} onChange={setCode} onComplete={verify} disabled={busy !== null} containerClassName="justify-center">
        <InputOTPGroup>{Array.from({ length: 6 }, (_, i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
      </InputOTP>
      <PillButton type="button" busy={busy === 'verify'} disabled={busy !== null || code.length !== 6} onClick={() => verify(code)}>Verify mobile number</PillButton>
      <ResendOtpButton resendIn={auth.resendIn} busy={busy !== null} onResend={send} />
    </> : <PillButton type="button" variant="outline" disabled={!phone || busy !== null || auth.resendIn > 0} busy={busy === 'send'} onClick={send}>{auth.resendIn > 0 ? 'Send OTP in ' + auth.resendIn + 's' : 'Send OTP'}</PillButton>}
    <FormError message={error} />
  </div>
}
