'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Eye, ChevronLeft, ChevronRight } from '@/components/icons'
import { updateBoatBookingStatus } from '@/lib/actions/boat-admin'
import { ExportButtons } from './ExportButtons'
import { StatusPill } from './StatusPill'
import type { ExportColumn } from '@/lib/utils/export'
import { ADMIN_PATH } from '@/lib/config/admin-path'

interface BoatBookingsTableProps {
  bookings: any[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

export function BoatBookingsTable({ bookings, pagination }: BoatBookingsTableProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId)
    try {
      const result = await updateBoatBookingStatus(bookingId, newStatus as any)
      if (result.success) { router.refresh() } else { alert(result.error) }
    } catch { alert('Failed to update status') } finally { setUpdating(null) }
  }

  const exportColumns: ExportColumn[] = [
    { header: 'Reference', accessor: 'booking_reference' },
    { header: 'Guest Name', accessor: (r: any) => `${r.guest_first_name} ${r.guest_last_name}` },
    { header: 'Email', accessor: 'guest_email' },
    { header: 'Boat', accessor: 'boat.name' },
    { header: 'Trip Type', accessor: 'trip_type.name' },
    { header: 'Trip Date', accessor: 'trip_date' },
    { header: 'Passengers', accessor: (r: any) => r.num_adults + r.num_children },
    { header: 'Amount (₹)', accessor: (r: any) => Number(r.total_amount).toLocaleString('en-IN') },
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
      <div className="flex items-center justify-between gap-4">
      <div className="flex gap-4">
        <Select onValueChange={(v) => {
          const p = new URLSearchParams(window.location.search)
          if (v === 'all') p.delete('status'); else p.set('status', v)
          p.set('page', '1'); router.push(`?${p.toString()}`)
        }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Booking status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => {
          const p = new URLSearchParams(window.location.search)
          if (v === 'all') p.delete('paymentStatus'); else p.set('paymentStatus', v)
          p.set('page', '1'); router.push(`?${p.toString()}`)
        }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Payment status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>
        <ExportButtons rows={bookings} columns={exportColumns} filenamePrefix="boat-bookings" title="Boat Bookings" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Boat / Trip</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Passengers</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No boat bookings found</TableCell></TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell><span className="font-mono text-sm">{b.booking_reference}</span></TableCell>
                  <TableCell>
                    <div><p className="font-medium">{b.guest_first_name} {b.guest_last_name}</p><p className="text-xs text-muted-foreground">{b.guest_email}</p></div>
                  </TableCell>
                  <TableCell>
                    <div><p className="font-medium">{b.boat?.name}</p><p className="text-xs text-muted-foreground">{b.trip_type?.name}</p></div>
                  </TableCell>
                  <TableCell>
                    <div><p className="text-sm">{b.trip_date}</p><p className="text-xs text-muted-foreground">{b.time_slot?.start_time?.slice(0,5)} - {b.time_slot?.end_time?.slice(0,5)}</p></div>
                  </TableCell>
                  <TableCell>{b.num_adults + b.num_children}</TableCell>
                  <TableCell className="font-medium">₹{Number(b.total_amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <Select value={b.booking_status} onValueChange={(v) => handleStatusChange(b.id, v)} disabled={updating === b.id}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue><StatusPill status={b.booking_status} label={b.booking_status} /></SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><StatusPill status={b.payment_status} label={b.payment_status} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => router.push(`${ADMIN_PATH}/boat-bookings/${b.booking_reference}`)} title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
