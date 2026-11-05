'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { Eye, ChevronLeft, ChevronRight, Star, Edit, Trash2 } from '@/components/icons'
import { updateHotelStatus, deleteHotel, setHotelFeatured } from '@/lib/actions/admin'
import { ExportButtons } from './ExportButtons'
import type { ExportColumn } from '@/lib/utils/export'
import { ADMIN_PATH } from '@/lib/config/admin-path'

interface Hotel {
  id: string
  name: string
  slug: string
  city: string
  state: string
  star_rating?: number
  property_type?: string
  status: string
  is_featured?: boolean
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface HotelsTableProps {
  hotels: Hotel[]
  pagination?: Pagination
  /** Super admins only: the homepage "Featured stays" switch column, with how many are featured */
  featured?: { count: number; limit: number }
}

export function HotelsTable({ hotels, pagination, featured }: HotelsTableProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [featuring, setFeaturing] = useState<string | null>(null)
  const featuredFull = !!featured && featured.count >= featured.limit

  const handleFeaturedChange = async (hotelId: string, value: boolean) => {
    setFeaturing(hotelId)
    try {
      const result = await setHotelFeatured(hotelId, value)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Failed to update featured stay')
      }
    } catch {
      alert('Failed to update featured stay')
    } finally {
      setFeaturing(null)
    }
  }

  const handleStatusChange = async (hotelId: string, newStatus: string) => {
    setUpdating(hotelId)
    try {
      const result = await updateHotelStatus(
        hotelId,
        newStatus as 'active' | 'inactive' | 'pending' | 'archived'
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

  const handleDeleteHotel = async (hotelId: string, hotelName: string) => {
    if (!confirm(`Are you sure you want to delete "${hotelName}"? If it has past bookings it will be archived (hidden, history kept) instead of permanently deleted.`)) {
      return
    }

    setDeleting(hotelId)
    try {
      const result = await deleteHotel(hotelId)

      if (result.success) {
        if (result.archived) {
          alert(`"${hotelName}" has past bookings, so it was archived instead of permanently deleted. It is now hidden from the site and default hotel list; booking history is preserved.`)
        }
        router.refresh()
      } else {
        alert(result.error || 'Failed to delete hotel')
      }
    } catch (error) {
      alert('Failed to delete hotel')
    } finally {
      setDeleting(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'destructive',
      pending: 'secondary',
      archived: 'outline',
    }
    return variants[status] || 'secondary'
  }

  const exportColumns: ExportColumn[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'City', accessor: 'city' },
    { header: 'State', accessor: 'state' },
    { header: 'Type', accessor: (r: any) => r.property_type || '-' },
    { header: 'Stars', accessor: (r: any) => r.star_rating || '-' },
    { header: 'Status', accessor: 'status' },
    ...(featured ? [{ header: 'Featured', accessor: (r: any) => (r.is_featured ? 'Yes' : 'No') }] : []),
  ]

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', newPage.toString())
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
      <div className="flex gap-4">
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
        <ExportButtons rows={hotels} columns={exportColumns} filenamePrefix="hotels" title="Hotels" />
      </div>

      {featured && (
        <p className="rounded-xl bg-mint px-4 py-3 text-sm text-secondary">
          <span className="font-semibold">
            Featured on the homepage: {featured.count} of {featured.limit}.
          </span>{' '}
          Only active stays show there.
          {featured.count === 0 && ' Until you feature one, the homepage shows the best-rated active stays.'}
          {featuredFull && ' Turn one off to feature another.'}
        </p>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hotel Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              {featured && <TableHead>Featured</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={featured ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  No hotels found
                </TableCell>
              </TableRow>
            ) : (
              hotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{hotel.name}</p>
                      <p className="text-xs text-muted-foreground">{hotel.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {hotel.city}, {hotel.state}
                  </TableCell>
                  <TableCell>
                    {hotel.property_type ? (
                      <Badge variant="outline" className="capitalize">
                        {hotel.property_type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {hotel.star_rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-gold text-gold" />
                        <span>{hotel.star_rating}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={hotel.status}
                      onValueChange={(value) => handleStatusChange(hotel.id, value)}
                      disabled={updating === hotel.id}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue>
                          <Badge variant={getStatusBadge(hotel.status)}>
                            {hotel.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {featured && (
                    <TableCell>
                      <label
                        className="inline-flex items-center gap-2 text-sm"
                        title={
                          !hotel.is_featured && featuredFull
                            ? `${featured.limit} stays are featured: turn one off first`
                            : hotel.is_featured
                              ? 'Shown on the homepage'
                              : 'Show on the homepage'
                        }
                      >
                        <Switch
                          checked={!!hotel.is_featured}
                          onCheckedChange={(value) => handleFeaturedChange(hotel.id, value)}
                          disabled={featuring === hotel.id || (!hotel.is_featured && featuredFull)}
                          aria-label={`Feature ${hotel.name} on the homepage`}
                        />
                        <span className={hotel.is_featured ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                          {hotel.is_featured ? (hotel.status === 'active' ? 'On' : 'On (not active)') : 'Off'}
                        </span>
                      </label>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`${ADMIN_PATH}/hotels/${hotel.id}`)}
                        title="Edit hotel"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/hotels/${hotel.slug}`)}
                        title="View hotel page"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                        disabled={deleting === hotel.id}
                        title="Delete hotel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            {pagination.total} hotels
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
