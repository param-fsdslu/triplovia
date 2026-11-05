'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Mail,
  Phone,
  User,
  Users,
  Download,
  Printer,
  Home,
  AlertCircle,
  Clock,
  CreditCard,
  Ship,
  XCircle,
  Star,
  Loader2,
} from '@/components/icons'
import { format } from 'date-fns'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getBoatBookingByReference } from '@/lib/actions/boat-bookings'
import { getBoatReviewByBookingId } from '@/lib/actions/boat-reviews'
import { BoatReviewDialog } from '@/components/reviews/BoatReviewDialog'

const CANCEL_REASONS = [
  'Change of plans',
  'Found a better option',
  'Medical / health reasons',
  'Travel restrictions',
  'Personal emergency',
  'Other',
]

interface BoatBookingConfirmationProps {
  bookingReference: string
}

export function BoatBookingConfirmation({ bookingReference }: BoatBookingConfirmationProps) {
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [refundEligibility, setRefundEligibility] = useState<any>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelReasonOther, setCancelReasonOther] = useState('')
  const [cancelReasonError, setCancelReasonError] = useState(false)
  const [existingReview, setExistingReview] = useState<any>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const result = await getBoatBookingByReference(bookingReference)
        if (!result.success) {
          setError(result.error || 'Booking not found')
          return
        }
        setBooking(result.booking)

        // Check for existing review
        if (result.booking) {
          const reviewResult = await getBoatReviewByBookingId(result.booking.id)
          if (reviewResult.success && reviewResult.review) {
            setExistingReview(reviewResult.review)
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load booking')
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [bookingReference])

  const handlePrint = () => window.print()

  const handleDownloadInvoice = () => {
    const originalTitle = document.title
    document.title = `Invoice-${booking.booking_reference}`
    window.print()
    document.title = originalTitle
  }

  const handleCheckRefundEligibility = async () => {
    try {
      const response = await fetch(
        `/api/payment/refund?bookingId=${booking.id}&bookingType=boat`
      )
      const data = await response.json()
      setRefundEligibility(data)
      setShowCancelConfirm(true)
    } catch {
      setCancelError('Failed to check cancellation eligibility')
    }
  }

  const handleCancelBooking = async () => {
    const resolvedReason = cancelReason === 'Other' ? cancelReasonOther.trim() : cancelReason
    if (!resolvedReason) {
      setCancelReasonError(true)
      return
    }
    setCancelReasonError(false)
    setIsCancelling(true)
    setCancelError(null)

    try {
      const response = await fetch('/api/payment/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          bookingType: 'boat',
          reason: resolvedReason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setCancelError(data.error || 'Failed to cancel booking')
        return
      }

      // Refresh booking data
      const result = await getBoatBookingByReference(bookingReference)
      if (result.success) {
        setBooking(result.booking)
      }
      setShowCancelConfirm(false)
    } catch {
      setCancelError('Failed to process cancellation')
    } finally {
      setIsCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Booking Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error || 'The booking you are looking for does not exist or has been removed.'}
          </p>
          <Button onClick={() => router.push('/')}>
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  const boat = booking.boat
  const tripType = booking.trip_type
  const timeSlot = booking.time_slot

  return (
    <div className="space-y-6" id="booking-details">
      {/* Success Header */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <CardContent className="p-6 sm:p-8 md:p-12">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Booking Confirmed!</h1>
              <p className="text-base sm:text-lg text-muted-foreground">Your boat trip has been successfully booked</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-green-200 rounded-lg p-3 sm:p-4 inline-block">
              <p className="text-sm text-muted-foreground mb-1">Booking Reference</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground tracking-wider">{booking.booking_reference}</p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center pt-4">
              <Button onClick={handleDownloadInvoice} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download Invoice
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button onClick={() => router.push('/bookings')} variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Trip Details */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-mint to-background">
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-2">{boat?.name}</h3>
                <div className="flex items-start gap-2 text-muted-foreground mb-3">
                  <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    {boat?.departure_point && `${boat.departure_point}, `}
                    {boat?.city}, {boat?.state}
                  </p>
                </div>
                <Badge className="bg-primary">{tripType?.name}</Badge>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trip Date</p>
                      <p className="font-semibold text-foreground">
                        {format(new Date(booking.trip_date), 'EEE, MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time Slot</p>
                      <p className="font-semibold text-foreground">
                        {timeSlot?.start_time?.slice(0, 5)} - {timeSlot?.end_time?.slice(0, 5)}
                        {timeSlot?.label && ` (${timeSlot.label})`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Passengers</p>
                      <p className="font-semibold text-foreground">
                        {booking.num_adults} {booking.num_adults === 1 ? 'Adult' : 'Adults'}
                        {booking.num_children > 0 && `, ${booking.num_children} ${booking.num_children === 1 ? 'Child' : 'Children'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-semibold text-foreground">
                        {tripType?.duration_minutes} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {booking.special_requests && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Special Requests</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{booking.special_requests}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Guest Details */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-mint to-background">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Guest Name</p>
                  <p className="font-semibold text-foreground">{booking.guest_first_name} {booking.guest_last_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </p>
                  <p className="font-medium text-foreground break-all">{booking.guest_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </p>
                  <p className="font-medium text-foreground">{booking.guest_phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="bg-mint border-border">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-secondary">
              <strong>Important:</strong> A confirmation email has been sent to{' '}
              <strong>{booking.guest_email}</strong>. Please present this booking reference at the departure point.
            </AlertDescription>
          </Alert>

          {/* Cancellation Section */}
          {booking.booking_status === 'confirmed' && booking.payment_status === 'paid' && (
            <Card className="border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Need to Cancel?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Free cancellation is available if cancelled within the allowed window before your trip date.
                    </p>

                    {!showCancelConfirm ? (
                      <Button
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={handleCheckRefundEligibility}
                      >
                        Check Cancellation Eligibility
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        {refundEligibility && (
                          <div className={`p-3 rounded-lg text-sm ${
                            refundEligibility.eligible
                              ? 'bg-green-50 border border-green-200 text-green-800'
                              : 'bg-red-50 border border-red-200 text-red-800'
                          }`}>
                            <p className="font-medium mb-1">
                              {refundEligibility.eligible ? 'Refund Available' : 'No Refund Available'}
                            </p>
                            <p>{refundEligibility.message}</p>
                            {refundEligibility.refundAmount > 0 && (
                              <p className="mt-1 font-semibold">
                                Refund amount: ₹{Math.round(refundEligibility.refundAmount).toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Reason selector */}
                        <div className="space-y-2">
                          <Label className={cancelReasonError ? 'text-destructive' : ''}>
                            Reason for cancellation <span className="text-destructive">*</span>
                          </Label>
                          <div className="space-y-2">
                            {CANCEL_REASONS.map((reason) => (
                              <label
                                key={reason}
                                className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors has-checked:border-primary has-checked:bg-primary/5"
                              >
                                <input
                                  type="radio"
                                  name="boat-cancel-reason"
                                  value={reason}
                                  checked={cancelReason === reason}
                                  onChange={() => { setCancelReason(reason); setCancelReasonError(false) }}
                                  className="accent-primary"
                                />
                                <span className="text-sm">{reason}</span>
                              </label>
                            ))}
                          </div>

                          {cancelReason === 'Other' && (
                            <Textarea
                              placeholder="Please describe your reason..."
                              value={cancelReasonOther}
                              onChange={(e) => { setCancelReasonOther(e.target.value); setCancelReasonError(false) }}
                              rows={3}
                              className={cancelReasonError ? 'border-destructive' : ''}
                            />
                          )}

                          {cancelReasonError && (
                            <p className="flex items-center gap-1.5 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              Please select a reason before cancelling
                            </p>
                          )}
                        </div>

                        {cancelError && (
                          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md text-sm">
                            {cancelError}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            disabled={isCancelling}
                            onClick={handleCancelBooking}
                          >
                            {isCancelling ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Cancelling...
                              </>
                            ) : (
                              'Confirm Cancellation'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowCancelConfirm(false)
                              setCancelReason('')
                              setCancelReasonOther('')
                              setCancelReasonError(false)
                              setCancelError(null)
                            }}
                            disabled={isCancelling}
                          >
                            Keep Booking
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancelled Status */}
          {booking.booking_status === 'cancelled' && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                This booking has been cancelled.
                {booking.payment_status === 'refunded' && ' A full refund has been processed.'}
                {booking.payment_status === 'partially_refunded' && ' A partial refund has been processed.'}
                {booking.cancellation_reason && (
                  <span className="block mt-1 text-sm">Reason: {booking.cancellation_reason}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Review Section */}
          {(booking.booking_status === 'completed' || booking.payment_status === 'paid') && (
            <Card className="border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-gold mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {existingReview ? 'Your Review' : 'Rate Your Experience'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {existingReview
                        ? 'Thank you for sharing your feedback!'
                        : 'Share your trip experience to help other travelers.'}
                    </p>
                    <Button
                      variant="outline"
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      onClick={() => setShowReviewDialog(true)}
                    >
                      {existingReview ? 'View Review' : 'Write a Review'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Dialog */}
          {booking.boat && (
            <BoatReviewDialog
              booking={{
                id: booking.id,
                booking_reference: booking.booking_reference,
                boat: {
                  id: booking.boat_id,
                  name: booking.boat.name,
                },
                trip_date: booking.trip_date,
              }}
              existingReview={existingReview}
              open={showReviewDialog}
              onOpenChange={setShowReviewDialog}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4 sm:space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3 text-sm">
                  {booking.pricing_model === 'per_person' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          ₹{Number(booking.price_per_person).toLocaleString('en-IN')} × {booking.num_adults} adult{booking.num_adults > 1 ? 's' : ''}
                        </span>
                        <span className="font-medium">
                          ₹{(Number(booking.price_per_person) * booking.num_adults).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {booking.num_children > 0 && booking.child_price_per_person > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            ₹{Number(booking.child_price_per_person).toLocaleString('en-IN')} × {booking.num_children} child{booking.num_children > 1 ? 'ren' : ''}
                          </span>
                          <span className="font-medium">
                            ₹{(Number(booking.child_price_per_person) * booking.num_children).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Boat (flat rate)</span>
                      <span className="font-medium">₹{Number(booking.price_per_boat).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST ({booking.tax_percentage}%)</span>
                    <span className="font-medium">₹{Math.round(Number(booking.tax_amount)).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold">Total Paid</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      ₹{Math.round(Number(booking.total_amount)).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground">Including all taxes</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Status</span>
                    <Badge
                      variant={booking.payment_status === 'paid' ? 'default' : booking.payment_status === 'pending' ? 'secondary' : 'destructive'}
                      className="capitalize"
                    >
                      {booking.payment_status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Booking Status</span>
                    <Badge
                      variant={booking.booking_status === 'confirmed' ? 'default' : booking.booking_status === 'cancelled' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {booking.booking_status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Boat */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {boat?.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a href={`tel:${boat.phone}`} className="text-sm font-medium text-primary hover:underline">
                        {boat.phone}
                      </a>
                    </div>
                  </div>
                )}
                {boat?.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${boat.email}`} className="text-sm font-medium text-primary hover:underline break-all">
                        {boat.email}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="bg-gradient-to-br from-mint to-background border-border">
              <CardHeader>
                <CardTitle className="text-base">What&apos;s Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground mb-1">Confirmation Email</p>
                    <p className="text-xs text-muted-foreground">Check your inbox for trip details</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground mb-1">Arrive Early</p>
                    <p className="text-xs text-muted-foreground">Reach the departure point 15 minutes before your slot</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground mb-1">Contact Us</p>
                    <p className="text-xs text-muted-foreground">For any changes or special requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
