'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Eye, ChevronLeft, ChevronRight, Edit, Trash2, Ship } from '@/components/icons'
import { updateBoatStatus, deleteBoat } from '@/lib/actions/boat-admin'
import { ExportButtons } from './ExportButtons'
import type { ExportColumn } from '@/lib/utils/export'
import { ADMIN_PATH } from '@/lib/config/admin-path'

interface BoatsTableProps {
  boats: any[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

export function BoatsTable({ boats, pagination }: BoatsTableProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleStatusChange = async (boatId: string, newStatus: string) => {
    setUpdating(boatId)
    try {
      const result = await updateBoatStatus(boatId, newStatus as 'active' | 'inactive' | 'pending')
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Failed to update status')
      }
    } catch { alert('Failed to update status') } finally { setUpdating(null) }
  }

  const handleDelete = async (boatId: string, boatName: string) => {
    if (!confirm(`Are you sure you want to delete "${boatName}"?`)) return
    setDeleting(boatId)
    try {
      const result = await deleteBoat(boatId)
      if (result.success) { router.refresh() } else { alert(result.error || 'Failed to delete boat') }
    } catch { alert('Failed to delete boat') } finally { setDeleting(null) }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default', inactive: 'destructive', pending: 'secondary',
    }
    return variants[status] || 'secondary'
  }

  const exportColumns: ExportColumn[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Location', accessor: 'location' },
    { header: 'Type', accessor: 'boat_type' },
    { header: 'Capacity', accessor: 'capacity' },
    { header: 'Status', accessor: 'status' },
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
          <Select onValueChange={(value) => {
            const params = new URLSearchParams(window.location.search)
            if (value === 'all') { params.delete('status') } else { params.set('status', value) }
            params.set('page', '1')
            router.push(`?${params.toString()}`)
          }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ExportButtons rows={boats} columns={exportColumns} filenamePrefix="boats" title="Boats" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boat Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No boats found</TableCell>
              </TableRow>
            ) : (
              boats.map((boat) => (
                <TableRow key={boat.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{boat.name}</p>
                      <p className="text-xs text-muted-foreground">{boat.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>{boat.city}, {boat.state}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      <Ship className="h-3 w-3 mr-1" />{boat.boat_type || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{boat.capacity || '-'}</TableCell>
                  <TableCell>
                    <Select value={boat.status} onValueChange={(v) => handleStatusChange(boat.id, v)} disabled={updating === boat.id}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue><Badge variant={getStatusBadge(boat.status)}>{boat.status}</Badge></SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`${ADMIN_PATH}/boats/${boat.id}`)} title="Edit"><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/boats/${boat.slug}`)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(boat.id, boat.name)} disabled={deleting === boat.id} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
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
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} boats
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
