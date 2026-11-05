import { redirect } from 'next/navigation'
import { CalendarCheck, LogIn, UserPlus, Users as UsersIcon } from '@/components/icons'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getWebsiteUsers } from '@/lib/actions/website-users'
import { WebsiteUsersTable } from '@/components/admin/WebsiteUsersTable'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatCard } from '@/components/admin/StatCard'

export const metadata = {
  title: 'Users - Admin Dashboard',
  description: 'Guests who have an account on the website',
}

const DAY_MS = 24 * 60 * 60 * 1000

export default async function WebsiteUsersPage() {
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect(ADMIN_PATH)
  }

  const { users, error } = await getWebsiteUsers()

  const since = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const joinedRecently = users.filter((u) => u.createdAt && u.createdAt >= since).length
  const activeRecently = users.filter((u) => u.lastSignIn && u.lastSignIn >= since).length
  const withPaidBooking = users.filter((u) => u.paidBookings > 0).length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        icon={UsersIcon}
        description="Everyone who has signed in on the website with a mobile number, Google or email. Hotel owners and admins are under Vendors."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={users.length} icon={UsersIcon} hint="Accounts on the website" />
        <StatCard label="New" value={joinedRecently} icon={UserPlus} hint="Joined in the last 30 days" tone="info" />
        <StatCard label="Active" value={activeRecently} icon={LogIn} hint="Signed in in the last 30 days" tone="success" />
        <StatCard
          label="Booked"
          value={withPaidBooking}
          icon={CalendarCheck}
          hint="With at least one paid booking"
          tone="violet"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading users</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <WebsiteUsersTable users={users} />
    </div>
  )
}
