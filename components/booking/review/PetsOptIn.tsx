'use client'

/**
 * PetsOptIn — "Travelling with pets" on the review page. Starts from the search box's Rooms &
 * Guests checkbox (`pets=1` in the URL); the booking stores it as `with_pets` so the property
 * knows ahead. When ticked, the property's own pet policy (hotels.pet_policy_text) is shown.
 */
import { PawPrint } from '@/components/icons'
import { Checkbox } from '@/components/ui/checkbox'

interface PetsOptInProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** The property's pet policy, if it has one */
  policy?: string | null
  disabled?: boolean
}

export function PetsOptIn({ checked, onCheckedChange, policy, disabled }: PetsOptInProps) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <label htmlFor="with-pets" className="flex cursor-pointer items-start gap-2.5 text-sm">
        <Checkbox
          id="with-pets"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(!!value)}
          disabled={disabled}
          className="mt-0.5"
        />
        <span className="text-foreground/85">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <PawPrint className="h-3.5 w-3.5 text-primary" />
            Travelling with pets
          </span>
          <span className="block text-xs text-muted-foreground">
            We&apos;ll let the property know. Pet rules (size, number, extra fees) vary by stay.
          </span>
        </span>
      </label>
      {checked && policy && (
        <p className="mt-2 rounded-md bg-mint/60 px-2.5 py-2 text-xs text-foreground/85">
          <span className="font-semibold text-secondary">Pet policy: </span>
          {policy}
        </p>
      )}
    </div>
  )
}
