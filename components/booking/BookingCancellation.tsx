'use client'

import { useRef, useState } from 'react'
import { isFuture } from 'date-fns'
import { AlertCircle, CheckCircle2, ChevronRight, XCircle } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cancelBooking } from '@/lib/actions/bookings'
import { formatBookingDate } from '@/lib/utils/booking-display'

const REASONS = ['Change of plans', 'Found a better option', 'Medical / health reasons', 'Travel restrictions', 'Personal emergency', 'Other']

interface CancellationBooking {
  id: string
  booking_reference: string
  booking_status: string
  payment_status: string
  check_in_date: string
  check_out_date: string
  hotel: { name: string } | null
}

/** Cancellation lives with the support actions in the booking details' Need help section. */
export function BookingCancellation({ booking, onCancelled }: { booking: CancellationBooking; onCancelled: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [reasonError, setReasonError] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<'reason' | 'confirm' | 'success'>('reason')
  const inFlight = useRef(false)
  const paidAtStart = useRef(false)

  const canCancel = booking.booking_status === 'confirmed' && isFuture(new Date(booking.check_in_date))
  // Keep the success dialog mounted when the parent updates this booking to cancelled.
  if (!canCancel && !open) return null

  const startCancellation = () => {
    paidAtStart.current = booking.payment_status === 'paid'
    setStep('reason')
    setReason(''); setOtherReason(''); setReasonError(false); setError(''); setOpen(true)
  }

  const reviewCancellation = () => {
    if (!reason || (reason === 'Other' && !otherReason.trim())) { setReasonError(true); return }
    setReasonError(false); setError(''); setStep('confirm')
  }

  const confirmCancellation = async () => {
    if (inFlight.current || step !== 'confirm') return
    const resolvedReason = reason === 'Other' ? otherReason.trim() : reason
    if (!resolvedReason) { setReasonError(true); return }
    inFlight.current = true
    setReasonError(false); setError(''); setBusy(true)
    try {
      if (booking.payment_status === 'paid') {
        const response = await fetch('/api/payment/refund', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id, reason: resolvedReason, isAdminInitiated: false, bookingType: 'hotel' }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to cancel booking')
      } else {
        const result = await cancelBooking(booking.id, resolvedReason)
        if (!result.success) throw new Error(result.error || 'Failed to cancel booking')
      }
      setStep('success')
      onCancelled()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel booking. Please try again.')
    } finally { inFlight.current = false; setBusy(false) }
  }

  return <>
    {canCancel && step !== 'success' && <button type="button" onClick={startCancellation} className="group flex w-full items-center gap-3 py-3 text-left last:pb-0">
      <XCircle className="h-5 w-5 shrink-0 text-destructive" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-destructive group-hover:underline">Cancel booking</span>
        <span className="block text-xs text-muted-foreground">Review the cancellation and refund terms</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>}
    <Dialog open={open} onOpenChange={value => { if (!inFlight.current) setOpen(value) }}>
      <DialogContent showCloseButton={!busy} className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto rounded-2xl border-border bg-card p-0 sm:max-w-[460px]">
        <DialogHeader className="px-5 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3 pr-7">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${step === 'success' ? 'bg-mint text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {step === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </span>
            <div className="space-y-1.5">
              <DialogTitle className="text-lg leading-snug">{step === 'success' ? 'Booking cancelled' : step === 'confirm' ? 'Confirm cancellation' : 'Cancel booking'}</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                {step === 'success' ? 'Your cancellation is confirmed.' : step === 'confirm' ? 'Please review before you continue.' : 'Let us know why your plans have changed.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-5 pb-5 sm:px-6">
          <div className="rounded-xl border border-border bg-background/60 p-3.5 text-sm">
            <p className="break-words font-semibold text-foreground">{booking.hotel?.name || 'Property unavailable'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatBookingDate(booking.check_in_date, 'd MMM')} – {formatBookingDate(booking.check_out_date, 'd MMM yyyy')}</p>
            <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">Booking ID <span className="font-medium text-foreground">{booking.booking_reference}</span></p>
          </div>
          {step === 'reason' && <div className="space-y-2.5">
            <Label htmlFor="booking-cancel-reason">Reason for cancellation <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={value => { setReason(value); setReasonError(false) }}>
              <SelectTrigger id="booking-cancel-reason" aria-invalid={reasonError && !reason} aria-describedby={reasonError && !reason ? 'booking-cancel-reason-error' : undefined} className="w-full rounded-xl shadow-none data-[size=default]:h-11">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>{REASONS.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
            {reason === 'Other' && <div className="space-y-1.5 pt-1">
              <Label htmlFor="booking-cancel-other">Your reason</Label>
              <Textarea id="booking-cancel-other" aria-invalid={reasonError} aria-describedby={reasonError ? 'booking-cancel-reason-error' : undefined} value={otherReason} onChange={event => { setOtherReason(event.target.value); setReasonError(false) }} placeholder="Please describe your reason…" rows={3} />
            </div>}
            {reasonError && <p id="booking-cancel-reason-error" role="alert" className="text-xs text-destructive">{reason ? 'Please enter your reason for cancellation.' : 'Please select a reason before continuing.'}</p>}
          </div>}
          {step === 'confirm' && <div className="space-y-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Reason</p><p className="mt-1 break-words font-medium text-foreground">{reason === 'Other' ? otherReason.trim() : reason}</p></div>
            <p className="font-medium text-foreground">Are you sure you want to cancel this booking?</p>
            <p className="text-xs leading-relaxed text-muted-foreground">Your reservation will be cancelled. This action cannot be undone.</p>
          </div>}
          {step === 'success' ? <div role="status" className="rounded-xl bg-mint p-3.5 text-sm leading-relaxed text-secondary">
            {paidAtStart.current ? 'Your refund request has been submitted for review. Approved refunds usually reach the original payment method within 5–7 business days.' : 'Your reservation has been cancelled successfully.'}
          </div> : <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{paidAtStart.current ? 'Any refund follows the policy saved with your booking and is subject to review.' : 'This reservation will no longer be held for you after cancellation.'}</span>
          </p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="border-t border-border bg-background/50 px-5 py-4 sm:px-6">
          {step === 'success' ? <Button className="w-full" onClick={() => setOpen(false)}>Done</Button> : <>
            <Button variant="outline" disabled={busy} onClick={() => step === 'confirm' ? setStep('reason') : setOpen(false)}>{step === 'confirm' ? 'Back' : 'Keep booking'}</Button>
            {step === 'reason'
              ? <Button onClick={reviewCancellation}>Review cancellation</Button>
              : <Button variant="destructive" disabled={busy} onClick={confirmCancellation}>{busy ? 'Cancelling…' : 'Yes, cancel booking'}</Button>}
          </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
