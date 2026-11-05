'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Loader2, Plus, Trash2, CalendarRange, Pencil } from '@/components/icons'
import {
  setWeekendPricing,
  createPriceOverride,
  deletePriceRule,
} from '@/lib/actions/admin/price-rules'
import type { PriceRule } from '@/lib/types'

interface RoomType {
  id: string
  name: string
  base_price: number
}

interface RuleWithName extends PriceRule {
  room_type_name: string
}

interface RoomPricingManagerProps {
  hotelId: string
  roomTypes: RoomType[]
  rules: RuleWithName[]
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PRICE_TYPE_LABELS: Record<string, string> = {
  festival: 'Festival',
  long_weekend: 'Long Weekend',
  custom: 'Custom',
}

interface OverrideForm {
  room_type_id: string
  price_type: 'festival' | 'long_weekend' | 'custom'
  start_date: string
  end_date: string
  price: string
  label: string
}

const emptyOverrideForm: OverrideForm = {
  room_type_id: '',
  price_type: 'custom',
  start_date: '',
  end_date: '',
  price: '',
  label: '',
}

export function RoomPricingManager({ hotelId, roomTypes, rules }: RoomPricingManagerProps) {
  const router = useRouter()

  // ── Weekend pricing state ──────────────────────────────────────────────
  const weekendRulesByRoom = new Map<string, RuleWithName[]>()
  for (const rule of rules) {
    if (rule.price_type !== 'weekend') continue
    const list = weekendRulesByRoom.get(rule.room_type_id) ?? []
    list.push(rule)
    weekendRulesByRoom.set(rule.room_type_id, list)
  }

  const [isWeekendDialogOpen, setIsWeekendDialogOpen] = useState(false)
  const [weekendRoomTypeId, setWeekendRoomTypeId] = useState<string | null>(null)
  const [weekendDays, setWeekendDays] = useState<number[]>([5, 6])
  const [weekendPrice, setWeekendPrice] = useState('')
  const [weekendError, setWeekendError] = useState<string | null>(null)
  const [isSavingWeekend, setIsSavingWeekend] = useState(false)

  const openWeekendDialog = (roomTypeId: string) => {
    const existing = weekendRulesByRoom.get(roomTypeId) ?? []
    setWeekendRoomTypeId(roomTypeId)
    setWeekendDays(existing.length > 0 ? existing.map((r) => r.day_of_week as number) : [5, 6])
    setWeekendPrice(existing.length > 0 ? String(Math.round(existing[0].price_per_night)) : '')
    setWeekendError(null)
    setIsWeekendDialogOpen(true)
  }

  const toggleWeekendDay = (day: number) => {
    setWeekendDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  const handleSaveWeekend = async () => {
    if (!weekendRoomTypeId) return
    setWeekendError(null)

    const hasPrice = weekendPrice.trim() !== ''
    const price = hasPrice ? parseFloat(weekendPrice) : null
    if (hasPrice && (isNaN(price!) || price! < 0)) {
      setWeekendError('Enter a valid weekend price')
      return
    }
    if (hasPrice && weekendDays.length === 0) {
      setWeekendError('Select at least one day for weekend pricing')
      return
    }

    setIsSavingWeekend(true)
    const result = await setWeekendPricing({
      hotel_id: hotelId,
      room_type_id: weekendRoomTypeId,
      weekend_days: weekendDays,
      price,
    })
    setIsSavingWeekend(false)

    if (result.success) {
      setIsWeekendDialogOpen(false)
      router.refresh()
    } else {
      setWeekendError(result.error || 'Failed to save weekend pricing')
    }
  }

  // ── Festival / long-weekend / custom overrides state ───────────────────
  const overrides = rules.filter((r) => r.price_type !== 'weekend')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [form, setForm] = useState<OverrideForm>(emptyOverrideForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.room_type_id) {
      setFormError('Please select a room type')
      return
    }
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) {
      setFormError('Enter a valid price')
      return
    }
    if (!form.start_date || !form.end_date) {
      setFormError('Please select start and end dates')
      return
    }
    if (!form.label.trim()) {
      setFormError('Please enter a label (e.g. "Christmas Festival")')
      return
    }

    setIsSubmitting(true)
    const result = await createPriceOverride({
      hotel_id: hotelId,
      room_type_id: form.room_type_id,
      start_date: form.start_date,
      end_date: form.end_date,
      price,
      label: form.label.trim(),
      price_type: form.price_type,
    })

    if (result.success) {
      setIsAddOpen(false)
      setForm(emptyOverrideForm)
      router.refresh()
    } else {
      setFormError(result.error || 'Failed to create price override')
    }
    setIsSubmitting(false)
  }

