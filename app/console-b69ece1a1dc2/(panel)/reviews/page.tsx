import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReviewsTable } from '@/components/admin/ReviewsTable'
import { getAdminHotelReviews, getAdminBoatReviews } from '@/lib/actions/admin-reviews'
import { Star, Clock, CheckCircle, XCircle } from '@/components/icons'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatCard } from '@/components/admin/StatCard'

export default async function AdminReviewsPage() {
  const [hotelResult, boatResult] = await Promise.all([
    getAdminHotelReviews(),
    getAdminBoatReviews(),
  ])

  const hotelReviews = hotelResult.reviews ?? []
  const boatReviews  = boatResult.reviews  ?? []
  const allReviews   = [...hotelReviews, ...boatReviews]

  const totalPending  = allReviews.filter((r) => r.status === 'pending').length
  const totalApproved = allReviews.filter((r) => r.status === 'approved').length
  const totalRejected = allReviews.filter((r) => r.status === 'rejected').length
  const totalAll      = allReviews.length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Review Moderation"
        description="Approve or reject guest reviews before they appear publicly on hotel and boat pages"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Reviews" value={totalAll} icon={Star} hint="Hotel + Boat combined" />
        <StatCard
          label="Pending Approval"
          value={totalPending}
          icon={Clock}
          hint="Awaiting moderation"
          tone="warning"
          toneValue
        />
        <StatCard
          label="Approved"
          value={totalApproved}
          icon={CheckCircle}
          hint="Visible to guests"
          tone="success"
          toneValue
        />
        <StatCard
          label="Rejected"
          value={totalRejected}
          icon={XCircle}
          hint="Hidden from guests"
          tone="danger"
          toneValue
        />
      </div>

      {(!hotelResult.success || !boatResult.success) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-700">
            {!hotelResult.success && <p>Failed to load hotel reviews: {hotelResult.error}</p>}
            {!boatResult.success && <p>Failed to load boat reviews: {boatResult.error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Reviews</CardTitle>
          <CardDescription>
            Reviews are hidden until approved. Pending reviews are shown with a badge count.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewsTable hotelReviews={hotelReviews} boatReviews={boatReviews} />
        </CardContent>
      </Card>
    </div>
  )
}
