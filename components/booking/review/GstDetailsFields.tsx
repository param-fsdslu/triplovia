'use client'

/**
 * GstDetailsFields — optional GST details on the booking review page (inside Guest details), so the
 * property can bill the guest's company and they can claim input tax credit. Ticking the box shows
 * GSTIN, registered company name and address; the form sends them only while it's ticked.
 * Validation matches the server (parseGstDetails in lib/utils.ts).
 */
import { Building2 } from '@/components/icons'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  GST_COMPANY_ADDRESS_MAX,
  GST_COMPANY_NAME_MAX,
  isValidGstin,
  normalizeGstin,
  type GstDetailsInput,
} from '@/lib/utils'

export const EMPTY_GST_DETAILS: GstDetailsInput = { gstNumber: '', companyName: '', companyAddress: '' }

/** What the form sends: the details when the box is ticked, otherwise nothing */
export function gstDetailsForRequest(enabled: boolean, details: GstDetailsInput): GstDetailsInput | undefined {
  if (!enabled) return undefined
  return {
    gstNumber: normalizeGstin(details.gstNumber),
    companyName: details.companyName.trim(),
    companyAddress: details.companyAddress.trim(),
  }
}

/** Checked before submitting; null when fine (or when the box isn't ticked) */
export function gstDetailsError(enabled: boolean, details: GstDetailsInput): string | null {
  if (!enabled) return null
  if (!isValidGstin(details.gstNumber)) return 'Please enter a valid 15-character GSTIN, or untick "Enter GST details"'
  if (!details.companyName.trim()) return 'Please enter the registered company name for your GST invoice'
  if (!details.companyAddress.trim()) return 'Please enter the registered company address for your GST invoice'
  return null
}

interface GstDetailsFieldsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  value: GstDetailsInput
  onChange: (value: GstDetailsInput) => void
  /** Locked once the booking is created */
  disabled?: boolean
}

export function GstDetailsFields({ enabled, onEnabledChange, value, onChange, disabled }: GstDetailsFieldsProps) {
  const gstin = normalizeGstin(value.gstNumber)
  const gstinInvalid = gstin.length === 15 && !isValidGstin(gstin)

  return (
    <div className="rounded-lg border border-border">
      <label htmlFor="gst-enabled" className="flex cursor-pointer items-start gap-3 p-3.5">
        <Checkbox
          id="gst-enabled"
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(!!checked)}
          disabled={disabled}
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            Enter GST details <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Get a GST invoice in your company&apos;s name and claim input tax credit.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="space-y-4 border-t border-border p-3.5">
          <div className="space-y-2">
            <Label htmlFor="gst-number">GSTIN *</Label>
            <Input
              id="gst-number"
              value={value.gstNumber}
              onChange={(e) => onChange({ ...value, gstNumber: e.target.value.toUpperCase() })}
              placeholder="29ABCDE1234F1Z5"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={disabled}
              aria-invalid={gstinInvalid || undefined}
              aria-describedby="gst-number-hint"
              className="font-mono uppercase tracking-wide"
              required
            />
            <p id="gst-number-hint" className={gstinInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
              {gstinInvalid ? "This GSTIN doesn't look right. Please check it." : '15 characters, e.g. 29ABCDE1234F1Z5'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gst-company-name">Registered company name *</Label>
            <Input
              id="gst-company-name"
              value={value.companyName}
              onChange={(e) => onChange({ ...value, companyName: e.target.value })}
              placeholder="As on the GST certificate"
              maxLength={GST_COMPANY_NAME_MAX}
              autoComplete="organization"
              disabled={disabled}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gst-company-address">Registered company address *</Label>
            <Textarea
              id="gst-company-address"
              value={value.companyAddress}
              onChange={(e) => onChange({ ...value, companyAddress: e.target.value })}
              placeholder="Address as on the GST certificate"
              maxLength={GST_COMPANY_ADDRESS_MAX}
              rows={2}
              autoComplete="street-address"
              disabled={disabled}
              required
            />
          </div>
        </div>
      )}
    </div>
  )
}
