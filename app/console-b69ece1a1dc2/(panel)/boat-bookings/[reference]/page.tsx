import { getBoatBookingDetails } from '@/lib/actions/boat-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/admin/StatusPill'
import { redirect } from 'next/navigation'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export default async function BoatBookingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  const result = await getBoatBookingDetails(reference)

  if (!result.success || !result.booking) {
    redirect(`${ADMIN_PATH}/boat-bookings`)
  }

  const b = result.booking

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Boat Booking Details"
        description={`Reference: ${b.booking_reference}`}
        backHref={`${ADMIN_PATH}/boat-bookings`}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Guest Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{b.guest_first_name} {b.guest_last_name}</p></div>
            <div><p className="text-sm text-muted-foreground">Email</p><p>{b.guest_email}</p></div>
            <div><p className="text-sm text-muted-foreground">Phone</p><p>{b.guest_phone}</p></div>
            {b.special_requests && <div><p className="text-sm text-muted-foreground">Special Requests</p><p>{b.special_requests}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Boat Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Boat</p><p className="font-medium">{b.boat?.name}</p></div>
            <div><p className="text-sm text-muted-foreground">Departure Point</p><p>{b.boat?.departure_point}</p></div>
            <div><p className="text-sm text-muted-foreground">Location</p><p>{b.boat?.city}, {b.boat?.state}</p></div>
            {b.boat?.phone && <div><p className="text-sm text-muted-foreground">Contact</p><p>{b.boat.phone}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trip Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Trip Type</p><p className="font-medium">{b.trip_type?.name}</p></div>
            <div><p className="text-sm text-muted-foreground">Date</p><p>{b.trip_date}</p></div>
            <div><p className="text-sm text-muted-foreground">Time Slot</p><p>{b.time_slot?.start_time?.slice(0,5)} - {b.time_slot?.end_time?.slice(0,5)} {b.time_slot?.label && `(${b.time_slot.label})`}</p></div>
            <div><p className="text-sm text-muted-foreground">Duration</p><p>{b.trip_type?.duration_minutes} minutes</p></div>
            <div><p className="text-sm text-muted-foreground">Passengers</p><p>{b.num_adults} adult(s){b.num_children > 0 ? `, ${b.num_children} child(ren)` : ''}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Pricing Model</p><p className="capitalize">{b.pricing_model?.replace('_', ' ')}</p></div>
            <div><p className="text-sm text-muted-foreground">Subtotal</p><p>₹{Number(b.subtotal).toLocaleString('en-IN')}</p></div>
            <div><p className="text-sm text-muted-foreground">Tax ({b.tax_percentage}%)</p><p>₹{Number(b.tax_amount).toLocaleString('en-IN')}</p></div>
            <div className="border-t pt-2"><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold">₹{Number(b.total_amount).toLocaleString('en-IN')}</p></div>
            <div className="flex gap-2 pt-2">
              <StatusPill status={b.payment_status} label={`Payment: ${b.payment_status}`} className="px-2.5 py-1 text-xs" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <StatusPill status={b.booking_status} label={`Booking: ${b.booking_status}`} className="px-2.5 py-1 text-xs" />
            </div>
            {b.cancelled_at && <div><p className="text-sm text-muted-foreground">Cancelled At</p><p>{new Date(b.cancelled_at).toLocaleString()}</p></div>}
            {b.cancellation_reason && <div><p className="text-sm text-muted-foreground">Reason</p><p>{b.cancellation_reason}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>System Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Booking ID</p><p className="font-mono text-xs">{b.id}</p></div>
            <div><p className="text-sm text-muted-foreground">Created</p><p>{new Date(b.created_at).toLocaleString()}</p></div>
            <div><p className="text-sm text-muted-foreground">Updated</p><p>{new Date(b.updated_at).toLocaleString()}</p></div>
            <div><p className="text-sm text-muted-foreground">Source</p><p>{b.booking_source}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
