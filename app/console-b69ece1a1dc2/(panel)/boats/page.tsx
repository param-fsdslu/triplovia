import { getAllBoats } from '@/lib/actions/boat-admin'
import { BoatsTable } from '@/components/admin/BoatsTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from '@/components/icons'
import Link from 'next/link'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export default async function AdminBoatsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const city = typeof params.city === 'string' ? params.city : undefined
  const status = typeof params.status === 'string' ? params.status : undefined

  const result = await getAllBoats({ city, status, page, limit: 20 })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Boats Management"
        description="Manage all boats and trips"
        actions={
          <Button asChild>
            <Link href={`${ADMIN_PATH}/boats/new`}><Plus className="h-4 w-4 mr-2" />Add New Boat</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Boats</CardTitle>
          <CardDescription>
            {result.success ? `${result.pagination?.total || 0} total boats` : 'Failed to load boats'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <BoatsTable boats={result.boats} pagination={result.pagination} />
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
