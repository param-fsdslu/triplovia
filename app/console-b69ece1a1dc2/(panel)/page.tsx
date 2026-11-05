import { getAdminHotelsList, getAdminStats, getRecentActivity } from '@/lib/actions/admin'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { DashboardView } from '@/components/admin/DashboardView'
import { getAdminHotelAccess } from '@/lib/utils/admin'

export default async function AdminDashboard() {
  const [statsResult, activityResult, access] = await Promise.all([
    getAdminStats(),
    getRecentActivity(10),
    getAdminHotelAccess(),
  ])

  const stats = statsResult.success ? statsResult.stats : null
  const activities = activityResult.success ? activityResult.activities : []

  if (!stats) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Admin Dashboard" />
        <p className="text-red-600">Failed to load statistics</p>
      </div>
    )
  }

  // The booking calendar is for hotel admins, over their own hotels
  const calendarHotels = access?.role === 'hotel_admin' ? await getAdminHotelsList() : null

  return <DashboardView stats={stats} activities={activities as any[]} calendarHotels={calendarHotels} />
}
