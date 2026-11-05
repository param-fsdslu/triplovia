'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Hotel as HotelIcon } from '@/components/icons'
import { updateAdminUser, getAvailableHotels } from '@/lib/actions/users'
import { useRouter } from 'next/navigation'
import type { AdminRole } from '@/lib/utils/roles'

interface User {
  id: string
  email: string | undefined
  role: AdminRole | 'admin'
  hotelIds: string[]
  hotels: Array<{ id: string; name: string; city: string }>
}

interface EditVendorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export function EditVendorDialog({ open, onOpenChange, user }: EditVendorDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hotels, setHotels] = useState<Array<{ id: string; name: string; city: string; state: string; owner_id: string | null }>>([])

  const [formData, setFormData] = useState({
    email: user.email || '',
    password: '',
    role: (user.role === 'admin' ? 'super_admin' : user.role) as 'super_admin' | 'hotel_admin',
    hotelIds: user.hotelIds || [],
  })

  // Reset form when user changes
  useEffect(() => {
    setFormData({
      email: user.email || '',
      password: '',
      role: (user.role === 'admin' ? 'super_admin' : user.role) as 'super_admin' | 'hotel_admin',
      hotelIds: user.hotelIds || [],
    })
    setError('')
  }, [user])

  // Load hotels when dialog opens
  useEffect(() => {
    if (open) {
      loadHotels()
    }
  }, [open])

  const loadHotels = async () => {
    const result = await getAvailableHotels()
    if (result.success) {
      setHotels(result.hotels)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const updateData: any = {
      userId: user.id,
      role: formData.role,
      hotelIds: formData.hotelIds,
    }

    // Only include email if changed
    if (formData.email !== user.email) {
      updateData.email = formData.email
    }

    // Only include password if provided
    if (formData.password) {
      updateData.password = formData.password
    }

    const result = await updateAdminUser(updateData)

    if (result.success) {
      onOpenChange(false)
      router.refresh()
    } else {
      setError(result.error || 'Failed to update user')
    }

    setIsSubmitting(false)
  }

  const handleHotelToggle = (hotelId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      hotelIds: checked
        ? [...prev.hotelIds, hotelId]
        : prev.hotelIds.filter((id) => id !== hotelId),
    }))
  }

  // Show hotels that are either unassigned or assigned to this user
  const availableHotels = hotels.filter(
    h => !h.owner_id || h.owner_id === user.id || formData.hotelIds.includes(h.id)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update the vendor's sign-in, role, and hotel assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Password (optional) */}
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current password
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'super_admin' | 'hotel_admin') => {
                  setFormData({ ...formData, role: value, hotelIds: value === 'super_admin' ? [] : formData.hotelIds })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin (Full Access)</SelectItem>
                  <SelectItem value="hotel_admin">Hotel Admin (Limited Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hotel Selection (only for hotel_admin) */}
            {formData.role === 'hotel_admin' && (
              <div className="space-y-2">
                <Label>Assign Hotels</Label>
                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  {availableHotels.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No hotels available for assignment
                    </div>
                  ) : (
                    <div className="divide-y">
                      {availableHotels.map((hotel) => (
                        <div key={hotel.id} className="flex items-center space-x-3 p-3 hover:bg-muted/50">
                          <Checkbox
                            id={`edit-hotel-${hotel.id}`}
                            checked={formData.hotelIds.includes(hotel.id)}
                            onCheckedChange={(checked) =>
                              handleHotelToggle(hotel.id, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`edit-hotel-${hotel.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <HotelIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">{hotel.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {hotel.city}, {hotel.state}
                                  {hotel.owner_id && hotel.owner_id !== user.id && (
                                    <span className="ml-2 text-yellow-600">(Assigned to another admin)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Hotels can be assigned now or later. Hotel admins can manage multiple hotels.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