  const handleDeleteRule = async (rule: RuleWithName) => {
    const label = rule.price_type === 'weekend' ? 'weekend pricing' : rule.label || 'this override'
    if (!confirm(`Remove ${label} for "${rule.room_type_name}"?`)) return
    setDeletingId(rule.id)
    const result = await deletePriceRule(rule.id, hotelId)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to delete price rule')
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Weekend Pricing ── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Weekend Pricing</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set a per-night price that automatically applies on chosen weekdays, every week.
          </p>
        </div>

        <div className="divide-y rounded-lg border">
          {roomTypes.map((room) => {
            const existing = weekendRulesByRoom.get(room.id) ?? []
            const hasWeekendPricing = existing.length > 0
            return (
              <div key={room.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{room.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Base price ₹{room.base_price.toLocaleString('en-IN')}/night
                    {hasWeekendPricing && (
                      <>
                        {' · '}
                        <span className="font-medium text-foreground">
                          ₹{Math.round(existing[0].price_per_night).toLocaleString('en-IN')}/night
                        </span>{' '}
                        on {existing.map((r) => WEEKDAY_LABELS[r.day_of_week as number]).join(', ')}
                      </>
                    )}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openWeekendDialog(room.id)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  {hasWeekendPricing ? 'Edit' : 'Set up'}
                </Button>
              </div>
            )
          })}
          {roomTypes.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">No room types yet.</div>
          )}
        </div>
      </div>

      {/* ── Festival / Long Weekend / Custom Overrides ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-muted-foreground" />
              Special Date Pricing
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Festival, long-weekend, or custom pricing for specific date ranges. Takes priority over weekend pricing.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => { setIsAddOpen(true); setFormError(null); setForm(emptyOverrideForm) }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Override
          </Button>
        </div>

        {overrides.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg">
            <CalendarRange className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No special date pricing. Rooms use base (or weekend) price every night.</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {overrides.map((rule) => (
              <div key={rule.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{rule.room_type_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {PRICE_TYPE_LABELS[rule.price_type] || rule.price_type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      ₹{Math.round(rule.price_per_night).toLocaleString('en-IN')}/night
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rule.label} · {rule.valid_from} → {rule.valid_to}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDeleteRule(rule)}
                  disabled={deletingId === rule.id}
                  className="shrink-0"
                >
                  {deletingId === rule.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-500" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weekend Pricing Dialog ── */}
      <Dialog open={isWeekendDialogOpen} onOpenChange={setIsWeekendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Weekend Pricing</DialogTitle>
            <DialogDescription>
              Choose which weekdays count as "weekend" and the price to charge on those nights.
              Leave the price blank to disable weekend pricing for this room.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Weekend Days</Label>
              <div className="flex flex-wrap gap-3">
                {WEEKDAY_LABELS.map((label, day) => (
                  <label key={day} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox checked={weekendDays.includes(day)} onCheckedChange={() => toggleWeekendDay(day)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekendPrice">Weekend Price per Night (₹)</Label>
              <Input
                id="weekendPrice"
                type="number"
                min="0"
                step="0.01"
                value={weekendPrice}
                onChange={(e) => setWeekendPrice(e.target.value)}
                placeholder="Leave blank to disable"
              />
            </div>

            {weekendError && (
              <Alert variant="destructive">
                <AlertDescription>{weekendError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsWeekendDialogOpen(false)} disabled={isSavingWeekend}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveWeekend} disabled={isSavingWeekend}>
                {isSavingWeekend ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Override Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Special Date Pricing</DialogTitle>
            <DialogDescription>
              Set a price for a specific date range — festival, long weekend, or any custom period.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddOverride} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="override_room_type_id">Room Type *</Label>
              <Select
                value={form.room_type_id}
                onValueChange={(value) => setForm({ ...form, room_type_id: value })}
              >
                <SelectTrigger id="override_room_type_id">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_type">Type *</Label>
              <Select
                value={form.price_type}
                onValueChange={(value) => setForm({ ...form, price_type: value as OverrideForm['price_type'] })}
              >
                <SelectTrigger id="price_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="long_weekend">Long Weekend</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="override_label">Label *</Label>
              <Input
                id="override_label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Christmas Festival"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="override_start_date">Start Date *</Label>
                <Input
                  id="override_start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="override_end_date">End Date *</Label>
                <Input
                  id="override_end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="override_price">Price per Night (₹) *</Label>
              <Input
                id="override_price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</>
                ) : (
                  'Create Override'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
