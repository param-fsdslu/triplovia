'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { completeProfile } from '@/lib/actions/auth'
import { VerifiedPhoneInput } from '@/components/auth/VerifiedPhoneInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

/** Existing signed-in accounts can prove a phone and recover guest bookings without signing out. */
export function GuestBookingRecovery({ phone, firstName, lastName }: { phone?: string; firstName?: string; lastName?: string }) {
  const router = useRouter()
  const [givenName, setGivenName] = useState(firstName ?? '')
  const [familyName, setFamilyName] = useState(lastName ?? '')
  const [open, setOpen] = useState(false)
  const [proof, setProof] = useState<{ phone: string; idToken: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function recover() {
    if (!proof || busy) return
    setBusy(true); setError('')
    try {
      const result = await completeProfile({ phone: proof.phone, phoneIdToken: proof.idToken, firstName: givenName, lastName: familyName })
      if (!result.success) { setError(result.error); return }
      router.refresh()
      setOpen(false)
    } catch { setError('Could not recover your bookings. Please try again.') }
    finally { setBusy(false) }
  }
  return <section className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
    <h2 className="font-heading text-base font-bold text-foreground">Booked without signing in?</h2>
    <p className="mt-1 text-sm text-muted-foreground">Verify the mobile number used for your guest booking to add it to My Bookings.</p>
    {open ? <div className="mt-4 max-w-sm space-y-3">
      {!firstName && <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="recover-first-name">First name</Label><Input id="recover-first-name" value={givenName} onChange={event => setGivenName(event.target.value)} autoComplete="given-name" /></div>
        <div><Label htmlFor="recover-last-name">Last name</Label><Input id="recover-last-name" value={familyName} onChange={event => setFamilyName(event.target.value)} autoComplete="family-name" /></div>
      </div>}
      <VerifiedPhoneInput id="recover-booking-phone" defaultValue={phone} onVerified={setProof} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={!proof || busy || (!firstName && (!givenName.trim() || !familyName.trim()))} onClick={recover}>{busy ? 'Finding bookings…' : 'Find my bookings'}</Button>
    </div> : <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>Verify mobile number</Button>}
  </section>
}
