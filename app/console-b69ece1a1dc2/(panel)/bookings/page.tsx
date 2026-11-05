import { getAllBookings, getAdminHotelsList } from '@/lib/actions/admin'
import { BookingsTable } from '@/components/admin/BookingsTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import Link from 'next/link'
import { ADMIN_PATH } from '@/lib/config/admin-path'

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const status = typeof params.status === 'string' ? params.status : undefined
  const paymentStatus = typeof params.paymentStatus === 'string' ? params.paymentStatus : undefined
  const search = typeof params.search === 'string' ? params.search : undefined
  const dateFrom = typeof params.dateFrom === 'string' ? params.dateFrom : undefined
  const dateTo = typeof params.dateTo === 'string' ? params.dateTo : undefined
  const hotelId = typeof params.hotelId === 'string' ? params.hotelId : undefined
  const userId = typeof params.userId === 'string' ? params.userId : undefined

  const [result, hotels] = await Promise.all([
    getAllBookings({
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      hotelId,
      userId,
      page,
      limit: 20,
    }),
    getAdminHotelsList(),
  ])

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Bookings Management" description="Manage all hotel bookings" />

      {userId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-mint px-4 py-3 text-sm">
          <p className="text-foreground">Showing one user&apos;s bookings (from Users)</p>
          <div className="flex gap-4 font-medium">
            <Link href={`${ADMIN_PATH}/users`} className="text-primary hover:underline">
              Back to Users
            </Link>
            <Link href={`${ADMIN_PATH}/bookings`} className="text-primary hover:underline">
              Show all bookings
            </Link>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            {result.success
              ? `${result.pagination?.total || 0} total bookings`
              : 'Failed to load bookings'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <BookingsTable
              bookings={result.bookings}
              pagination={result.pagination}
              hotels={hotels}
            />
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
