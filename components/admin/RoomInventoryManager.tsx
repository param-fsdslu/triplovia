'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  CalendarOff,
  AlertTriangle,
} from '@/components/icons'
import {
  updateInventorySource,
  createRoomInventoryBlock,
  deleteRoomInventoryBlock,
} from '@/lib/actions/admin/inventory'
import type { InventorySource, RoomInventoryBlock } from '@/lib/types'

interface RoomType {
  id: string
  name: string
  num_available_rooms: number
}

interface BlockWithName extends RoomInventoryBlock {
  room_type_name: string
}

interface RoomInventoryManagerProps {
  hotelId: string
  inventorySource: InventorySource
  roomTypes: RoomType[]
  blocks: BlockWithName[]
}

interface BlockForm {
  room_type_id: string
  start_date: string
  end_date: string
  rooms_blocked: string
  reason: string
}

const emptyBlockForm: BlockForm = {
  room_type_id: '',
  start_date: '',
  end_date: '',
  rooms_blocked: '1',
  reason: '',
}

export function RoomInventoryManager({
  hotelId,
  inventorySource,
  roomTypes,
  blocks: initialBlocks,
}: RoomInventoryManagerProps) {
  const router = useRouter()
  const [source, setSource] = useState<InventorySource>(inventorySource)
  const [blocks, setBlocks] = useState<BlockWithName[]>(initialBlocks)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [form, setForm] = useState<BlockForm>(emptyBlockForm)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSwitching, setIsSwitching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  // Toggle inventory source
  const handleSourceToggle = () => {
    const next: InventorySource = source === 'manual' ? 'api' : 'manual'
    setIsSwitching(true)
    setError(null)
    startTransition(async () => {
      const result = await updateInventorySource(hotelId, next)
      if (result.success) {
        setSource(next)
        router.refresh()
      } else {
        setError(result.error || 'Failed to update inventory mode')
      }
      setIsSwitching(false)
    })
  }

  // Add a block
  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.room_type_id) {
      setFormError('Please select a room type')
      return
    }
    const roomsBlocked = parseInt(form.rooms_blocked, 10)
    if (isNaN(roomsBlocked) || roomsBlocked < 1) {
      setFormError('Rooms blocked must be at least 1')
      return
    }
    if (!form.start_date || !form.end_date) {
      setFormError('Please select a date range')
      return
    }
    if (form.end_date < form.start_date) {
      setFormError('End date must be on or after start date')
      return
    }

    setIsSubmitting(true)
    const result = await createRoomInventoryBlock({
      hotel_id: hotelId,
      room_type_id: form.room_type_id,
      start_date: form.start_date,
      end_date: form.end_date,
      rooms_blocked: roomsBlocked,
      reason: form.reason.trim() || undefined,
    })

    if (result.success && result.block) {
      const roomType = roomTypes.find((rt) => rt.id === form.room_type_id)
      const newBlock: BlockWithName = {
        ...result.block,
        room_type_name: roomType?.name ?? 'Unknown',
      }
      setBlocks((prev) =>
        [...prev, newBlock].sort((a, b) => a.start_date.localeCompare(b.start_date))
      )
      setIsAddOpen(false)
      setForm(emptyBlockForm)
      router.refresh()
    } else {
      setFormError(result.error || 'Failed to create block')
    }
    setIsSubmitting(false)
  }

  // Delete a block
  const handleDeleteBlock = async (block: BlockWithName) => {
    if (!confirm(`Remove the block for "${block.room_type_name}" (${block.start_date} – ${block.end_date})?`)) return
    setDeletingId(block.id)
    const result = await deleteRoomInventoryBlock(block.id, hotelId)
    if (result.success) {
      setBlocks((prev) => prev.filter((b) => b.id !== block.id))
      router.refresh()
    } else {
      setError(result.error || 'Failed to delete block')
    }
    setDeletingId(null)
  }

  const isPast = (date: string) => date < today

  return (
    <div className="space-y-8">
      {/* ── Inventory Source Mode ── */}
      <div className="rounded-lg border p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {source === 'manual' ? (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Wifi className="h-5 w-5 text-primary" />
              )}
              <h3 className="text-base font-semibold">Inventory Mode</h3>
              <Badge variant={source === 'api' ? 'default' : 'secondary'}>
                {source === 'api' ? 'API / Auto-sync' : 'Manual'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              {source === 'manual'
                ? 'Room counts are set manually via the Room Types tab. Edit "Number of Rooms" on each room type to adjust availability.'
                : 'Room counts are auto-synced from an external channel manager. Manual edits to room count are disabled. Use inventory blocks below to override availability for specific dates.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSourceToggle}
            disabled={isSwitching || isPending}
          >
            {isSwitching ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Switching…</>
            ) : source === 'manual' ? (
              'Switch to API mode'
            ) : (
              'Switch to Manual mode'
            )}
          </Button>
        </div>

        {source === 'api' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              In API mode, the system expects an external service to update{' '}
              <code className="text-xs bg-muted px-1 rounded">num_available_rooms</code> via the
              API or webhooks. Manual room count edits in the Room Types tab are still
              possible but will be overwritten on the next sync.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Manual Inventory Blocks ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-muted-foreground" />
              Inventory Blocks
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Block rooms from being available for specific date ranges (maintenance, holds, etc.)
            </p>
          </div>
          <Button size="sm" onClick={() => { setIsAddOpen(true); setFormError(null); setForm(emptyBlockForm) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Block
          </Button>
        </div>

        {blocks.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg">
            <CalendarOff className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No inventory blocks. Rooms are fully available.</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {blocks.map((block) => {
              const past = isPast(block.end_date)
              return (
                <div
                  key={block.id}
                  className={`flex items-center gap-4 px-4 py-3 ${past ? 'opacity-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{block.room_type_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {block.rooms_blocked} room{block.rooms_blocked !== 1 ? 's' : ''} blocked
                      </Badge>
                      {past && (
                        <Badge variant="secondary" className="text-xs">Expired</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {block.start_date} → {block.end_date}
                      {block.reason && <> · {block.reason}</>}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteBlock(block)}
                    disabled={deletingId === block.id}
                    className="shrink-0"
                  >
                    {deletingId === block.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add Block Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Inventory Block</DialogTitle>
            <DialogDescription>
              Block rooms from being available for a specific date range.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_type_id">Room Type *</Label>
              <Select
                value={form.room_type_id}
                onValueChange={(v) => setForm({ ...form, room_type_id: v })}
              >
                <SelectTrigger id="room_type_id">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name} ({rt.num_available_rooms} rooms)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  min={today}
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  min={form.start_date || today}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rooms_blocked">Rooms to Block *</Label>
              <Input
                id="rooms_blocked"
                type="number"
                min="1"
                value={form.rooms_blocked}
                onChange={(e) => setForm({ ...form, rooms_blocked: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                How many rooms of this type to block (reduce availability by this count).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Maintenance, VIP hold, renovation"
              />
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</>
                ) : (
                  'Create Block'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
