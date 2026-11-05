import Link from 'next/link'
import { getBookingDetails } from '@/lib/actions/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Hotel as HotelIcon, Calendar, DollarSign, CreditCard, Mail, Phone, MapPin, Bed, Users, PawPrint, UtensilsCrossed, Building2, Download } from '@/components/icons'
import { invoiceUrl, isInvoiceable } from '@/lib/utils/invoice'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { BookingStatusUpdater } from '@/components/admin/BookingStatusUpdater'
import { RefundButton } from '@/components/admin/RefundButton'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatusPill } from '@/components/admin/StatusPill'

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  const [result, superAdmin] = await Promise.all([
    getBookingDetails(reference),
    checkIsSuperAdmin(),
  ])

  if (!result.success || !result.booking) {
    redirect(`${ADMIN_PATH}/bookings`)
  }

  const booking = result.booking

  const paymentStatusLabel = (status: string) =>
    status === 'partially_refunded' ? 'Partial Refund' : status

  const nights = Math.ceil(
    (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) /
      (1000 * 60 * 60 * 24)
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Booking Details"
        backHref={`${ADMIN_PATH}/bookings`}
        description={
          <>
            Reference: {booking.booking_reference}
            {booking.invoice_number && <> · Invoice {booking.invoice_number}</>}
          </>
        }
        actions={
          <>
            {isInvoiceable(booking) && (
              <Button variant="outline" size="sm" asChild>
                <a href={invoiceUrl(booking.booking_reference)} download>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download invoice
                </a>
              </Button>
            )}
            <StatusPill
              status={booking.booking_status}
              label={booking.booking_status}
              className="px-2.5 py-1 text-xs"
            />
            <StatusPill
              status={booking.payment_status}
              label={paymentStatusLabel(booking.payment_status)}
              className="px-2.5 py-1 text-xs"
            />
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Guest Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Guest Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {booking.guest_first_name} {booking.guest_last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{booking.guest_email || <span className="text-muted-foreground">Not given</span>}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{booking.guest_phone}</p>
              </div>
            </div>
            {booking.gst_number && (
              <div className="rounded-lg bg-mint/60 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  GST invoice details
                </p>
                <p className="font-mono text-sm font-medium tracking-wide">{booking.gst_number}</p>
                <p className="text-sm font-medium">{booking.gst_company_name}</p>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{booking.gst_company_address}</p>
              </div>
            )}
            {booking.user_id && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">User Account ID</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {booking.user_id}
                </p>
                {superAdmin && (
                  <Link
                    href={`${ADMIN_PATH}/users/${encodeURIComponent(booking.user_id)}`}
                    className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    View user profile
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hotel Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HotelIcon className="h-5 w-5" />
              Hotel Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Hotel Name</p>
              <p className="font-medium">{booking.hotel?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p>{booking.hotel?.address_line_1}</p>
                  {booking.hotel?.address_line_2 && <p>{booking.hotel.address_line_2}</p>}
                  <p>
                    {booking.hotel?.city}, {booking.hotel?.state} {booking.hotel?.postal_code}
                  </p>
                  <p>{booking.hotel?.country}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Hotel Phone</p>
                <p className="text-sm font-medium">{booking.hotel?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hotel Email</p>
                <p className="text-sm font-medium">{booking.hotel?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Check-in</p>
                <p className="font-medium">
                  {format(new Date(booking.check_in_date), 'MMM dd, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(booking.check_in_date), 'EEEE')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check-out</p>
                <p className="font-medium">
                  {format(new Date(booking.check_out_date), 'MMM dd, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(booking.check_out_date), 'EEEE')}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{nights} {nights === 1 ? 'night' : 'nights'}</p>
            </div>
            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">Room Type</p>
              <div className="flex items-center gap-2 mt-1">
                <Bed className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{booking.room_type?.name}</p>
              </div>
              {booking.room_type?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {booking.room_type.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Guests</p>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {booking.num_adults} {booking.num_adults === 1 ? 'adult' : 'adults'}
                    {booking.num_children > 0 &&
                      `, ${booking.num_children} ${booking.num_children === 1 ? 'child' : 'children'}`}
                  </p>
                </div>
                {booking.with_pets && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <PawPrint className="h-3.5 w-3.5" />
                    Travelling with pets
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rooms</p>
                <p className="font-medium">{booking.num_rooms}</p>
              </div>
            </div>
            {booking.special_requests && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Special Requests</p>
                <p className="text-sm mt-1">{booking.special_requests}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-primary">
                ₹{Math.round(booking.total_amount).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Base Price</p>
                <p className="font-medium">
                  ₹{Math.round(booking.base_price || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxes & Fees</p>
                <p className="font-medium">
                  ₹{Math.round(booking.tax_amount || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            {booking.meal_plan_total > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Meal Plan Total</p>
                <p className="font-medium">
                  ₹{Math.round(booking.meal_plan_total).toLocaleString('en-IN')}
                </p>
              </div>
            )}
            {booking.payment_id && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Payment ID</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-mono">{booking.payment_id}</p>
                </div>
              </div>
            )}
            {booking.razorpay_order_id && (
              <div>
                <p className="text-sm text-muted-foreground">Razorpay Order ID</p>
                <p className="text-sm font-mono">{booking.razorpay_order_id}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meal Plans */}
      {booking.booking_meal_plans && booking.booking_meal_plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Meal Plans
            </CardTitle>
            <CardDescription>
              Meal plans included in this booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background border-b">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Meal</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Price/Person</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Guests</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Nights</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.booking_meal_plans.map((mp: any) => (
                    <tr key={mp.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{mp.name}</td>
                      <td className="px-4 py-2 capitalize">{mp.meal_type}</td>
                      <td className="px-4 py-2 text-right">
                        ₹{Math.round(mp.price_per_person).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2 text-right">{mp.num_guests}</td>
                      <td className="px-4 py-2 text-right">{mp.num_nights}</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        ₹{Math.round(mp.total_amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-background">
                    <td colSpan={5} className="px-4 py-2 font-semibold text-right">
                      Meal Plan Total
                    </td>
                    <td className="px-4 py-2 font-bold text-right text-primary">
                      ₹{Math.round(
                        booking.booking_meal_plans.reduce((sum: number, mp: any) => sum + mp.total_amount, 0)
                      ).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Status Management</CardTitle>
          <CardDescription>
            Update the booking status and send notification to the guest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <BookingStatusUpdater
              bookingId={booking.id}
              currentStatus={booking.booking_status}
              isSuperAdmin={superAdmin}
            />

            {/* Refund Management — only super_admin can process refunds */}
            {superAdmin && booking.payment_status === 'paid' && booking.booking_status !== 'cancelled' && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Refund Management</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Process refund with 48-hour cancellation policy
                    </p>
                  </div>
                  <RefundButton
                    bookingId={booking.id}
                    bookingReference={booking.booking_reference}
                    totalAmount={parseFloat(booking.total_amount)}
                    checkInDate={booking.check_in_date}
                    paymentStatus={booking.payment_status}
                    status={booking.booking_status}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="text-xs font-mono">{booking.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="text-sm">
                {format(new Date(booking.created_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Updated At</p>
              <p className="text-sm">
                {format(new Date(booking.updated_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="text-xs font-mono">{booking.user_id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
