'use client'

/**
 * Shown once after a Google or mobile sign-in that didn't supply everything bookings need:
 * name and a mobile number for the property to reach the guest. An email for confirmations is
 * asked for alongside but optional, so a guest can book with just their mobile number.
 */
import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { completeProfile, type ProviderSignInResult } from '@/lib/actions/auth'
import { authInputClass, FieldLabelText, FormError, PillButton, StepHeader } from './auth-ui'
import { PhoneNumberInput } from './PhoneNumberInput'

type SignedIn = Extract<ProviderSignInResult, { success: true }>

interface CompleteProfileFormProps {
  result: SignedIn
  onDone: () => void
}

export function CompleteProfileForm({ result, onDone }: CompleteProfileFormProps) {
  const { missing, optional, profile } = result
  const [phone, setPhone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const res = await completeProfile({
        firstName: (form.get('firstName') as string) ?? undefined,
        lastName: (form.get('lastName') as string) ?? undefined,
        email: (form.get('email') as string) ?? undefined,
        phone: phone ?? undefined,
      })
      if (!res.success) {
        setError(res.error)
        setBusy(false)
        return
      }
      onDone()
    } catch {
      setError('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <StepHeader
        title={`Almost there${profile.firstName ? `, ${profile.firstName}` : ''}`}
        subtitle="Just a few details for your bookings."
      />

      {missing.includes('name') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabelText htmlFor="cp-firstName">First name</FieldLabelText>
            <Input
              id="cp-firstName"
              name="firstName"
              autoComplete="given-name"
              defaultValue={profile.firstName}
              required
              autoFocus
              className={authInputClass}
            />
          </div>
          <div>
            <FieldLabelText htmlFor="cp-lastName">Last name</FieldLabelText>
            <Input
              id="cp-lastName"
              name="lastName"
              autoComplete="family-name"
              defaultValue={profile.lastName}
              required
              className={authInputClass}
            />
          </div>
        </div>
      )}

      {optional.includes('email') && (
        <div>
          <FieldLabelText htmlFor="cp-email">
            Email address <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabelText>
          <Input
            id="cp-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            className={authInputClass}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            For booking confirmations and receipts. Skip it if you like: your bookings are always in My Bookings.
          </p>
        </div>
      )}

      {missing.includes('phone') && (
        <div>
          <FieldLabelText htmlFor="cp-phone">Mobile number</FieldLabelText>
          <PhoneNumberInput id="cp-phone" onValueChange={setPhone} required autoFocus={!missing.includes('name')} />
          <p className="mt-1.5 text-xs text-muted-foreground">So the property can reach you about your stay.</p>
        </div>
      )}

      <FormError message={error} />

      <PillButton type="submit" busy={busy} className="mt-1">
        Continue
      </PillButton>
    </form>
  )
}
