import { createClient } from '@/lib/db/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefundsTable } from '@/components/admin/RefundsTable'
import { DollarSign, TrendingDown, Clock, CheckCircle } from '@/components/icons'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatCard } from '@/components/admin/StatCard'

export default async function AdminRefundsPage() {
  const db = await createClient()

  // Get refund statistics — join both hotel and boat bookings
  const { data: refunds } = await db
    .from('refund_transactions')
    .select(`
      *,
      booking:bookings!booking_id(booking_reference, total_amount, check_in_date),
      boat_booking:boat_bookings!boat_booking_id(booking_reference, total_amount, trip_date),
      payment:payments(payment_gateway_payment_id, amount)
    `)
    .order('created_at', { ascending: false })

  const totalRefunds = refunds?.length || 0
  const totalRefundAmount = refunds?.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0) || 0
  const pendingRefunds = refunds?.filter(r => r.status === 'pending_approval').length || 0
  const completedRefunds = refunds?.filter(r => r.status === 'completed').length || 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Refund Management"
        description="Track and manage all refund requests and cancellations"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Refunds" value={totalRefunds} icon={TrendingDown} hint="All time" />
        <StatCard
          label="Total Amount"
          value={`₹${Math.round(totalRefundAmount).toLocaleString('en-IN')}`}
          icon={DollarSign}
          hint="Refunded to customers"
          tone="violet"
        />
        <StatCard
          label="Pending Approval"
          value={pendingRefunds}
          icon={Clock}
          hint="Awaiting admin review"
          tone="warning"
        />
        <StatCard
          label="Completed"
          value={completedRefunds}
          icon={CheckCircle}
          hint="Successfully processed"
          tone="success"
        />
      </div>

      {/* Refunds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Refund Transactions</CardTitle>
          <CardDescription>
            View and manage all refund requests with 48-hour cancellation policy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RefundsTable refunds={refunds || []} />
        </CardContent>
      </Card>
    </div>
  )
}
