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
  DialogTrigger,
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
import { UserPlus, Hotel as HotelIcon } from '@/components/icons'
import { createAdminUser, getAvailableHotels } from '@/lib/actions/users'
import { useRouter } from 'next/navigation'

export function CreateVendorDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hotels, setHotels] = useState<Array<{ id: string; name: string; city: string; state: string; owner_id: string | null }>>([])

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'hotel_admin' as 'super_admin' | 'hotel_admin',
    hotelIds: [] as string[],
  })

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

    const result = await createAdminUser(formData)

    if (result.success) {
      setOpen(false)
      setFormData({
        email: '',
        password: '',
        role: 'hotel_admin',
        hotelIds: [],
      })
      router.refresh()
    } else {
      setError(result.error || 'Failed to create user')
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

  const availableHotels = hotels.filter(h => !h.owner_id || formData.hotelIds.includes(h.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>
              Create a panel sign-in and choose the role and hotel access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md text-sm space-y-1">
                <p className="font-semibold">Failed to create vendor</p>
                <p>{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'super_admin' | 'hotel_admin') => {
                  setFormData({ ...formData, role: value, hotelIds: [] })
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
              <p className="text-xs text-muted-foreground">
                {formData.role === 'super_admin'
                  ? 'Full access to all hotels and system features'
                  : 'Limited access to assigned hotels only'}
              </p>
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
                            id={`hotel-${hotel.id}`}
                            checked={formData.hotelIds.includes(hotel.id)}
                            onCheckedChange={(checked) =>
                              handleHotelToggle(hotel.id, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`hotel-${hotel.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <HotelIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">{hotel.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {hotel.city}, {hotel.state}
                                  {hotel.owner_id && (
                                    <span className="ml-2 text-yellow-600">(Currently assigned)</span>
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
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
