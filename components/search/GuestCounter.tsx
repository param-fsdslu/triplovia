'use client'

/** One −/+ row of a guests picker (search/HotelSearchBox, hotel/StayGuestsPicker); typing a number works too */
import { useEffect, useState, type ComponentType } from 'react'
import { Minus, Plus } from '@/components/icons'

export function GuestCounter({
  icon: Icon,
  label,
  hint,
  value,
  setValue,
  min,
  max,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  hint: string
  value: number
  setValue: (v: number) => void
  min: number
  max: number
}) {
  const id = `guests-${label.toLowerCase()}`
  // Raw text while typing; the store only gets values within min..max, the rest snaps back on blur
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const commit = () => {
    const n = Number(text)
    const next = text === '' || Number.isNaN(n) ? value : Math.min(max, Math.max(min, n))
    setValue(next)
    setText(String(next))
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span>
          <span className="block text-[13px] font-semibold text-foreground">{label}</span>
          <span className="block text-[11px] text-muted-foreground">{hint}</span>
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={() => setValue(Math.max(min, value - 1))}
          disabled={value <= min}
          className={stepButtonClass}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
            setText(raw)
            const n = Number(raw)
            if (raw !== '' && n >= min && n <= max) setValue(n)
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
          className="h-9 w-12 rounded-lg border border-input bg-card text-center text-sm font-semibold tabular-nums text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color] [appearance:textfield] hover:border-primary/50 focus:border-primary focus:ring-[3px] focus:ring-primary/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => setValue(Math.min(max, value + 1))}
          disabled={value >= max}
          className={stepButtonClass}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

const stepButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:border-border disabled:text-muted-foreground/50'

