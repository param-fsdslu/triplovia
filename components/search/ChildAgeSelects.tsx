'use client'

/**
 * One age (1–11) per child, MakeMyTrip-style: "Child 1" beside a compact "Select" / "3 yrs" field,
 * two to a row, in the guests pickers (search/HotelSearchBox, hotel/StayGuestsPicker) as soon as
 * children are added; the review page only shows them. Ages 6–11 pay the room's child price, 1–5
 * stay free (calculateGuestCharges in lib/utils.ts). Lists open below their field (popper).
 */
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CHILD_MAX_AGE, cn } from '@/lib/utils'

const AGES = Array.from({ length: CHILD_MAX_AGE }, (_, i) => i + 1)
const yrs = (age: number) => `${age} ${age === 1 ? 'yr' : 'yrs'}`

interface ChildAgeSelectsProps {
  /** One per child; null until picked */
  ages: Array<number | null>
  onChange: (index: number, age: number) => void
  /** Turn the unpicked ones red */
  showMissing?: boolean
  disabled?: boolean
  /** Field ids: `${idPrefix}-0`, `${idPrefix}-1`… (unique per page) */
  idPrefix?: string
  className?: string
}

export function ChildAgeSelects({
  ages,
  onChange,
  showMissing,
  disabled,
  idPrefix = 'child-age',
  className,
}: ChildAgeSelectsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-6 gap-y-2.5', className)}>
      {ages.map((age, index) => {
        const missing = showMissing && age == null
        return (
          <div key={index} className="flex min-w-0 items-center justify-between gap-2">
            <Label
              htmlFor={`${idPrefix}-${index}`}
              className={cn('shrink-0 text-[13px] font-semibold', missing ? 'text-destructive' : 'text-foreground')}
            >
              Child {index + 1}
            </Label>
            <Select
              value={age == null ? '' : String(age)}
              onValueChange={(value) => onChange(index, Number(value))}
              disabled={disabled}
            >
              <SelectTrigger
                id={`${idPrefix}-${index}`}
                size="sm"
                aria-invalid={missing || undefined}
                className={cn(
                  'w-[6.5rem] shrink-0 bg-card font-semibold data-[placeholder]:font-normal',
                  missing && 'border-destructive ring-2 ring-destructive/20'
                )}
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-64 min-w-[6.5rem]">
                {AGES.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {yrs(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </div>
  )
}
