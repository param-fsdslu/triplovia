'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { getAllAmenities } from '@/lib/actions/admin'
import { addBoatAmenity, removeBoatAmenity } from '@/lib/actions/boat-admin'
import { Plus, X, Loader2 } from '@/components/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BoatAmenitiesManagerProps {
  boatId: string
  currentAmenities: any[]
}

export function BoatAmenitiesManager({ boatId, currentAmenities }: BoatAmenitiesManagerProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [allAmenities, setAllAmenities] = useState<any[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const currentAmenityIds = currentAmenities.map((ha: any) => ha.amenity?.id).filter(Boolean)

  useEffect(() => {
    if (isDialogOpen) {
      setIsLoading(true)
      getAllAmenities().then(result => {
        if (result.success) setAllAmenities(result.amenities)
      }).finally(() => setIsLoading(false))
    }
  }, [isDialogOpen])

  const handleToggle = (id: string) => {
    setSelectedAmenities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleAdd = async () => {
    if (selectedAmenities.length === 0) return
    setIsAdding(true)
    try {
      await Promise.all(selectedAmenities.map(id => addBoatAmenity(boatId, id)))
      setIsDialogOpen(false); setSelectedAmenities([]); router.refresh()
    } catch { alert('Failed to add amenities') } finally { setIsAdding(false) }
  }

  const handleRemove = async (boatAmenityId: string) => {
    if (!confirm('Remove this amenity?')) return
    setIsRemoving(boatAmenityId)
    try {
      const result = await removeBoatAmenity(boatAmenityId)
      if (result.success) { router.refresh() } else { alert(result.error) }
    } catch { alert('Failed to remove') } finally { setIsRemoving(null) }
  }

  const amenitiesByCategory = allAmenities.reduce((acc: any, a: any) => {
    const cat = a.category?.name || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(a)
    return acc
  }, {})

  const currentByCategory = currentAmenities.reduce((acc: any, ha: any) => {
    const cat = ha.amenity?.category?.name || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ha)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{currentAmenities.length} amenitie(s)</p>
        <Button onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Amenities</Button>
      </div>

      {currentAmenities.length === 0 ? (
        <Alert><AlertDescription>No amenities added yet.</AlertDescription></Alert>
      ) : (
        <div className="space-y-6">
          {Object.entries(currentByCategory).map(([category, amenities]: [string, any]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground mb-3">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {amenities.map((ha: any) => (
                  <Badge key={ha.id} variant="secondary" className="pl-3 pr-1 py-1.5">
                    {ha.amenity?.name}
                    <Button size="sm" variant="ghost" className="h-4 w-4 p-0 ml-2 hover:bg-transparent" onClick={() => handleRemove(ha.id)} disabled={isRemoving === ha.id}>
                      {isRemoving === ha.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Amenities</DialogTitle><DialogDescription>Select amenities for this boat</DialogDescription></DialogHeader>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-6 py-4">
              {Object.entries(amenitiesByCategory).map(([category, amenities]: [string, any]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-foreground mb-3">{category}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {amenities.filter((a: any) => !currentAmenityIds.includes(a.id)).map((a: any) => (
                      <div key={a.id} className="flex items-center space-x-2">
                        <Checkbox id={a.id} checked={selectedAmenities.includes(a.id)} onCheckedChange={() => handleToggle(a.id)} />
                        <label htmlFor={a.id} className="text-sm cursor-pointer">{a.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); setSelectedAmenities([]) }} disabled={isAdding}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isAdding || selectedAmenities.length === 0}>
              {isAdding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : `Add ${selectedAmenities.length} Amenitie(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
