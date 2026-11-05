'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { Eye, ChevronLeft, ChevronRight, Search, X } from '@/components/icons'
import { updateBookingStatus } from '@/lib/actions/admin'
import { ExportButtons } from './ExportButtons'
import { StatusPill } from './StatusPill'
import type { ExportColumn } from '@/lib/utils/export'
import { ADMIN_PATH } from '@/lib/config/admin-path'

interface Booking {
  id: string
  booking_reference: string
  guest_first_name: string
  guest_last_name: string
  guest_email: string
  check_in_date: string
  check_out_date: string
  total_amount: number
  booking_status: string
  payment_status: string
  created_at: string
  hotel: {
    name: string
    city: string
    state: string
  }
  room_type: {
    name: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface BookingsTableProps {
  bookings: Booking[]
  pagination?: Pagination
  hotels?: Array<{ id: string; name: string }>
}

export function BookingsTable({ bookings, pagination, hotels = [] }: BookingsTableProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') || ''
    }
    return ''
  })

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId)
    try {
      const result = await updateBookingStatus(
        bookingId,
        newStatus as 'confirmed' | 'cancelled' | 'completed' | 'pending'
      )

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Failed to update status')
      }
    } catch (error) {
      alert('Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const paymentStatusLabel = (status: string) =>
    status === 'partially_refunded' ? 'Partial Refund' : status

  const exportColumns: ExportColumn[] = [
    { header: 'Reference', accessor: 'booking_reference' },
    { header: 'Guest Name', accessor: (r: any) => `${r.guest_first_name} ${r.guest_last_name}` },
    { header: 'Email', accessor: 'guest_email' },
    { header: 'Hotel', accessor: 'hotel.name' },
    { header: 'Check-in', accessor: (r: any) => format(new Date(r.check_in_date), 'MMM dd, yyyy') },
    { header: 'Check-out', accessor: (r: any) => format(new Date(r.check_out_date), 'MMM dd, yyyy') },
    { header: 'Amount (₹)', accessor: (r: any) => Math.round(r.total_amount).toLocaleString('en-IN') },
    { header: 'Status', accessor: 'booking_status' },
    { header: 'Payment', accessor: 'payment_status' },
  ]

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', newPage.toString())
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Search & Export */}
      <div className="flex gap-3 items-center">
        <form
          className="relative flex-1 max-w-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const params = new URLSearchParams(window.location.search)
            if (searchInput.trim()) {
              params.set('search', searchInput.trim())
            } else {
              params.delete('search')
            }
            params.set('page', '1')
            router.push(`?${params.toString()}`)
          }}
        >
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reference, name, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchInput && (
            <button
              type="button"
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-muted-foreground"
              onClick={() => {
                setSearchInput('')
                const params = new URLSearchParams(window.location.search)
                params.delete('search')
                params.set('page', '1')
                router.push(`?${params.toString()}`)
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <ExportButtons rows={bookings} columns={exportColumns} filenamePrefix="bookings" title="Hotel Bookings" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          onValueChange={(value) => {
            const params = new URLSearchParams(window.location.search)
            if (value === 'all') {
              params.delete('status')
            } else {
              params.set('status', value)
            }
            params.set('page', '1')
            router.push(`?${params.toString()}`)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Booking status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => {
            const params = new URLSearchParams(window.location.search)
            if (value === 'all') {
              params.delete('paymentStatus')
            } else {
              params.set('paymentStatus', value)
            }
            params.set('page', '1')
            router.push(`?${params.toString()}`)
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
          </SelectContent>
        </Select>

        {hotels.length > 0 && (
          <Select
            onValueChange={(value) => {
              const params = new URLSearchParams(window.location.search)
              if (value === 'all') {
                params.delete('hotelId')
              } else {
                params.set('hotelId', value)
              }
              params.set('page', '1')
              router.push(`?${params.toString()}`)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All hotels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Hotels</SelectItem>
              {hotels.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          type="date"
          className="w-[150px]"
          placeholder="From date"
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search)
            if (e.target.value) {
              params.set('dateFrom', e.target.value)
            } else {
              params.delete('dateFrom')
            }
            params.set('page', '1')
            router.push(`?${params.toString()}`)
          }}
        />
        <Input
          type="date"
          className="w-[150px]"
          placeholder="To date"
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search)
            if (e.target.value) {
              params.set('dateTo', e.target.value)
            } else {
              params.delete('dateTo')
            }
            params.set('page', '1')
            router.push(`?${params.toString()}`)
          }}
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.booking_reference}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {booking.guest_first_name} {booking.guest_last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{booking.guest_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.hotel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.hotel.city}, {booking.hotel.state}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.check_in_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.check_out_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₹{Math.round(booking.total_amount).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={booking.booking_status}
                      onValueChange={(value) => handleStatusChange(booking.id, value)}
                      disabled={updating === booking.id}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue>
                          <StatusPill status={booking.booking_status} label={booking.booking_status} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={booking.payment_status} label={paymentStatusLabel(booking.payment_status)} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`${ADMIN_PATH}/bookings/${booking.booking_reference}`)}
                      title="View booking details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} bookings
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
