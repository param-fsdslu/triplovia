'use client'

/**
 * The login / sign-up panel used by the popup (AuthDialog) and the /auth pages.
 * Mobile number first (SMS code via Firebase), then Google or email. Mobile and Google
 * create the account on the fly, so one flow covers both login and registration.
 *
 * Steps: start → otp → (complete) for mobile; start → (complete) for Google;
 * email-login / email-signup for email. `complete` asks for details the provider
 * didn't give (name, email, mobile) once.
 */
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Loader2, Mail } from '@/components/icons'
import { FieldSeparator } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Link } from '@/i18n/routing'
import { signInWithProvider, type ProviderSignInResult } from '@/lib/actions/auth'
import { clientAuth, clientAuthErrorMessage } from '@/lib/firebase/client'
import type { AuthIntent } from '@/lib/stores/use-ui-store'
import { formatPhone } from '@/lib/utils/phone'
import { FieldLabelText, FormError, PillButton, StepHeader } from './auth-ui'
import { CompleteProfileForm } from './CompleteProfileForm'
import { EmailLoginStep, EmailSignupStep } from './EmailAuthSteps'
import { GoogleIcon } from './GoogleIcon'
import { PhoneNumberInput } from './PhoneNumberInput'
import { usePhoneAuth } from './use-phone-auth'

type SignedIn = Extract<ProviderSignInResult, { success: true }>
type Step = 'start' | 'otp' | 'email-login' | 'email-signup' | 'complete'

export interface AuthPanelProps {
  intent?: AuthIntent
  /** Shown above the form, e.g. "Sign in to continue with your booking" */
  notice?: string
  /** Called once the user is fully signed in (after any profile completion) */
  onSignedIn: () => void
  /** Called as soon as a session exists, even if profile completion is still pending */
  onSessionStarted?: () => void
  /** Called before following a link out of the panel (lets the popup close itself) */
  onNavigateAway?: () => void
}

function SocialButton({
  label,
  onClick,
  busy,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      aria-label={label}
      title={label}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card shadow-xs transition-colors hover:border-primary/40 hover:bg-mint disabled:pointer-events-none disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : children}
    </button>
  )
}

