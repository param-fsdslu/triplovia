'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DollarSign, Loader2 } from '@/components/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { formatRupees } from '@/lib/utils'

interface RefundButtonProps {
  bookingId: string
  bookingReference: string
  totalAmount: number
  checkInDate: string
  paymentStatus: string
  status: string
}

export function RefundButton({
  bookingId,
  bookingReference,
  totalAmount,
  checkInDate,
  paymentStatus,
  status,
}: RefundButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [vendorCancelled, setVendorCancelled] = useState(false)
  const [policyEligibility, setRefundEligibility] = useState<any>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [editedAmount, setEditedAmount] = useState('')
  const [isEditingAmount, setIsEditingAmount] = useState(false)

  const refundEligibility = vendorCancelled ? { ...policyEligibility, eligible: true, refundAmount: totalAmount, cancellationCharge: 0, policyApplied: 'vendor-cancellation-full-refund', message: 'Vendor cancellation: 100% refund of the advance paid, due within 48 hours. Full Triplovia commission remains payable.' } : policyEligibility

  const checkEligibility = async () => {
    try {
      const response = await fetch(`/api/payment/refund?bookingId=${bookingId}`)
      const data = await response.json()
      setRefundEligibility(data)
      setVendorCancelled(false)
      setEditedAmount(data.refundAmount != null ? Number(data.refundAmount).toFixed(2) : '')
      setIsEditingAmount(false)
      setIsOpen(true)
    } catch (err) {
      console.error('Error checking eligibility:', err)
      setError('Failed to check refund eligibility')
    }
  }

  const parsedEditedAmount = parseFloat(editedAmount)
  const isAmountOverridden =
    isEditingAmount &&
    Number.isFinite(parsedEditedAmount) &&
    Math.round(parsedEditedAmount * 100) !== Math.round((refundEligibility?.refundAmount ?? 0) * 100)
  const isEditedAmountValid =
    Number.isFinite(parsedEditedAmount) && parsedEditedAmount >= 0 && parsedEditedAmount <= totalAmount

  const processRefund = async () => {
    if (isEditingAmount && !isEditedAmountValid) {
      setError(`Refund amount must be between ₹0 and ${formatRupees(totalAmount)}`)
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/payment/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          reason: reason || 'Admin initiated refund',
          isAdminInitiated: true,
          vendorCancelled,
          ...(isAmountOverridden ? { overrideAmount: parsedEditedAmount } : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Refund failed')
      }

      alert(
        `Refund processed successfully!\n\nRefund ID: ${data.refund.refundId}\nAmount: ${formatRupees(data.refund.refundAmount)}\n\nThe refund will be credited within ${data.refund.estimatedDays}.`
      )
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to process refund')
    } finally {
      setIsProcessing(false)
    }
  }

  // Don't show button if not eligible
  if (status === 'cancelled' || paymentStatus !== 'paid') {
    return null
  }

  return (
    <>
      <Button variant="destructive" onClick={checkEligibility}>
        <DollarSign className="h-4 w-4 mr-2" />
        Process Refund
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Booking: {bookingReference}. Normal refunds usually take 5–7 business days.
            </DialogDescription>
          </DialogHeader>

          <label className="flex items-start gap-2 text-sm"><Checkbox checked={vendorCancelled} onCheckedChange={value => { setVendorCancelled(value === true); setEditedAmount(String(value === true ? totalAmount : policyEligibility?.refundAmount ?? 0)); setIsEditingAmount(false) }} />Cancelled by the vendor (mandatory 100% refund)</label>
          {refundEligibility && (
            <div className="space-y-4">
              {/* Eligibility Status */}
              <div className="bg-background p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Eligibility Status</span>
                  <Badge variant={refundEligibility.eligible ? 'default' : 'destructive'}>
                    {refundEligibility.eligible ? 'Eligible' : 'Not Eligible'}
                  </Badge>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours until check-in:</span>
                    <span className="font-semibold">
                      {refundEligibility.hoursUntilCheckIn}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Policy Applied:</span>
                    <span className="font-semibold text-xs">
                      {refundEligibility.policyApplied}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              {refundEligibility.eligible && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Refund Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Paid:</span>
                      <span>{formatRupees(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Cancellation Charge:</span>
                      <span>
                        -{formatRupees(refundEligibility.cancellationCharge)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center font-semibold text-base">
                      <span>Calculated Refund:</span>
                      <span className="text-green-600">
                        {formatRupees(refundEligibility.refundAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="editedAmount" className="text-sm font-semibold">
                        Final Refund Amount
                      </Label>
                      {!isEditingAmount && !vendorCancelled && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => setIsEditingAmount(true)}
                        >
                          Edit amount
                        </Button>
                      )}
                    </div>
                    <Input
                      id="editedAmount"
                      type="number"
                      min={0}
                      max={totalAmount}
                      step="0.01"
                      value={editedAmount}
                      onChange={(e) => setEditedAmount(e.target.value)}
                      disabled={vendorCancelled || !isEditingAmount}
                    />
                    <p className="text-xs text-muted-foreground">
                      Cannot exceed the amount paid ({formatRupees(totalAmount)}).
                    </p>
                    {isEditingAmount && !isEditedAmountValid && (
                      <p className="text-xs text-red-600">
                        Enter an amount between ₹0 and {formatRupees(totalAmount)}.
                      </p>
                    )}
                    {isAmountOverridden && isEditedAmountValid && (
                      <p className="text-xs text-amber-600">
                        This overrides the calculated amount — the change will be recorded against your account.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="bg-mint border border-border rounded p-3">
                <p className="text-sm text-secondary">{refundEligibility.message}</p>
              </div>

              {/* Reason Input */}
              {refundEligibility.eligible && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Refund Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter reason for refund..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Policy Note */}
              <div className="text-xs text-muted-foreground bg-background p-3 rounded">
                Refunds use the cancellation policy saved when this booking was created.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            {refundEligibility?.eligible && (
              <Button
                variant="destructive"
                onClick={processRefund}
                disabled={isProcessing || (isEditingAmount && !isEditedAmountValid)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Confirm Refund
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
