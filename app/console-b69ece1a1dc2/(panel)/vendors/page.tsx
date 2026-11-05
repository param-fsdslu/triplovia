import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getAllAdminUsers } from '@/lib/actions/users'
import { VendorsTable } from '@/components/admin/VendorsTable'
import { CreateVendorDialog } from '@/components/admin/CreateVendorDialog'
import { Store } from '@/components/icons'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export const metadata = {
  title: 'Vendors - Admin Dashboard',
  description: 'Manage vendors (panel accounts) and their hotel access',
}

export default async function VendorsPage() {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect(ADMIN_PATH)
  }

  // Get all admin users
  const { users, error } = await getAllAdminUsers()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vendors"
        icon={Store}
        description="Hotel owners and admins who sign in to this panel, and the hotels each one manages"
        actions={<CreateVendorDialog />}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading vendors</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Vendors Table */}
      <VendorsTable users={users} />
    </div>
  )
}
