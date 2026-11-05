'use client'

/**
 * HotelSearchBox — the detailed hotel search in the homepage hero and on /hotels (MakeMyTrip-style tiles):
 * destination (searchable, DestinationPicker), check-in / check-out (with the number of nights), rooms & guests (plus a
 * travelling-with-pets checkbox, `pets=1` in the URL) and price per night, plus stay-type chips.
 * Dates and guests live in useSearchStore; price and stay
 * type only go into the results URL (minPrice/maxPrice,
 * propertyType), which /hotels and HotelFilters already read.
 * On /hotels it starts from the URL (`initial`) and keeps the sidebar filters when searching
 * again (`keepFilters`); price or stay types changed in HotelFilters flow back in through `initial`.
 * `compact` drops the price tile and stay-type chips (the /hotels sidebar filters cover those).
 */
import { useEffect, useState, useTransition, type ComponentType, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, differenceInCalendarDays, format, startOfToday } from 'date-fns'
import {
  AlertCircle,
  Baby,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Hotel,
  House,
  IndianRupee,
  Loader2,
  MapPin,
  PawPrint,
  Search,
  TreePalm,
  User,
  Users,
} from '@/components/icons'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, getMaxBookableDate } from '@/lib/utils'
import { useSearchStore } from '@/lib/stores/use-search-store'
import { DestinationPicker, type Destination } from './DestinationPicker'
import { GuestCounter } from './GuestCounter'
import { ChildAgeSelects } from './ChildAgeSelects'
import { GuestsGoodToKnow } from './GuestsGoodToKnow'
import { childAgesParam } from '@/lib/utils/occupancy'
import { DEFAULT_DESTINATION } from '@/lib/config/search'

/** The region line under a destination: known for the default one, else empty */
const destinationFor = (name: string): Destination =>
  name === DEFAULT_DESTINATION.name ? DEFAULT_DESTINATION : { name, region: '' }

const PRICE_RANGES = [
  { value: 'any', label: 'Any price', min: undefined, max: undefined },
  { value: 'upto-1500', label: 'Up to ₹1,500', min: undefined, max: 1500 },
  { value: '1500-2500', label: '₹1,500 – ₹2,500', min: 1500, max: 2500 },
  { value: '2500-5000', label: '₹2,500 – ₹5,000', min: 2500, max: 5000 },
  { value: '5000-plus', label: '₹5,000+', min: 5000, max: undefined },
] as const

type PriceRange = { min?: number; max?: number }

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** Preset label, or the range HotelFilters' slider set (e.g. "₹1,200 – ₹4,000") */
function priceLabel({ min, max }: PriceRange) {
  const preset = PRICE_RANGES.find((p) => p.min === min && p.max === max)
  if (preset) return preset.label
  if (min !== undefined && max !== undefined) return `${rupees(min)} – ${rupees(max)}`
  return min !== undefined ? `${rupees(min)}+` : `Up to ${rupees(max!)}`
}

const toNumber = (value?: string) => {
  const n = value ? Number(value) : NaN
  return Number.isFinite(n) ? n : undefined
}

const STAY_TYPES = [
  { value: 'homestay', label: 'Homestays', icon: House },
  { value: 'hotel', label: 'Hotels', icon: Hotel },
  { value: 'resort', label: 'Resorts', icon: TreePalm },
  { value: 'villa', label: 'Villas', icon: Building2 },
] as const

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

