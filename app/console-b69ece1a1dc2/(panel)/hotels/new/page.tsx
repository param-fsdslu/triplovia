import { HotelForm } from '@/components/admin/HotelForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ADMIN_PATH } from '@/lib/config/admin-path'

export default function NewHotelPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Add New Hotel"
        description="Create a new hotel property"
        backHref={`${ADMIN_PATH}/hotels`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Hotel Information</CardTitle>
          <CardDescription>
            Fill in the details below to add a new hotel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HotelForm />
        </CardContent>
      </Card>
    </div>
  )
}
