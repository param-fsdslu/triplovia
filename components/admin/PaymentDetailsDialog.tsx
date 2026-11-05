'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPaymentDetails, updatePaymentStatus } from '@/lib/actions/admin'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Calendar, CreditCard, User, Hotel, BedDouble, DollarSign } from '@/components/icons'
import { RefundButton } from './RefundButton'

interface PaymentDetailsDialogProps {
  bookingId: string
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

export function PaymentDetailsDialog({
  bookingId,
  open,
  onClose,
  onUpdate,
}: PaymentDetailsDialogProps) {
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (open && bookingId) {
      loadPaymentDetails()
    }
  }, [open, bookingId])

  const loadPaymentDetails = async () => {
    setLoading(true)
    const result = await getPaymentDetails(bookingId)
    if (result.success && result.payment) {
      setPayment(result.payment)
      setNewStatus(result.payment.payment_status)
    }
    setLoading(false)
  }

  const handleUpdateStatus = async () => {
    if (newStatus === payment.payment_status) return

    setUpdating(true)
    const result = await updatePaymentStatus(bookingId, newStatus as any)
    if (result.success) {
      onUpdate()
      onClose()
    } else {
      alert(result.error || 'Failed to update payment status')
    }
    setUpdating(false)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      paid: { label: 'Paid', variant: 'default' },
      pending: { label: 'Pending', variant: 'secondary' },
      failed: { label: 'Failed', variant: 'destructive' },
      refunded: { label: 'Refunded', variant: 'outline' },
    }

    const config = variants[status] || { label: status, variant: 'secondary' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            View and manage payment transaction details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : payment ? (
          <div className="space-y-6">
            {/* Booking Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Booking Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Booking Reference</Label>
                  <p className="font-medium">{payment.booking_reference}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Booking Status</Label>
                  <p className="font-medium capitalize">{payment.booking_status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Check-in Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {new Date(payment.check_in_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Check-out Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {new Date(payment.check_out_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Guest Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Guest Name</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {payment.guest_first_name} {payment.guest_last_name}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{payment.guest_email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{payment.guest_phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Guests</Label>
                  <p className="font-medium">
                    {payment.num_adults} Adults, {payment.num_children} Children
                  </p>
                </div>
              </div>
            </div>

            {/* Hotel & Room Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Hotel & Room</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Hotel</Label>
                  <div className="flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{payment.hotels?.name || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Room Type</Label>
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{payment.room_types?.name || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Number of Rooms</Label>
                  <p className="font-medium">{payment.num_rooms}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Number of Nights</Label>
                  <p className="font-medium">{payment.num_nights}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Payment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <div className="mt-1">{getStatusBadge(payment.payment_status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium capitalize">
                      {payment.payment_method || 'N/A'}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <p className="font-medium text-sm">
                    {payment.payment_transaction_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">
                    {new Date(payment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="border rounded-lg p-4 space-y-2 bg-background">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per night</span>
                  <span className="font-medium">{formatCurrency(payment.price_per_night)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({payment.num_nights} nights × {payment.num_rooms} rooms)
                  </span>
                  <span className="font-medium">{formatCurrency(payment.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax & Fees</span>
                  <span className="font-medium">
                    {formatCurrency(payment.tax_amount + payment.service_fee)}
                  </span>
                </div>
                {payment.extra_bed_charge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extra bed / guest charge</span>
                    <span className="font-medium">{formatCurrency(payment.extra_bed_charge)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(payment.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            {payment.special_requests && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Special Requests</Label>
                <p className="text-sm border rounded-lg p-3 bg-background">
                  {payment.special_requests}
                </p>
              </div>
            )}

            {/* Refund Action */}
            {payment.payment_status === 'paid' && payment.booking_status !== 'cancelled' && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">Refund Management</h3>
                <div className="bg-background p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Process a refund for this booking based on the policy saved with the booking.
                  </p>
                  <RefundButton
                    bookingId={payment.id}
                    bookingReference={payment.booking_reference}
                    totalAmount={parseFloat(payment.total_amount)}
                    checkInDate={payment.check_in_date}
                    paymentStatus={payment.payment_status}
                    status={payment.booking_status}
                  />
                </div>
              </div>
            )}

            {/* Update Status */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">Update Payment Status</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="newStatus">New Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="newStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={updating || newStatus === payment.payment_status}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Status'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Payment not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
