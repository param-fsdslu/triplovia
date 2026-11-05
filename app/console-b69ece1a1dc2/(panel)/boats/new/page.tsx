import { BoatForm } from '@/components/admin/BoatForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ADMIN_PATH } from '@/lib/config/admin-path'

export default function NewBoatPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Add New Boat"
        description="Create a new boat listing"
        backHref={`${ADMIN_PATH}/boats`}
      />

      <Card>
        <CardHeader><CardTitle>Boat Details</CardTitle></CardHeader>
        <CardContent><BoatForm /></CardContent>
      </Card>
    </div>
  )
}
