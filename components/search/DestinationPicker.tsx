'use client'

/**
 * The search box's destination field: a popover with a search input over the cities that have
 * stays (with counts) and the stays by name (useDestinationIndex). Typing filters as you go
 * ("b" → Bhatkal); a city also matches by its district or state. Picking a city sets the
 * destination, picking a stay opens its page, and "Search “…”" searches for the typed text
 * (the results page matches city, district, state and hotel name). Arrow keys move through the list.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Hotel, Loader2, MapPin, Search } from '@/components/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDestinationIndex } from '@/lib/hooks/use-hotels'
import type { DestinationPlace } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface Destination {
  name: string
  region: string
}

interface Option {
  key: string
  kind: DestinationPlace['kind'] | 'stay' | 'text'
  name: string
  region: string
  stays?: number
  slug?: string
}

const ICONS = { city: MapPin, stay: Hotel, text: Search }
const MAX_PLACES = 6
const MAX_STAYS = 5

const normalize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim()

/** The name with the matched part in bold */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? normalize(text).indexOf(normalize(query)) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-bold text-foreground">{text.slice(at, at + query.trim().length)}</strong>
      {text.slice(at + query.trim().length)}
    </>
  )
}

interface DestinationPickerProps {
  value: Destination
  onChange: (destination: Destination) => void
  onPickStay: (slug: string) => void
  /** Classes for the trigger button; its content is `children` */
  className?: string
  children: ReactNode
}

export function DestinationPicker({ value, onChange, onPickStay, className, children }: DestinationPickerProps) {
  const { data: index, isLoading } = useDestinationIndex()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  // A destination from the URL (/hotels?location=…) gets its region once the places load
  const valueName = value.name
  useEffect(() => {
    if (value.region || !index) return
    const place = index.places.find((p) => normalize(p.name) === normalize(valueName))
    if (place) onChange({ name: place.name, region: place.region })
  }, [index, valueName, value.region, onChange])

  const { groups, options } = useMemo(() => {
    // Only cities (a cached older response may still hold other kinds)
    const places = (index?.places ?? []).filter((p) => p.kind === 'city')
    const q = normalize(query)
    const groups: { label: string; options: Option[] }[] = []

    if (!q) {
      // Popular: the cities with the most stays (the API sorts them)
      groups.push({
        label: 'Popular destinations',
        options: places.slice(0, MAX_PLACES).map((p) => ({ key: `${p.kind}:${p.name}`, ...p })),
      })
    } else {
      // Names starting with the text first, then names containing it, then cities whose
      // district or state matches
      const rank = (name: string, region: string) => {
        const n = normalize(name)
        if (n.startsWith(q)) return 0
        if (n.includes(q)) return 1
        return normalize(region).includes(q) ? 2 : -1
      }
      const matchedPlaces = places
        .map((p) => ({ p, r: rank(p.name, p.region) }))
        .filter(({ r }) => r >= 0)
        .sort((a, b) => a.r - b.r || b.p.stays - a.p.stays)
        .slice(0, MAX_PLACES)
        .map(({ p }) => ({ key: `${p.kind}:${p.name}`, ...p }))
      const matchedStays = (index?.stays ?? [])
        .filter((s) => normalize(s.name).includes(q))
        .slice(0, MAX_STAYS)
        .map((s) => ({ key: `stay:${s.slug}`, kind: 'stay' as const, name: s.name, region: s.region, slug: s.slug }))

      if (matchedPlaces.length) groups.push({ label: 'Cities', options: matchedPlaces })
      if (matchedStays.length) groups.push({ label: 'Stays', options: matchedStays })
      groups.push({
        label: '',
        options: [{ key: 'text', kind: 'text', name: query.trim(), region: 'Search stays matching this' }],
      })
    }
    return { groups, options: groups.flatMap((g) => g.options) }
  }, [index, query])

  useEffect(() => setActive(0), [query, open])

  // Keep the highlighted option in view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (option: Option) => {
    setOpen(false)
    setQuery('')
    if (option.kind === 'stay' && option.slug) onPickStay(option.slug)
    else if (option.kind === 'text') onChange({ name: option.name, region: 'Matching stays' })
    else onChange({ name: option.name, region: option.region })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = options[active]
      if (option) choose(option)
    }
  }

  let indexCounter = 0
  const nothingFound = query.trim() !== '' && options.length === 1

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={className} aria-label={`Destination: ${value.name}. Change destination`}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search a city or stay"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={options[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        <div ref={listRef} id={listId} role="listbox" className="max-h-[22rem] overflow-y-auto p-1.5">
          {nothingFound && (
            <p className="px-2.5 pb-1 pt-2 text-xs text-muted-foreground">
              No stays listed in “{query.trim()}” yet. You can still search for it.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label || 'text'} role="group" aria-label={group.label || undefined}>
              {group.label && (
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.options.map((option) => {
                const i = indexCounter++
                const Icon = ICONS[option.kind] ?? MapPin
                const selected =
                  option.kind !== 'stay' && option.kind !== 'text' && normalize(option.name) === normalize(value.name)
                return (
                  <div
                    key={option.key}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2',
                      i === active ? 'bg-mint' : 'hover:bg-mint/60'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        selected ? 'bg-primary text-primary-foreground' : 'bg-card text-primary ring-1 ring-border'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {option.kind === 'text' ? (
                          <>Search “{option.name}”</>
                        ) : (
                          <Highlight text={option.name} query={query} />
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{option.region}</span>
                    </span>
                    {option.stays !== undefined && (
                      <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-secondary">
                        {option.stays} {option.stays === 1 ? 'stay' : 'stays'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {!isLoading && !query && options.length === 0 && (
            <p className="px-2.5 py-3 text-sm text-muted-foreground">Type a place to search stays.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
