import { notFound } from 'next/navigation'
import { checkIsSuperAdmin, getAdminUser } from '@/lib/utils/admin'
import { ActivityLogView } from '@/components/admin/ActivityLogView'

export default async function ActivityPage() {
  if (!(await checkIsSuperAdmin())) notFound()
  const admin = await getAdminUser()
  if (!admin) notFound()
  return <ActivityLogView userId={admin.id} />
}
