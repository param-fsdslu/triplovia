'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { updateBookingStatus } from '@/lib/actions/admin'
import { Loader2 } from '@/components/icons'

interface BookingStatusUpdaterProps {
  bookingId: string
  currentStatus: string
  isSuperAdmin?: boolean
}

export function BookingStatusUpdater({
  bookingId,
  currentStatus,
  isSuperAdmin = false,
}: BookingStatusUpdaterProps) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [adminNote, setAdminNote] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateStatus = async () => {
    if (status === currentStatus && !adminNote) {
      alert('No changes to update')
      return
    }

    if (!confirm(`Update booking status to "${status}"?`)) {
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateBookingStatus(
        bookingId,
        status as 'confirmed' | 'cancelled' | 'completed' | 'pending',
        adminNote || undefined
      )

      if (result.success) {
        alert('Booking status updated successfully')
        setAdminNote('')
        router.refresh()
      } else {
        alert(result.error || 'Failed to update status')
      }
    } catch (error) {
      alert('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Booking Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              {isSuperAdmin && (
                <SelectItem value="cancelled">Cancelled</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Current Status</Label>
          <div className="h-10 px-3 py-2 bg-muted border rounded-md flex items-center">
            <span className="text-sm font-medium capitalize">{currentStatus}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminNote">
          Admin Note (Optional)
          <span className="text-xs text-muted-foreground ml-2">
            This note will be included in the email notification to the guest
          </span>
        </Label>
        <Textarea
          id="adminNote"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Add a note for the guest (e.g., 'Your room has been upgraded to a deluxe suite')"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleUpdateStatus}
          disabled={isUpdating || (status === currentStatus && !adminNote)}
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Status'
          )}
        </Button>
        {status !== currentStatus && (
          <Button
            variant="outline"
            onClick={() => {
              setStatus(currentStatus)
              setAdminNote('')
            }}
            disabled={isUpdating}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
