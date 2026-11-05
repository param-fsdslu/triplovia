'use client'

/**
 * Rooms & guests on the hotel page (beside StayDatesPicker), MakeMyTrip-style: the party is
 * picked here (or in the search box) and every room type then shows how many of its rooms that
 * party needs and the price for them (lib/utils/occupancy.ts). Children get an age each
 * (search/ChildAgeSelects), which prices them: 6–11 pay the child rate. Writes to useSearchStore.
 */
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Baby, BedDouble, PawPrint, User, Users } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { GuestCounter } from '@/components/search/GuestCounter'
import { ChildAgeSelects } from '@/components/search/ChildAgeSelects'
import { GuestsGoodToKnow } from '@/components/search/GuestsGoodToKnow'
import { useSearchStore } from '@/lib/stores/use-search-store'
import { cn } from '@/lib/utils'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function StayGuestsPicker({ className }: { className?: string }) {
  const { adults, children, childAges, rooms, pets, open, setOpen, setAdults, setChildren, setChildAge, setRooms, setPets } = useSearchStore(
    useShallow((s) => ({
      // The search box's open flag (it isn't on the hotel page): Select room opens this picker
      // when a child's age is missing
      open: s.isGuestOpen,
      setOpen: s.setIsGuestOpen,
      adults: s.adults,
      children: s.children,
      childAges: s.childAges,
      setChildAge: s.setChildAge,
      rooms: s.rooms,
      pets: s.pets,
      setAdults: s.setAdults,
      setChildren: s.setChildren,
      setRooms: s.setRooms,
      setPets: s.setPets,
    }))
  )
  // Apply (or Select room) pressed with a child's age not picked yet: those fields turn red
  const [agesMissing, setAgesMissing] = useState(false)
  const agesComplete = childAges.every((age) => age != null)
  // Never arrive open (the flag may be left over from the search box)
  useEffect(() => {
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (open && !agesComplete) setAgesMissing(true)
    // Opened by Select room with ages missing: show which
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Every room needs at least one adult
  const changeAdults = (value: number) => {
    setAdults(value)
    if (rooms > value) setRooms(value)
  }

  const childrenLabel =
    children > 0
      ? `${plural(children, 'child', 'children')}${agesComplete ? ` (${childAges.join(', ')} yrs)` : ''}`
      : null
  const summary = [plural(adults, 'adult'), childrenLabel, pets ? 'pets' : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id="stay-guests"
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          <Users className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] leading-tight text-muted-foreground">Rooms &amp; guests</span>
            <span className="block truncate text-sm font-semibold text-foreground">
              {summary} · {plural(rooms, 'room')}
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">Change</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 pb-3 pt-4">
          <div>
            <p className="font-heading text-sm font-bold text-foreground">Who&apos;s travelling?</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Each room type below adds rooms when your group needs more than {plural(rooms, 'room')}.
            </p>
          </div>
          <GuestsGoodToKnow />
        </div>
        <div className="divide-y divide-border px-4 py-1">
          <GuestCounter icon={User} label="Adults" hint="Age 12 and above" value={adults} setValue={changeAdults} min={1} max={24} />
          <GuestCounter icon={Baby} label="Children" hint="Age 1 – 11" value={children} setValue={setChildren} min={0} max={12} />
          {children > 0 && (
            <div className="space-y-2.5 py-3">
              <p className={cn('text-[12px] font-semibold', agesMissing && !agesComplete ? 'text-destructive' : 'text-muted-foreground')}>
                {agesMissing && !agesComplete
                  ? `Select ${children === 1 ? "your child's age" : "each child's age"}`
                  : 'Age of children'}
              </p>
              <ChildAgeSelects ages={childAges} onChange={setChildAge} showMissing={agesMissing} idPrefix="stay-child-age" />
            </div>
          )}
          <GuestCounter
            icon={BedDouble}
            label="Rooms"
            hint="At least one adult per room"
            value={rooms}
            setValue={setRooms}
            min={1}
            max={Math.min(8, adults)}
          />
          <label htmlFor="stay-guests-pets" className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                <PawPrint className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-semibold text-foreground">Travelling with pets?</span>
            </span>
            <Checkbox
              id="stay-guests-pets"
              checked={pets}
              onCheckedChange={(value) => setPets(value === true)}
              className="mr-2 h-5 w-5"
            />
          </label>
        </div>
        <div className="flex justify-end border-t border-border bg-muted/40 px-4 py-3">
          <Button
            type="button"
            size="sm"
            className="px-5"
            onClick={() => {
              if (!agesComplete) {
                setAgesMissing(true)
                return
              }
              setOpen(false)
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
