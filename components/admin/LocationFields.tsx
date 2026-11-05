'use client'

/**
 * State → District → City dropdowns for the hotel form (India; lib/utils/india-locations.ts).
 * City lists the district's sub-districts (taluks) plus "Other" to type a place that isn't one,
 * e.g. Gokarna. Values not in the lists (older hotels) are kept and shown; for a country other
 * than India the three fields are plain text.
 */
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  districtOfCity,
  findDistrict,
  findState,
  isIndia,
  loadIndiaLocations,
  type IndiaState,
} from '@/lib/utils/india-locations'

const OTHER_CITY = '__other__'

type LocationField = 'state' | 'district' | 'city'

interface LocationFieldsProps {
  country: string
  state: string
  district: string
  city: string
  onChange: (field: LocationField, value: string) => void
}

export function LocationFields({ country, state, district, city, onChange }: LocationFieldsProps) {
  const india = isIndia(country)
  const [states, setStates] = useState<IndiaState[] | null>(null)
  const [typingCity, setTypingCity] = useState(false)

  useEffect(() => {
    if (india) loadIndiaLocations().then(setStates)
  }, [india])

  const stateEntry = states ? findState(states, state) : undefined
  const districtEntry = findDistrict(stateEntry, district)
  const cities = districtEntry?.[1] ?? []
  const listedCity = cities.find((c) => c.toLowerCase() === city.trim().toLowerCase())
  const showCityInput = typingCity || (city.trim() !== '' && !listedCity)

  // Older hotels have a city but no district: fill it in when the city names one district
  useEffect(() => {
    if (district || !stateEntry) return
    const found = districtOfCity(stateEntry, city.trim())
    if (found) onChange('district', found)
  }, [district, stateEntry, city, onChange])

  if (!india) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {(['state', 'district', 'city'] as const).map((field) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={field}>
              {field === 'state' ? 'State / Region *' : field === 'district' ? 'District' : 'City *'}
            </Label>
            <Input
              id={field}
              value={field === 'state' ? state : field === 'district' ? district : city}
              onChange={(e) => onChange(field, e.target.value)}
              required={field !== 'district'}
            />
          </div>
        ))}
      </div>
    )
  }

  const loading = states === null

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="state">State *</Label>
        <Select
          value={stateEntry?.name ?? state}
          onValueChange={(value) => {
            onChange('state', value)
            onChange('district', '')
            onChange('city', '')
            setTypingCity(false)
          }}
          disabled={loading}
          required
        >
          <SelectTrigger id="state" className="w-full">
            <SelectValue placeholder={loading ? 'Loading…' : 'Select state'} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {state && !stateEntry && <SelectItem value={state}>{state}</SelectItem>}
            {states?.map((s) => (
              <SelectItem key={s.name} value={s.name}>
                {s.name}
                {s.ut ? ' (UT)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="district">District *</Label>
        <Select
          value={districtEntry?.[0] ?? district}
          onValueChange={(value) => {
            onChange('district', value)
            onChange('city', '')
            setTypingCity(false)
          }}
          disabled={!stateEntry}
          required
        >
          <SelectTrigger id="district" className="w-full">
            <SelectValue placeholder={stateEntry ? 'Select district' : 'Select a state first'} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {district && !districtEntry && <SelectItem value={district}>{district}</SelectItem>}
            {stateEntry?.districts.map(([name]) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City / Town *</Label>
        {showCityInput ? (
          <>
            <Input
              id="city"
              value={city}
              onChange={(e) => onChange('city', e.target.value)}
              placeholder="Type the town or place, e.g. Gokarna"
              autoFocus={typingCity}
              required
            />
            {cities.length > 0 && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  setTypingCity(false)
                  onChange('city', '')
                }}
              >
                Choose from the {districtEntry?.[0]} list instead
              </Button>
            )}
          </>
        ) : (
          <Select
            value={listedCity ?? ''}
            onValueChange={(value) => {
              if (value === OTHER_CITY) {
                setTypingCity(true)
                onChange('city', '')
              } else {
                onChange('city', value)
              }
            }}
            disabled={!districtEntry}
            required
          >
            <SelectTrigger id="city" className="w-full">
              <SelectValue placeholder={districtEntry ? 'Select city / town' : 'Select a district first'} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {cities.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_CITY}>Other (type the place)</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
