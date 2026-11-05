'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { Eye, Check, X, Loader2, ExternalLink, Copy } from '@/components/icons'
import { ExportButtons } from './ExportButtons'
import type { ExportColumn } from '@/lib/utils/export'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { approveRefundRequest, rejectRefundRequest } from '@/lib/actions/admin'

interface RefundTransaction {
  id: string
  booking_id: string | null
  boat_booking_id: string | null
  refund_gateway_id: string | null
  refund_amount: string
  cancellation_charge: string
  total_paid: string
  refund_reason: string | null
  is_full_refund: boolean
  processed_by: string
  status: string
  notes: string | null
  created_at: string
  completed_at: string | null
  error_message: string | null
  booking?: {
    booking_reference: string
    total_amount: string
    check_in_date: string
  } | null
  boat_booking?: {
    booking_reference: string
    total_amount: string
    trip_date: string
  } | null
  payment?: {
    payment_gateway_payment_id: string
    amount: string
  }
}

interface RefundsTableProps {
  refunds: RefundTransaction[]
}

export function RefundsTable({ refunds }: RefundsTableProps) {
  const router = useRouter()
  const [selectedRefund, setSelectedRefund] = useState<RefundTransaction | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectRefundId, setRejectRefundId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [approveRefund, setApproveRefund] = useState<RefundTransaction | null>(null)
  const [approveAmount, setApproveAmount] = useState('')

  const getStatusBadge = (status: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, title: string } => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, title: string }> = {
      pending_approval: { variant: 'outline',     label: 'Pending Approval', title: 'Customer cancelled — waiting for admin to approve or reject the refund' },
      processing:       { variant: 'secondary',   label: 'Processing',       title: 'Refund submitted to Razorpay — money in transit (5-7 days for normal, instant for optimum)' },
      completed:        { variant: 'default',     label: 'Refunded ✓',       title: 'Razorpay confirmed the refund was credited to the customer' },
      failed:           { variant: 'destructive', label: 'Failed',            title: 'Razorpay rejected the refund — see error details' },
      rejected:         { variant: 'destructive', label: 'Rejected',          title: 'Admin rejected the refund request — customer was notified' },
    }
    return map[status] || { variant: 'secondary', label: status, title: status }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const viewDetails = (refund: RefundTransaction) => {
    setSelectedRefund(refund)
    setIsDetailsOpen(true)
  }

  const openApproveDialog = (refund: RefundTransaction) => {
    setApproveRefund(refund)
    setApproveAmount(String(Math.round(parseFloat(refund.refund_amount))))
    setIsApproveOpen(true)
  }

  const approveTotalPaid = approveRefund ? parseFloat(approveRefund.total_paid) : 0
  const parsedApproveAmount = parseFloat(approveAmount)
  const isApproveAmountValid =
    Number.isFinite(parsedApproveAmount) && parsedApproveAmount >= 0 && parsedApproveAmount <= approveTotalPaid
  const isApproveAmountOverridden =
    approveRefund != null && Math.round(parsedApproveAmount) !== Math.round(parseFloat(approveRefund.refund_amount))

  const handleApprove = async () => {
    if (!approveRefund || !isApproveAmountValid) return
    setProcessing(approveRefund.id)
    try {
      const result = await approveRefundRequest(
        approveRefund.id,
        isApproveAmountOverridden ? parsedApproveAmount : undefined
      )
      if (result.success) {
        setIsApproveOpen(false)
        router.refresh()
      } else {
        alert(result.error || 'Failed to approve refund')
      }
    } catch {
      alert('Failed to approve refund')
    } finally {
      setProcessing(null)
    }
  }

  const openRejectDialog = (refundId: string) => {
    setRejectRefundId(refundId)
    setRejectReason('')
    setIsRejectOpen(true)
  }

  const handleReject = async () => {
    if (!rejectRefundId) return
    setProcessing(rejectRefundId)
    try {
      const result = await rejectRefundRequest(rejectRefundId, rejectReason || undefined)
      if (result.success) {
        setIsRejectOpen(false)
        router.refresh()
      } else {
        alert(result.error || 'Failed to reject refund')
      }
    } catch {
      alert('Failed to reject refund')
    } finally {
      setProcessing(null)
    }
  }

  const getActiveBooking = (refund: RefundTransaction) => refund.booking ?? refund.boat_booking ?? null

  const exportColumns: ExportColumn[] = [
    { header: 'Booking Ref', accessor: (r: any) => (r.booking ?? r.boat_booking)?.booking_reference || 'N/A' },
    { header: 'Refund Amount (₹)', accessor: (r: any) => Math.round(parseFloat(r.refund_amount)).toLocaleString('en-IN') },
    { header: 'Cancellation Charge (₹)', accessor: (r: any) => Math.round(parseFloat(r.cancellation_charge || '0')).toLocaleString('en-IN') },
    { header: 'Type', accessor: (r: any) => r.is_full_refund ? 'Full' : 'Partial' },
    { header: 'Status', accessor: 'status' },
    { header: 'Razorpay Refund ID', accessor: (r: any) => r.refund_gateway_id || 'N/A' },
    { header: 'Date', accessor: (r: any) => format(new Date(r.created_at), 'MMM dd, yyyy') },
    { header: 'Completed At', accessor: (r: any) => r.completed_at ? format(new Date(r.completed_at), 'MMM dd, yyyy HH:mm') : 'N/A' },
    { header: 'Processed By', accessor: (r: any) => r.processed_by },
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <ExportButtons rows={refunds} columns={exportColumns} filenamePrefix="refunds" title="Refund Transactions" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking Ref</TableHead>
              <TableHead>Refund Amount</TableHead>
              <TableHead>Cancellation Charge</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Razorpay Refund ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No refund transactions found
                </TableCell>
              </TableRow>
            ) : (
              refunds.map((refund) => {
                const statusInfo = getStatusBadge(refund.status)
                const isPendingApproval = refund.status === 'pending_approval'
                const isLoading = processing === refund.id
                const activeBooking = getActiveBooking(refund)
                return (
                  <TableRow key={refund.id}>
                    <TableCell className="font-medium">
                      {activeBooking?.booking_reference || 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ₹{Math.round(parseFloat(refund.refund_amount)).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {refund.cancellation_charge
                        ? `₹${Math.round(parseFloat(refund.cancellation_charge)).toLocaleString('en-IN')}`
                        : '₹0'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusInfo.variant}
                        title={statusInfo.title}
                        className="cursor-help"
                      >
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {refund.refund_gateway_id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            {refund.refund_gateway_id}
                          </span>
                          <button
                            onClick={() => copyToClipboard(refund.refund_gateway_id!)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy refund ID"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <a
                            href={`https://dashboard.razorpay.com/app/refunds/${refund.refund_gateway_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            title="View in Razorpay dashboard"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {refund.status === 'pending_approval' ? 'Not yet approved' : '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(refund.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(refund.created_at), 'HH:mm')}
                        {refund.completed_at && (
                          <span className="ml-1 text-green-600">
                            · done {format(new Date(refund.completed_at), 'dd MMM HH:mm')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewDetails(refund)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {isPendingApproval && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => openApproveDialog(refund)}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => openRejectDialog(refund.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Refund Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Refund Transaction Details</DialogTitle>
            <DialogDescription>
              Complete information about this refund transaction
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (() => {
            const activeBooking = getActiveBooking(selectedRefund)
            const isBoatRefund = !selectedRefund.booking && !!selectedRefund.boat_booking
            return (
            <div className="space-y-4">
              {/* Transaction Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-background rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="font-semibold">{activeBooking?.booking_reference ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="text-xs font-mono">{selectedRefund.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Razorpay Refund ID</p>
                  <p className="text-xs font-mono">
                    {selectedRefund.refund_gateway_id || 'Not yet processed'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadge(selectedRefund.status).variant}>
                    {getStatusBadge(selectedRefund.status).label}
                  </Badge>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Amount Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Paid Amount</span>
                    <span className="font-semibold">
                      ₹{Math.round(parseFloat(selectedRefund.total_paid)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Cancellation Charge</span>
                    <span className="font-semibold">
                      -₹
                      {Math.round(parseFloat(selectedRefund.cancellation_charge || '0')).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg">
                    <span className="font-semibold">Refund Amount</span>
                    <span className="font-bold text-green-600">
                      ₹{Math.round(parseFloat(selectedRefund.refund_amount)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedRefund.is_full_refund ? 'Full Refund' : 'Partial Refund'}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Refund Reason</p>
                  <p className="text-sm">{selectedRefund.refund_reason || 'No reason provided'}</p>
                </div>
                {selectedRefund.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Admin Notes</p>
                    <p className="text-sm">{selectedRefund.notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Processed By</p>
                    <Badge variant="outline" className="capitalize">
                      {selectedRefund.processed_by}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isBoatRefund ? 'Trip Date' : 'Check-in Date'}</p>
                    <p className="text-sm">
                      {isBoatRefund
                        ? (selectedRefund.boat_booking?.trip_date
                            ? format(new Date(selectedRefund.boat_booking.trip_date), 'MMM dd, yyyy')
                            : 'N/A')
                        : (selectedRefund.booking?.check_in_date
                            ? format(new Date(selectedRefund.booking.check_in_date), 'MMM dd, yyyy')
                            : 'N/A')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Requested At</p>
                    <p className="text-sm">
                      {format(new Date(selectedRefund.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  {selectedRefund.completed_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Completed At</p>
                      <p className="text-sm">
                        {format(new Date(selectedRefund.completed_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
                {selectedRefund.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800 font-semibold">Error</p>
                    <p className="text-sm text-red-700">{selectedRefund.error_message}</p>
                  </div>
                )}
              </div>

              {/* Policy Note */}
              <div className="bg-mint border border-border rounded p-3">
                <p className="text-sm text-secondary">
                  <strong>Cancellation Policy:</strong> Full refund available if cancelled
                  at least 48 hours before check-in/trip. No refund within 48 hours.
                </p>
              </div>
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this refund. The customer will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reason (optional)</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Cancellation was within 48 hours of check-in, no refund applicable per policy."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsRejectOpen(false)} disabled={!!processing}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!!processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Confirm Rejection'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Refund Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Refund</DialogTitle>
            <DialogDescription>
              Razorpay will be called immediately to process this refund. Review or adjust the amount before confirming.
            </DialogDescription>
          </DialogHeader>
          {approveRefund && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-medium">₹{Math.round(approveTotalPaid).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer-Requested Amount</span>
                <span className="font-medium">
                  ₹{Math.round(parseFloat(approveRefund.refund_amount)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approveAmount">Final Refund Amount</Label>
                <Input
                  id="approveAmount"
                  type="number"
                  min={0}
                  max={approveTotalPaid}
                  step="0.01"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Cannot exceed the amount paid (₹{Math.round(approveTotalPaid).toLocaleString('en-IN')}).
                </p>
                {!isApproveAmountValid && (
                  <p className="text-xs text-red-600">
                    Enter an amount between ₹0 and ₹{Math.round(approveTotalPaid).toLocaleString('en-IN')}.
                  </p>
                )}
                {isApproveAmountOverridden && isApproveAmountValid && (
                  <p className="text-xs text-amber-600">
                    This overrides the customer-requested amount — the change will be recorded against your account.
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsApproveOpen(false)} disabled={!!processing}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleApprove}
                  disabled={!!processing || !isApproveAmountValid}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    'Confirm Approval'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