/** Label / big value / hint stack used by every field. Phones get a tighter tile without the hint line (by request) */
function Tile({
  icon: Icon,
  label,
  sub,
  children,
  error,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  sub: ReactNode
  children: ReactNode
  error?: boolean
}) {
  return (
    <span className="flex min-w-0 flex-col items-start px-3 py-2 text-left sm:px-4 sm:py-2.5 lg:px-3 xl:px-4">
      <span
        className={cn(
          'flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.1em]',
          error ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        <Icon className={cn('h-3.5 w-3.5 shrink-0', error ? 'text-destructive' : 'text-primary')} />
        {label}
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60 lg:hidden xl:block" />
      </span>
      <span className="mt-0.5 flex min-h-6 max-w-full items-baseline gap-1 whitespace-nowrap font-heading text-foreground sm:mt-1 sm:min-h-7">
        {children}
      </span>
      <span className="mt-0.5 hidden max-w-full items-center gap-1.5 truncate text-[11.5px] text-muted-foreground sm:flex">{sub}</span>
    </span>
  )
}

function DateValue({ date, placeholder }: { date: Date | undefined; placeholder: string }) {
  if (!date) return <span className="text-[15px] font-bold text-muted-foreground/70">{placeholder}</span>
  return (
    <>
      <span className="text-lg font-extrabold leading-none sm:text-[21px] xl:text-[22px]">{format(date, 'd')}</span>
      <span className="text-xs font-bold sm:text-[13px] xl:text-sm">{format(date, "MMM ''yy")}</span>
    </>
  )
}

/** Each field: own border on phones, joined into one bordered row with dividers on desktop */
const fieldClass =
  'group w-full rounded-xl border border-border bg-card transition-colors hover:bg-mint/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-mint/60 lg:rounded-none lg:border-0'

export interface HotelSearchBoxProps {
  /** Search params to start from (the /hotels URL) */
  initial?: {
    location?: string
    checkIn?: string
    checkOut?: string
    adults?: string
    children?: string
    rooms?: string
    pets?: string
    /** Children's ages, "2,6" */
    ages?: string
    minPrice?: string
    maxPrice?: string
    propertyType?: string
  }
  /** Keep the other params already in the URL (star rating, amenities, sort) when searching */
  keepFilters?: boolean
  /** Destination, dates and guests only; price and stay type are left as they are in the URL */
  compact?: boolean
}

export function HotelSearchBox({ initial, keepFilters = false, compact = false }: HotelSearchBoxProps = {}) {
  const router = useRouter()
  // True from Search until the results page has rendered (spinner in the button)
  const [searching, startSearch] = useTransition()
  const { checkIn, checkOut, adults, children, childAges, rooms, pets, isGuestOpen } = useSearchStore(
    useShallow((s) => ({
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      adults: s.adults,
      children: s.children,
      childAges: s.childAges,
      rooms: s.rooms,
      pets: s.pets,
      isGuestOpen: s.isGuestOpen,
    }))
  )
  const { setDateRange, setAdults, setChildren, setChildAge, setRooms, setPets, setIsGuestOpen, hydrateFromParams, setPickedCity } = useSearchStore(
    useShallow((s) => ({
      setChildAge: s.setChildAge,
      hydrateFromParams: s.hydrateFromParams,
      setPickedCity: s.setPickedCity,
      setDateRange: s.setDateRange,
      setAdults: s.setAdults,
      setChildren: s.setChildren,
      setRooms: s.setRooms,
      setPets: s.setPets,
      setIsGuestOpen: s.setIsGuestOpen,
    }))
  )

  const [destination, setDestination] = useState<Destination>(() =>
    initial?.location ? destinationFor(initial.location) : DEFAULT_DESTINATION
  )
  // The destination shown (the default until the guest picks one) is the city the homepage travel stories follow
  const destinationName = destination.name
  useEffect(() => {
    setPickedCity(destinationName)
  }, [destinationName, setPickedCity])
  // The /hotels box follows the URL when a new search changes it
  const initialLocation = initial?.location
  useEffect(() => {
    if (initialLocation) setDestination((d) => (d.name === initialLocation ? d : destinationFor(initialLocation)))
  }, [initialLocation])
  const [datesOpen, setDatesOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [dateError, setDateError] = useState(false)
  // Search / Apply pressed with a child's age not picked yet: those fields turn red
  const [agesMissing, setAgesMissing] = useState(false)
  const agesComplete = childAges.every((age) => age != null)
  const [price, setPrice] = useState<PriceRange>({})
  const [stayTypes, setStayTypes] = useState<string[]>([])
  const [months, setMonths] = useState(2)

  // Price and stay type follow the URL, which the sidebar filters also change
  const initialMin = initial?.minPrice
  const initialMax = initial?.maxPrice
  const initialTypes = initial?.propertyType
  useEffect(() => {
    setPrice({ min: toNumber(initialMin), max: toNumber(initialMax) })
    setStayTypes(initialTypes ? initialTypes.split(',').filter(Boolean) : [])
  }, [initialMin, initialMax, initialTypes])

  // Dates and guests come from the URL when there is one; otherwise start with tonight → tomorrow,
  // like most booking sites (set on the client to avoid stale SSR dates)
  useEffect(() => {
    if (initial) hydrateFromParams(initial)
    const { checkIn: currentIn, checkOut: currentOut } = useSearchStore.getState()
    if (!currentIn && !currentOut) {
      const today = startOfToday()
      setDateRange(today, addDays(today, 1))
    }
    setMonths(window.matchMedia('(min-width: 768px)').matches ? 2 : 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read the URL once, on mount
  }, [])

  const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0
  const anyPrice = price.min === undefined && price.max === undefined

  const guests = adults + children
  const guestBreakdown = `${adults} ${plural(adults, 'adult')} · ${
    children > 0 ? `${children} ${plural(children, 'child', 'children')}` : 'no children'
  }${pets ? ' · pets' : ''}`
  // Every room needs at least one adult
  const changeAdults = (value: number) => {
    setAdults(value)
    if (rooms > value) setRooms(value)
  }

  const pickDate = (day: Date) => {
    // First click (or a click before check-in) sets check-in; the next sets check-out
    if (!checkIn || checkOut || day <= checkIn) {
      setDateRange(day, undefined)
      return
    }
    setDateRange(checkIn, day)
    setDateError(false)
    setDatesOpen(false)
  }

  const toggleStayType = (value: string) =>
    setStayTypes((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]))

  const handleSearch = () => {
    if (searching) return
    if (!checkIn || !checkOut) {
      setDateError(true)
      setDatesOpen(true)
      return
    }
    setDateError(false)
    // Each child's age prices the stays (ages 6–11 pay the child rate), MakeMyTrip-style
    if (!agesComplete) {
      setAgesMissing(true)
      setIsGuestOpen(true)
      return
    }

    const params = new URLSearchParams(keepFilters ? window.location.search : '')
    const put = (key: string, value: string | number | undefined) =>
      value === undefined || value === '' ? params.delete(key) : params.set(key, String(value))
    put('location', destination.name)
    put('checkIn', format(checkIn, 'yyyy-MM-dd'))
    put('checkOut', format(checkOut, 'yyyy-MM-dd'))
    put('adults', adults)
    put('children', children || undefined)
    put('ages', children ? childAgesParam(childAges) : undefined)
    put('rooms', rooms)
    put('pets', pets ? 1 : undefined)
    if (!compact) {
      put('minPrice', price.min)
      put('maxPrice', price.max)
      put('propertyType', stayTypes.join(','))
    }

    startSearch(() => router.push(`/hotels?${params.toString()}`))
  }

  return (
    <div className={cn('space-y-2.5 sm:space-y-3', compact ? 'p-0.5' : 'p-0.5 sm:p-1')}>
      <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-stretch">
        <div
          className={cn(
            'grid flex-1 grid-cols-2 gap-1.5 sm:gap-2 lg:gap-0 lg:divide-x lg:divide-border lg:overflow-hidden lg:rounded-xl lg:border lg:border-border',
            compact ? 'lg:grid-cols-[0.9fr_1.6fr_1.15fr]' : 'lg:grid-cols-[0.95fr_1.7fr_1.25fr_0.95fr]'
          )}
        >
          {/* Destination: searchable (places with stays, and stays by name) */}
          <DestinationPicker
            value={destination}
            onChange={setDestination}
            onPickStay={(slug) => router.push(`/hotels/${slug}`)}
            className={cn(fieldClass, 'col-span-2 lg:col-span-1')}
          >
            <Tile icon={MapPin} label="Destination" sub={destination.region || 'Search a city or stay'}>
              <span className="truncate text-[17px] font-extrabold leading-none sm:text-[19px]">{destination.name}</span>
            </Tile>
          </DestinationPicker>

          {/* Check-in / check-out */}
          <Popover open={datesOpen} onOpenChange={setDatesOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  fieldClass,
                  'relative col-span-2 grid grid-cols-2 divide-x divide-border lg:col-span-1',
                  dateError && 'border-destructive ring-1 ring-destructive lg:ring-inset'
                )}
              >
                <Tile
                  icon={CalendarDays}
                  label="Check-in"
                  sub={checkIn ? format(checkIn, 'EEEE') : 'Select a date'}
                  error={dateError && !checkIn}
                >
                  <DateValue date={checkIn} placeholder="Add date" />
                </Tile>
                <Tile
                  icon={CalendarDays}
                  label="Check-out"
                  sub={
                    checkOut ? (
                      <>
                        {format(checkOut, 'EEEE')}
                        {nights > 0 && (
                          <span className="rounded-full bg-mint px-1.5 py-px text-[10px] font-semibold text-primary">
                            {nights} {plural(nights, 'night')}
                          </span>
                        )}
                      </>
                    ) : (
                      'Select a date'
                    )
                  }
                  error={dateError && !checkOut}
                >
                  <DateValue date={checkOut} placeholder="Add date" />
                </Tile>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {!checkIn || checkOut ? 'Select your check-in date' : 'Now select your check-out date'}
                </p>
                {nights > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {nights} {plural(nights, 'night')}
                  </span>
                )}
              </div>
              <Calendar
                mode="range"
                selected={{ from: checkIn, to: checkOut }}
                onSelect={(_range, day) => pickDate(day)}
                numberOfMonths={months}
                defaultMonth={checkIn}
                disabled={(date) => date < startOfToday() || date > getMaxBookableDate()}
                toDate={getMaxBookableDate()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Rooms & guests */}
          <Popover open={isGuestOpen} onOpenChange={setIsGuestOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={cn(fieldClass, compact && 'col-span-2 lg:col-span-1')}>
                <Tile icon={Users} label="Rooms & Guests" sub={guestBreakdown}>
                  <span className="text-lg font-extrabold leading-none sm:text-[21px] xl:text-[22px]">{guests}</span>
                  <span className="text-xs font-bold sm:text-[13px] xl:text-sm">{plural(guests, 'Guest')}</span>
                  <span aria-hidden="true" className="mx-1.5 h-4 w-px self-center bg-border" />
                  <span className="text-lg font-extrabold leading-none sm:text-[21px] xl:text-[22px]">{rooms}</span>
                  <span className="text-xs font-bold sm:text-[13px] xl:text-sm">{plural(rooms, 'Room')}</span>
                </Tile>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[384px] max-w-[calc(100vw-2rem)] p-0">
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 pb-3 pt-4">
                <div>
                  <p className="font-heading text-sm font-bold text-foreground">Who&apos;s travelling?</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {guests} {plural(guests, 'guest')} in {rooms} {plural(rooms, 'room')} · {guestBreakdown}
                  </p>
                </div>
                {/* Good to know: in a popup behind (i), by request */}
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
                    <ChildAgeSelects
                      ages={childAges}
                      onChange={setChildAge}
                      showMissing={agesMissing}
                      idPrefix="search-child-age"
                    />
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
                <label htmlFor="guests-pets" className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                      <PawPrint className="h-3.5 w-3.5" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-semibold text-foreground">Travelling with pets?</span>
                      <span className="block text-[11px] text-muted-foreground">We&apos;ll let the property know</span>
                    </span>
                  </span>
                  <Checkbox
                    id="guests-pets"
                    checked={pets}
                    onCheckedChange={(value) => setPets(value === true)}
                    className="mr-2 h-5 w-5"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{guests}</span> {plural(guests, 'guest')},{' '}
                  <span className="font-semibold text-foreground">{rooms}</span> {plural(rooms, 'room')}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="px-5"
                  onClick={() => {
                    if (!agesComplete) {
                      setAgesMissing(true)
                      return
                    }
                    setIsGuestOpen(false)
                  }}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Price per night */}
          {!compact && (
            <Popover open={priceOpen} onOpenChange={setPriceOpen}>
              <PopoverTrigger asChild>
                <button type="button" className={fieldClass}>
                  <Tile icon={IndianRupee} label="Price / night" sub={anyPrice ? 'All budgets' : 'Per room, per night'}>
                    <span className="truncate text-sm font-bold leading-7 xl:text-[15px]">{priceLabel(price)}</span>
                  </Tile>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-1.5">
                {PRICE_RANGES.map((range) => {
                  const selected = range.min === price.min && range.max === price.max
                  return (
                    <button
                      key={range.value}
                      type="button"
                      onClick={() => {
                        setPrice({ min: range.min, max: range.max })
                        setPriceOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-mint/60',
                        selected ? 'font-semibold text-primary' : 'text-foreground'
                      )}
                    >
                      {range.label}
                      {selected && <Check className="h-4 w-4" />}
                    </button>
                  )
                })}
              </PopoverContent>
            </Popover>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          aria-busy={searching}
          className="h-11 rounded-xl px-8 text-sm font-bold uppercase tracking-wider shadow-sm sm:h-12 transition-all active:scale-[0.98] disabled:opacity-100 lg:h-auto lg:min-w-[124px] lg:px-5 xl:min-w-[150px] xl:px-8"
        >
          {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          {searching ? 'Searching' : 'Search'}
        </Button>
      </div>

      {dateError && (
        <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Please select your check-in and check-out dates
        </p>
      )}

      {/* Stay type chips */}
      {!compact && (
        <div className="flex items-center gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-hide">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BedDouble className="h-3.5 w-3.5 text-primary" />
            Looking for
          </span>
          {STAY_TYPES.map(({ value, label, icon: Icon }) => {
            const active = stayTypes.includes(value)
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleStayType(value)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-mint/60'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
