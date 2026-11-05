'use client'

import { useEffect, useRef, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, toE164 } from '@/lib/utils/phone'
import { CountryFlag } from './CountryFlag'

/** Splits "+919876543210" back into its country code and national number */
function splitPhone(e164?: string) {
  const match = e164
    ? [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length).find((c) => e164.startsWith(c.code))
    : undefined
  return match
    ? { countryCode: match.code as string, number: e164!.slice(match.code.length) }
    : { countryCode: DEFAULT_COUNTRY_CODE as string, number: '' }
}

interface PhoneNumberInputProps {
  id: string
  /** When set, a hidden input with this name carries the E.164 value in form posts */
  name?: string
  defaultValue?: string
  /** Called with the E.164 number, or null while the input isn't a valid mobile number */
  onValueChange?: (e164: string | null) => void
  required?: boolean
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Mobile number field: flag + country code picker and the number in one box.
 * Invalid numbers fail native form validation.
 */
export function PhoneNumberInput({
  id,
  name,
  defaultValue,
  onValueChange,
  required,
  autoFocus,
  disabled,
  className,
}: PhoneNumberInputProps) {
  const [initial] = useState(() => splitPhone(defaultValue))
  const [countryCode, setCountryCode] = useState(initial.countryCode)
  const [number, setNumber] = useState(initial.number)
  const inputRef = useRef<HTMLInputElement>(null)
  const e164 = toE164(countryCode, number)
  const country = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0]

  useEffect(() => {
    inputRef.current?.setCustomValidity(number && !e164 ? 'Please enter a valid mobile number' : '')
    onValueChange?.(e164)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e164, number])

  return (
    <div
      className={cn(
        'flex h-12 items-center rounded-full border border-input bg-card shadow-xs transition-[color,box-shadow,border-color]',
        'hover:border-primary/50 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15',
        disabled && 'pointer-events-none opacity-60',
        className
      )}
    >
      <Select value={countryCode} onValueChange={setCountryCode} disabled={disabled}>
        <SelectTrigger
          aria-label={`Country code, ${country.label}`}
          className="h-full shrink-0 gap-1.5 rounded-l-full rounded-r-none pl-4 border-0 bg-transparent pl-3 pr-2 font-semibold tabular-nums text-foreground shadow-none focus-visible:ring-0 [&>svg]:text-primary! [&>svg]:opacity-100!"
        >
          <SelectValue>
            <CountryFlag iso={country.iso} />
            {countryCode}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <CountryFlag iso={c.iso} />
              <span className="flex-1">{c.label}</span>
              <span className="tabular-nums text-muted-foreground">{c.code}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        ref={inputRef}
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="Enter mobile number"
        value={number}
        onChange={(e) => setNumber(e.target.value.replace(/[^\d\s-]/g, '').slice(0, 16))}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        className="h-full w-0 min-w-0 flex-1 rounded-r-full bg-transparent pl-1 pr-4 text-base tracking-wide outline-none placeholder:tracking-normal placeholder:text-muted-foreground"
      />
      {name && <input type="hidden" name={name} value={e164 ?? ''} />}
    </div>
  )
}