export function AuthPanel({ intent = 'login', notice, onSignedIn, onSessionStarted, onNavigateAway }: AuthPanelProps) {
  const phone = usePhoneAuth()
  const [step, setStep] = useState<Step>('start')
  const [phoneValue, setPhoneValue] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'phone' | 'otp' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completion, setCompletion] = useState<SignedIn | null>(null)
  const done = useRef(false)

  const go = (next: Step) => {
    setError(null)
    setStep(next)
  }

  /** Exchanges a Firebase ID token for the session; false (with an error shown) on failure */
  async function finishProvider(idToken: string) {
    const result = await signInWithProvider(idToken)
    if (!result.success) {
      setError(result.error)
      return false
    }
    onSessionStarted?.()
    if (result.missing.length > 0) {
      setCompletion(result)
      go('complete')
    } else {
      done.current = true
      onSignedIn()
    }
    return true
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault()
    const target = phone.sentTo && step === 'otp' ? phone.sentTo : phoneValue
    if (!target) return
    setBusy('phone')
    setError(null)
    try {
      await phone.sendCode(target)
      setCode('')
      setStep('otp')
    } catch (err) {
      setError(clientAuthErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function verify(value: string) {
    if (value.length !== 6 || busy) return
    setBusy('otp')
    setError(null)
    try {
      await finishProvider(await phone.confirm(value))
    } catch (err) {
      setError(clientAuthErrorMessage(err))
      setCode('')
    } finally {
      if (!done.current) setBusy(null)
    }
  }

  async function continueWithGoogle() {
    setBusy('google')
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const credential = await signInWithPopup(clientAuth(), provider)
      const idToken = await credential.user.getIdToken()
      await signOut(clientAuth()).catch(() => {})
      await finishProvider(idToken)
    } catch (err) {
      const errorCode = (err as { code?: string })?.code
      if (errorCode !== 'auth/popup-closed-by-user' && errorCode !== 'auth/cancelled-popup-request') {
        setError(clientAuthErrorMessage(err))
      }
    } finally {
      if (!done.current) setBusy(null)
    }
  }

  let content: ReactNode
  if (step === 'complete' && completion) {
    content = <CompleteProfileForm result={completion} onDone={onSignedIn} />
  } else if (step === 'email-login') {
    content = (
      <EmailLoginStep
        onBack={() => go('start')}
        onSignedIn={() => {
          onSessionStarted?.()
          onSignedIn()
        }}
        onCreateAccount={() => go('email-signup')}
        onNavigateAway={onNavigateAway}
      />
    )
  } else if (step === 'email-signup') {
    content = <EmailSignupStep onBack={() => go('start')} onLogin={() => go('email-login')} />
  } else if (step === 'otp' && phone.sentTo) {
    const sentTo = phone.sentTo
    content = (
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          verify(code)
        }}
      >
        <StepHeader
          title="Verify your number"
          onBack={() => go('start')}
          subtitle={
            <>
              Enter the 6-digit code sent to <span className="font-semibold text-foreground">{formatPhone(sentTo)}</span>.{' '}
              <button
                type="button"
                onClick={() => go('start')}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Edit
              </button>
            </>
          }
        />

        <InputOTP
          id="auth-otp"
          aria-label="Verification code"
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
          onComplete={verify}
          disabled={busy !== null}
          autoFocus
          containerClassName="justify-center"
        >
          <InputOTPGroup className="gap-2 sm:gap-2.5 *:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-10 *:data-[slot=input-otp-slot]:rounded-lg *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:bg-card *:data-[slot=input-otp-slot]:text-lg *:data-[slot=input-otp-slot]:font-semibold sm:*:data-[slot=input-otp-slot]:w-12">
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <FormError message={error} />

        <PillButton type="submit" disabled={code.length !== 6} busy={busy === 'otp'}>
          Verify & continue
        </PillButton>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get the code?{' '}
          {phone.resendIn > 0 ? (
            <span className="tabular-nums">Resend in {phone.resendIn}s</span>
          ) : (
            <button
              type="button"
              onClick={() => sendCode()}
              disabled={busy !== null}
              className="font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          )}
        </p>
      </form>
    )
  } else {
    content = (
      <form className="flex flex-col gap-5" onSubmit={sendCode}>
        <StepHeader
          title={intent === 'signup' ? 'Create your account' : 'Login or sign up'}
          subtitle="Book stays faster and manage your trips in one place."
        />

        {notice && <p className="rounded-lg bg-mint px-3.5 py-2.5 text-sm font-medium text-secondary">{notice}</p>}

        <div>
          <FieldLabelText htmlFor="auth-phone">Mobile Number</FieldLabelText>
          <PhoneNumberInput
            id="auth-phone"
            defaultValue={phoneValue ?? undefined}
            onValueChange={setPhoneValue}
            disabled={busy === 'phone'}
          />
        </div>

        <FormError message={error} />

        <PillButton type="submit" disabled={!phoneValue || busy !== null} busy={busy === 'phone'}>
          Continue
        </PillButton>

        <FieldSeparator className="my-1 text-xs font-medium *:data-[slot=field-separator-content]:bg-card">
          Or login / sign up with
        </FieldSeparator>

        <div className="flex justify-center gap-4">
          <SocialButton
            label="Continue with Google"
            onClick={continueWithGoogle}
            busy={busy === 'google'}
            disabled={busy !== null}
          >
            <GoogleIcon className="h-5 w-5" />
          </SocialButton>
          <SocialButton
            label="Continue with email"
            onClick={() => go(intent === 'signup' ? 'email-signup' : 'email-login')}
            disabled={busy !== null}
          >
            <Mail className="h-5 w-5 text-foreground/80" />
          </SocialButton>
        </div>
      </form>
    )
  }

  return (
    <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:min-h-full md:justify-center">
      {/* Invisible reCAPTCHA for SMS codes; kept mounted across steps so "Resend" works */}
      <div ref={phone.recaptchaHost} className="absolute" />
      {content}
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        By continuing, you agree to our{' '}
        <Link href="/terms" onClick={onNavigateAway} className="underline underline-offset-2 hover:text-primary">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" onClick={onNavigateAway} className="underline underline-offset-2 hover:text-primary">
          Privacy Policy
        </Link>
        .
        {/* Required by Google when the floating reCAPTCHA badge is hidden (see globals.css) */}
        <span className="mt-1.5 block text-[11px] text-muted-foreground/80">
          Protected by reCAPTCHA. Google&apos;s{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            Terms
          </a>{' '}
          apply.
        </span>
      </p>
    </div>
  )
}
