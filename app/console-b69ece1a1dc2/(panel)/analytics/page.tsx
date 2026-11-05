import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from '@/components/icons'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Analytics & Reports" description="View detailed analytics and generate reports" />

      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>
            Revenue, occupancy, and booking trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Analytics Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              This feature will provide charts, graphs, and detailed reports on revenue, bookings, and hotel performance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
