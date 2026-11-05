'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Edit, Trash2, UtensilsCrossed, Loader2 } from '@/components/icons'
import { createMealPlan, updateMealPlan, deleteMealPlan } from '@/lib/actions/admin'
import type { MealPlan, MealType } from '@/lib/types'

interface MealPlansManagerProps {
  hotelId: string
  mealPlans: MealPlan[]
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner']

interface MealPlanFormData {
  meal_type: MealType
  name: string
  description: string
  price_per_person: string
  child_price_per_person: string
}

const emptyForm: MealPlanFormData = {
  meal_type: 'breakfast',
  name: '',
  description: '',
  price_per_person: '',
  child_price_per_person: '',
}

export function MealPlansManager({ hotelId, mealPlans }: MealPlansManagerProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MealPlanFormData>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setIsDialogOpen(true)
  }

  const openEdit = (mp: MealPlan) => {
    setEditingId(mp.id)
    setForm({
      meal_type: mp.meal_type,
      name: mp.name,
      description: mp.description || '',
      price_per_person: mp.price_per_person.toString(),
      child_price_per_person: mp.child_price_per_person?.toString() ?? '',
    })
    setError(null)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const price = parseFloat(form.price_per_person)
      if (isNaN(price) || price < 0) {
        throw new Error('Please enter a valid adult price')
      }

      if (!form.name.trim()) {
        throw new Error('Please enter a name')
      }

      const childPrice = form.child_price_per_person.trim()
        ? parseFloat(form.child_price_per_person)
        : undefined
      if (childPrice !== undefined && (isNaN(childPrice) || childPrice < 0)) {
        throw new Error('Please enter a valid child price')
      }

      if (editingId) {
        const result = await updateMealPlan(editingId, {
          meal_type: form.meal_type,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price_per_person: price,
          child_price_per_person: childPrice ?? null,
        })
        if (!result.success) throw new Error(result.error)
      } else {
        const result = await createMealPlan({
          hotel_id: hotelId,
          meal_type: form.meal_type,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price_per_person: price,
          child_price_per_person: childPrice,
        })
        if (!result.success) throw new Error(result.error)
      }

      setIsDialogOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (mp: MealPlan) => {
    if (!confirm(`Delete "${mp.name}"? This cannot be undone.`)) return

    setIsDeleting(mp.id)
    try {
      const result = await deleteMealPlan(mp.id)
      if (!result.success) {
        alert(result.error || 'Failed to delete')
      }
      router.refresh()
    } finally {
      setIsDeleting(null)
    }
  }

  const handleToggleStatus = async (mp: MealPlan) => {
    const newStatus = mp.status === 'active' ? 'inactive' : 'active'
    const result = await updateMealPlan(mp.id, { status: newStatus })
    if (!result.success) {
      alert(result.error || 'Failed to update status')
    }
    router.refresh()
  }

  // Group meal plans by type
  const grouped = MEAL_TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = mealPlans.filter((mp) => mp.meal_type === type)
      return acc
    },
    {} as Record<MealType, MealPlan[]>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {mealPlans.length} meal plan{mealPlans.length !== 1 ? 's' : ''} configured
        </p>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Meal Plan
        </Button>
      </div>

      {mealPlans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No meal plans yet</p>
          <p className="text-sm mt-1">Add breakfast, lunch, or dinner options for guests</p>
        </div>
      ) : (
        <div className="space-y-6">
          {MEAL_TYPE_ORDER.map((type) => {
            const plans = grouped[type]
            if (plans.length === 0) return null

            return (
              <div key={type}>
                <h3 className="text-lg font-semibold mb-3">{MEAL_TYPE_LABELS[type]}</h3>
                <div className="space-y-3">
                  {plans.map((mp) => (
                    <div
                      key={mp.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{mp.name}</span>
                          <Badge variant={mp.status === 'active' ? 'default' : 'secondary'}>
                            {mp.status}
                          </Badge>
                        </div>
                        {mp.description && (
                          <p className="text-sm text-muted-foreground mb-1">{mp.description}</p>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          ₹{mp.price_per_person.toLocaleString('en-IN')} / adult / night
                        </p>
                        {mp.child_price_per_person != null && (
                          <p className="text-xs text-muted-foreground">
                            ₹{mp.child_price_per_person.toLocaleString('en-IN')} / child (6–11 yrs) / night
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(mp)}
                        >
                          {mp.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEdit(mp)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(mp)}
                          disabled={isDeleting === mp.id}
                        >
                          {isDeleting === mp.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Meal Plan' : 'Add Meal Plan'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the meal plan details'
                : 'Create a new meal plan for this hotel'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meal_type">Meal Type *</Label>
              <Select
                value={form.meal_type}
                onValueChange={(v) => setForm({ ...form, meal_type: v as MealType })}
              >
                <SelectTrigger id="meal_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. South Indian Breakfast"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Idli + Sambar + Chutney + Coffee"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Adult Price / Night (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_per_person}
                  onChange={(e) => setForm({ ...form, price_per_person: e.target.value })}
                  placeholder="250"
                  required
                />
                <p className="text-[10px] text-muted-foreground">Age 12+ / per person</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="child_price">Child Price / Night (₹)</Label>
                <Input
                  id="child_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.child_price_per_person}
                  onChange={(e) => setForm({ ...form, child_price_per_person: e.target.value })}
                  placeholder="125"
                />
                <p className="text-[10px] text-muted-foreground">Age 6–11 · 0–5 free</p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingId ? 'Updating...' : 'Creating...'}
                  </>
                ) : editingId ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
