'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Clock, Users, IndianRupee, Loader2 } from '@/components/icons'
import { createTripType, updateTripType, deleteTripType, createTimeSlot, deleteTimeSlot } from '@/lib/actions/boat-admin'

interface TripTypesManagerProps {
  boatId: string
  tripTypes: any[]
}

export function TripTypesManager({ boatId, tripTypes }: TripTypesManagerProps) {
  const router = useRouter()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete trip type "${name}"?`)) return
    setDeleting(id)
    try {
      const result = await deleteTripType(id)
      if (result.success) { router.refresh() } else { alert(result.error) }
    } catch { alert('Failed to delete') } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{tripTypes.length} trip type(s)</p>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Trip Type</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Trip Type</DialogTitle></DialogHeader>
            <TripTypeForm boatId={boatId} onSuccess={() => { setIsAddOpen(false); router.refresh() }} onCancel={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tripTypes.map((tt) => (
          <Card key={tt.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-lg">{tt.name}</h4>
                    <Badge variant={tt.status === 'available' ? 'default' : 'secondary'}>{tt.status}</Badge>
                    <Badge variant="outline">{tt.pricing_model === 'per_person' ? 'Per Person' : 'Per Boat'}</Badge>
                  </div>
                  {tt.description && <p className="text-sm text-muted-foreground">{tt.description}</p>}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{tt.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" />{tt.min_passengers}-{tt.max_passengers} passengers</span>
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" />
                      {tt.pricing_model === 'per_person'
                        ? `${tt.price_per_person}/person`
                        : `${tt.price_per_boat}/boat`}
                    </span>
                    <span>{tt.trip_time_slots?.length || 0} time slot(s)</span>
                  </div>
                  {tt.trip_time_slots?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tt.trip_time_slots.map((s: any) => (
                        <Badge key={s.id} variant="outline" className="text-xs">
                          {s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)} {s.label && `(${s.label})`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Dialog open={editingId === tt.id} onOpenChange={(open) => setEditingId(open ? tt.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Edit className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Edit Trip Type</DialogTitle></DialogHeader>
                      <TripTypeForm boatId={boatId} tripType={tt} isEdit onSuccess={() => { setEditingId(null); router.refresh() }} onCancel={() => setEditingId(null)} />
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold mb-3">Time Slots</h4>
                        <TimeSlotsInline tripTypeId={tt.id} slots={tt.trip_time_slots || []} />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(tt.id, tt.name)} disabled={deleting === tt.id}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function TripTypeForm({ boatId, tripType, isEdit, onSuccess, onCancel }: {
  boatId: string; tripType?: any; isEdit?: boolean; onSuccess: () => void; onCancel: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: tripType?.name || '',
    description: tripType?.description || '',
    duration_minutes: tripType?.duration_minutes || 120,
    max_passengers: tripType?.max_passengers || 10,
    min_passengers: tripType?.min_passengers || 1,
    pricing_model: tripType?.pricing_model || 'per_person',
    price_per_person: tripType?.price_per_person || '',
    price_per_boat: tripType?.price_per_boat || '',
    child_price_per_person: tripType?.child_price_per_person || '',
    max_trips_per_day: tripType?.max_trips_per_day || 3,
    includes_text: tripType?.includes_text || '',
    what_to_bring_text: tripType?.what_to_bring_text || '',
    free_cancellation_hours: tripType?.free_cancellation_hours || 24,
    status: tripType?.status || 'available',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const data = {
        boat_id: boatId,
        name: form.name,
        description: form.description || null,
        duration_minutes: Number(form.duration_minutes),
        max_passengers: Number(form.max_passengers),
        min_passengers: Number(form.min_passengers),
        pricing_model: form.pricing_model,
        price_per_person: form.pricing_model === 'per_person' && form.price_per_person ? Number(form.price_per_person) : null,
        price_per_boat: form.pricing_model === 'per_boat' && form.price_per_boat ? Number(form.price_per_boat) : null,
        child_price_per_person: form.pricing_model === 'per_person' && form.child_price_per_person ? Number(form.child_price_per_person) : null,
        max_trips_per_day: Number(form.max_trips_per_day),
        includes_text: form.includes_text || null,
        what_to_bring_text: form.what_to_bring_text || null,
        free_cancellation_hours: Number(form.free_cancellation_hours),
        status: form.status,
      }
      const result = isEdit ? await updateTripType(tripType.id, data) : await createTripType(data)
      if (result.success) { onSuccess() } else { alert(result.error) }
    } catch { alert('Failed to save') } finally { setIsSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Sunset Cruise" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
              <SelectItem value="seasonal">Seasonal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Duration (min)</Label>
          <Input type="number" min="15" value={form.duration_minutes} onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Min Passengers</Label>
          <Input type="number" min="1" value={form.min_passengers} onChange={(e) => setForm(f => ({ ...f, min_passengers: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Max Passengers</Label>
          <Input type="number" min="1" value={form.max_passengers} onChange={(e) => setForm(f => ({ ...f, max_passengers: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Pricing Model *</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="pricing_model" value="per_person" checked={form.pricing_model === 'per_person'} onChange={() => setForm(f => ({ ...f, pricing_model: 'per_person' }))} />
            Per Person
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="pricing_model" value="per_boat" checked={form.pricing_model === 'per_boat'} onChange={() => setForm(f => ({ ...f, pricing_model: 'per_boat' }))} />
            Per Boat (Flat Rate)
          </label>
        </div>
      </div>
      {form.pricing_model === 'per_person' ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Price per Person (INR) *</Label>
            <Input type="number" min="0" step="0.01" value={form.price_per_person} onChange={(e) => setForm(f => ({ ...f, price_per_person: e.target.value }))} required placeholder="500" />
          </div>
          <div className="space-y-2">
            <Label>Child Price per Person (INR)</Label>
            <Input type="number" min="0" step="0.01" value={form.child_price_per_person} onChange={(e) => setForm(f => ({ ...f, child_price_per_person: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Price per Boat (INR) *</Label>
          <Input type="number" min="0" step="0.01" value={form.price_per_boat} onChange={(e) => setForm(f => ({ ...f, price_per_boat: e.target.value }))} required placeholder="3000" />
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Max Trips per Day</Label>
          <Input type="number" min="1" value={form.max_trips_per_day} onChange={(e) => setForm(f => ({ ...f, max_trips_per_day: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Free Cancellation (hours)</Label>
          <Input type="number" min="0" value={form.free_cancellation_hours} onChange={(e) => setForm(f => ({ ...f, free_cancellation_hours: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>What&apos;s Included</Label>
        <Textarea value={form.includes_text} onChange={(e) => setForm(f => ({ ...f, includes_text: e.target.value }))} rows={2} placeholder="Life jackets, guide, refreshments..." />
      </div>
      <div className="space-y-2">
        <Label>What to Bring</Label>
        <Textarea value={form.what_to_bring_text} onChange={(e) => setForm(f => ({ ...f, what_to_bring_text: e.target.value }))} rows={2} placeholder="Sunscreen, hat, camera..." />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : isEdit ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

function TimeSlotsInline({ tripTypeId, slots }: { tripTypeId: string; slots: any[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ start_time: '', end_time: '', label: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async () => {
    if (!form.start_time || !form.end_time) return
    setSubmitting(true)
    try {
      const result = await createTimeSlot({
        trip_type_id: tripTypeId,
        start_time: form.start_time,
        end_time: form.end_time,
        label: form.label || undefined,
        display_order: slots.length,
      })
      if (result.success) {
        setForm({ start_time: '', end_time: '', label: '' })
        setAdding(false)
        router.refresh()
      } else { alert(result.error) }
    } catch { alert('Failed to add') } finally { setSubmitting(false) }
  }

  const handleDeleteSlot = async (id: string) => {
    const result = await deleteTimeSlot(id)
    if (result.success) { router.refresh() } else { alert(result.error) }
  }

  return (
    <div className="space-y-2">
      {slots.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-sm">
          <span className="font-mono">{s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)}</span>
          {s.label && <span className="text-muted-foreground">({s.label})</span>}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteSlot(s.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {adding ? (
        <div className="flex items-end gap-2">
          <div><Label className="text-xs">Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">End</Label><Input type="time" value={form.end_time} onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Label</Label><Input value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} className="h-8 text-sm" placeholder="Optional" /></div>
          <Button size="sm" onClick={handleAdd} disabled={submitting}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Add Slot</Button>
      )}
    </div>
  )
}
