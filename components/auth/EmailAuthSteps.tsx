'use client'

/** Email login and email sign-up steps of the login panel */
import { useActionState, useEffect, useRef } from 'react'
import { MailCheck } from '@/components/icons'
import { Input } from '@/components/ui/input'
import { Link } from '@/i18n/routing'
import { signIn, signUp } from '@/lib/actions/auth'
import { authInputClass, FieldLabelText, FormError, PasswordInput, PillButton, StepHeader } from './auth-ui'
import { PhoneNumberInput } from './PhoneNumberInput'

interface EmailLoginStepProps {
  onBack: () => void
  onSignedIn: () => void
  onCreateAccount: () => void
  onNavigateAway?: () => void
}

export function EmailLoginStep({ onBack, onSignedIn, onCreateAccount, onNavigateAway }: EmailLoginStepProps) {
  const [state, formAction, pending] = useActionState(signIn, null)
  const signedIn = useRef(onSignedIn)
  signedIn.current = onSignedIn

  useEffect(() => {
    if (state?.success) signedIn.current()
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <StepHeader title="Login with email" onBack={onBack} />

      <div>
        <FieldLabelText htmlFor="auth-email">Email address</FieldLabelText>
        <Input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          required
          autoFocus
          className={authInputClass}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <FieldLabelText htmlFor="auth-password">Password</FieldLabelText>
          <Link
            href="/auth/forgot-password"
            onClick={onNavigateAway}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="auth-password" autoComplete="current-password" />
      </div>

      <FormError message={state?.error} />

      <PillButton type="submit" busy={pending || state?.success}>
        Login
      </PillButton>

      <p className="text-center text-sm text-muted-foreground">
        New to Triplovia?{' '}
        <button type="button" onClick={onCreateAccount} className="font-semibold text-primary underline-offset-4 hover:underline">
          Create an account
        </button>
      </p>
    </form>
  )
}

interface EmailSignupStepProps {
  onBack: () => void
  onLogin: () => void
}

export function EmailSignupStep({ onBack, onLogin }: EmailSignupStepProps) {
  const [state, formAction, pending] = useActionState(signUp, null)

  if (state && 'success' in state && state.success) {
    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mint">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Check your inbox</h2>
          <p className="text-sm text-muted-foreground text-balance">
            We sent a verification link to your email. Open it to activate your account; it expires in 24 hours. Check
            your spam folder if you don&apos;t see it.
          </p>
        </div>
        <PillButton type="button" variant="outline" onClick={onBack} className="bg-card text-foreground hover:bg-muted">
          Back to login options
        </PillButton>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <StepHeader title="Create account with email" onBack={onBack} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabelText htmlFor="auth-firstName">First name</FieldLabelText>
          <Input id="auth-firstName" name="firstName" autoComplete="given-name" required autoFocus className={authInputClass} />
        </div>
        <div>
          <FieldLabelText htmlFor="auth-lastName">Last name</FieldLabelText>
          <Input id="auth-lastName" name="lastName" autoComplete="family-name" required className={authInputClass} />
        </div>
      </div>

      <div>
        <FieldLabelText htmlFor="auth-signup-email">Email address</FieldLabelText>
        <Input
          id="auth-signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          required
          className={authInputClass}
        />
      </div>

      <div>
        <FieldLabelText htmlFor="auth-signup-phone">Mobile number</FieldLabelText>
        <PhoneNumberInput id="auth-signup-phone" name="phone" required />
      </div>

      <div>
        <FieldLabelText htmlFor="auth-signup-password">Password</FieldLabelText>
        <PasswordInput id="auth-signup-password" autoComplete="new-password" minLength={8} />
        <p className="mt-1.5 text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      <FormError message={state && 'error' in state ? state.error : null} />

      <PillButton type="submit" busy={pending} className="mt-1">
        Create account
      </PillButton>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button type="button" onClick={onLogin} className="font-semibold text-primary underline-offset-4 hover:underline">
          Login
        </button>
      </p>
    </form>
  )
}
