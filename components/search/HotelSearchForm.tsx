'use client'

/**
 * HotelSearchForm — the inline search form on the /hotels results page.
 *
 * Shares state with SearchWidget via useSearchStore (Zustand). On mount, calls
 * hydrateFromParams() to populate the store from the URL search params passed
 * as props from the server component (e.g. ?city=Honnavar&adults=2).
 * This bridges the server-rendered URL state back into the client store.
 *
 * Two separate useShallow selectors are used — one for reading state, one for
 * actions — to avoid re-renders when unrelated store fields change.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, MapPin, Search, Minus, Plus, User, AlertCircle } from '@/components/icons'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card } from '@/components/ui/card'
import { cn, getMaxBookableDate } from '@/lib/utils'
import { useSearchStore } from '@/lib/stores/use-search-store'

interface HotelSearchFormProps {
  initialLocation?: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialAdults?: string
  initialChildren?: string
  initialRooms?: string
}

export function HotelSearchForm({
  initialLocation,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialChildren,
  initialRooms,
}: HotelSearchFormProps) {
  const router = useRouter()
  const [dateError, setDateError] = useState(false)

  const {
    location, checkIn, checkOut, adults, children, rooms, isGuestOpen,
  } = useSearchStore(
    useShallow((s) => ({
      location: s.location,
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      adults: s.adults,
      children: s.children,
      rooms: s.rooms,
      isGuestOpen: s.isGuestOpen,
    }))
  )

  const {
    setLocation, setDateRange, setAdults, setChildren, setRooms,
    setIsGuestOpen, hydrateFromParams,
  } = useSearchStore(
    useShallow((s) => ({
      setLocation: s.setLocation,
      setDateRange: s.setDateRange,
      setAdults: s.setAdults,
      setChildren: s.setChildren,
      setRooms: s.setRooms,
      setIsGuestOpen: s.setIsGuestOpen,
      hydrateFromParams: s.hydrateFromParams,
    }))
  )

  // Sync URL params into store on mount
  useEffect(() => {
    hydrateFromParams({
      location: initialLocation,
      checkIn: initialCheckIn,
      checkOut: initialCheckOut,
      adults: initialAdults,
      children: initialChildren,
      rooms: initialRooms,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      setDateError(true)
      return
    }
    setDateError(false)

    const params = new URLSearchParams()
    if (location) params.set('location', location)
    params.set('checkIn', format(checkIn, 'yyyy-MM-dd'))
    params.set('checkOut', format(checkOut, 'yyyy-MM-dd'))
    if (adults) params.set('adults', adults.toString())
    if (children) params.set('children', children.toString())
    if (rooms) params.set('rooms', rooms.toString())

    router.push(`/hotels?${params.toString()}`)
  }

  const GuestCounter = ({ label, value, setValue, min = 0 }: { label: string, value: number, setValue: (v: number) => void, min?: number }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <span className="text-sm font-medium text-foreground/70">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          onClick={() => setValue(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-4 text-center text-sm font-semibold">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => setValue(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <Card className="p-2 sm:p-3 bg-white shadow-xl border border-border">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-1 rounded-full">
        {/* Location */}
        <div className="md:col-span-4 relative group">
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <Input
            placeholder="City, state, or hotel name"
            className="pl-10 sm:pl-12 h-12 sm:h-14 border border-border shadow-none text-sm sm:text-base font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary hover:border-primary/50 rounded-full transition-colors cursor-default"
            value={location}
            readOnly
            title="More locations coming soon"
          />
        </div>

        {/* Check-in / Check-out Dates */}
        <div className="md:col-span-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-medium h-12 sm:h-14 shadow-none rounded-full px-3 sm:px-4 bg-card hover:bg-muted/50 hover:text-foreground hover:border-primary/50 transition-colors",
                  !checkIn && "text-muted-foreground",
                  dateError && "border-destructive ring-1 ring-destructive"
                )}
              >
                <CalendarIcon className={cn("mr-2 sm:mr-3 h-5 w-5 shrink-0", dateError ? "text-destructive" : "text-muted-foreground")} />
                {checkIn ? (
                  checkOut ? (
                    <span className="truncate">
                      {format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d')}
                    </span>
                  ) : (
                    format(checkIn, 'EEE, MMM d')
                  )
                ) : (
                  <span className={dateError ? "text-destructive" : ""}>Check-in — Check-out</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: checkIn, to: checkOut }}
                onSelect={(range) => {
                  setDateRange(range?.from, range?.to)
                  if (range?.from && range?.to) setDateError(false)
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date > getMaxBookableDate()}
                toDate={getMaxBookableDate()}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {dateError && (
            <p className="flex items-center gap-1 text-destructive text-xs mt-1 px-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Please select check-in and check-out dates
            </p>
          )}
        </div>

        {/* Guests Selector */}
        <div className="md:col-span-3">
          <Popover open={isGuestOpen} onOpenChange={setIsGuestOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-medium h-12 sm:h-14 shadow-none rounded-full px-3 sm:px-4 bg-card hover:bg-muted/50 hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <User className="mr-2 sm:mr-3 h-5 w-5 text-muted-foreground" />
                <span className="truncate text-foreground/80 text-sm sm:text-base">
                  {adults} adult{adults === 1 ? '' : 's'}{children > 0 ? ` · ${children} ${children === 1 ? 'child' : 'children'}` : ''} · {rooms} room{rooms === 1 ? '' : 's'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 sm:w-80 p-4" align="end">
              <div className="space-y-1">
                <GuestCounter label="Adults" value={adults} setValue={setAdults} min={1} />
                <GuestCounter label="Children" value={children} setValue={setChildren} />
                <GuestCounter label="Rooms" value={rooms} setValue={setRooms} min={1} />
              </div>
              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => setIsGuestOpen(false)}
              >
                Done
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search Button */}
        <div className="md:col-span-2">
          <Button
            onClick={handleSearch}
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-full shadow-sm transition-all active:scale-[0.98]"
          >
            <Search className="mr-2 h-5 w-5 sm:hidden" />
            Search
          </Button>
        </div>
      </div>
    </Card>
  )
}
