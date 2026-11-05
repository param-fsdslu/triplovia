'use client'

import { useState } from 'react'
import { Shield, Hotel, Trash2, Edit, MoreVertical } from '@/components/icons'
import { ExportButtons } from './ExportButtons'
import type { ExportColumn } from '@/lib/utils/export'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EditVendorDialog } from './EditVendorDialog'
import { deleteAdminUser } from '@/lib/actions/users'
import { useRouter } from 'next/navigation'
import type { AdminRole } from '@/lib/utils/roles'

interface User {
  id: string
  email: string | undefined
  role: AdminRole | 'admin'
  hotelIds: string[]
  hotels: Array<{ id: string; name: string; city: string }>
  createdAt: string
  lastSignIn: string | null
  emailConfirmed: boolean
}

interface VendorsTableProps {
  users: User[]
}

export function VendorsTable({ users }: VendorsTableProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleEditClick = (user: User) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    setIsDeleting(true)
    const result = await deleteAdminUser(selectedUser.id)

    if (result.success) {
      setDeleteDialogOpen(false)
      setSelectedUser(null)
      router.refresh()
    } else {
      alert(result.error || 'Failed to delete vendor')
    }
    setIsDeleting(false)
  }

  const getRoleBadge = (role: AdminRole | 'admin') => {
    const roleMap = {
      super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800' },
      admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800' },
      hotel_admin: { label: 'Hotel Admin', className: 'bg-primary/10 text-secondary' },
    }

    const config = roleMap[role] || { label: role, className: 'bg-muted text-foreground' }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
      >
        <Shield className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const exportColumns: ExportColumn[] = [
    { header: 'Email', accessor: (r: any) => r.email || '' },
    { header: 'Role', accessor: 'role' },
    { header: 'Hotels', accessor: (r: any) => r.hotels.map((h: any) => h.name).join(', ') || 'All' },
    { header: 'Created', accessor: (r: any) => formatDate(r.createdAt) },
    { header: 'Last Sign In', accessor: (r: any) => formatDate(r.lastSignIn) },
    { header: 'Email Confirmed', accessor: (r: any) => r.emailConfirmed ? 'Yes' : 'No' },
  ]

  if (users.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No vendors yet</h3>
        <p className="text-muted-foreground">Add a vendor to give a hotel owner access to this panel.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <ExportButtons rows={users} columns={exportColumns} filenamePrefix="vendors" title="Vendors" />
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Hotels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Sign In
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/60">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-border rounded-full flex items-center justify-center">
                        <span className="text-muted-foreground font-medium text-sm">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">{user.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.emailConfirmed ? (
                            <span className="text-green-600">✓ Verified</span>
                          ) : (
                            <span className="text-yellow-600">⚠ Unverified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">
                    {user.role === 'hotel_admin' ? (
                      user.hotels.length > 0 ? (
                        <div className="space-y-1">
                          {user.hotels.map((hotel) => (
                            <div
                              key={hotel.id}
                              className="flex items-center gap-1 text-sm text-foreground"
                            >
                              <Hotel className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {hotel.name} ({hotel.city})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No hotels assigned</span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">All hotels</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(user.lastSignIn)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditClick(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Vendor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(user)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Vendor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.email}</strong>? This action
              cannot be undone. Any hotels assigned to this user will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Vendor'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      {selectedUser && (
        <EditVendorDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
        />
      )}
    </>
  )
}
