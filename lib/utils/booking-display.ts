import { format, isValid } from 'date-fns'

/** Historical booking rows may have missing or malformed dates; keep them viewable/exportable. */
export function formatBookingDate(value: string | null | undefined, pattern = 'MMM dd, yyyy'): string {
  if (!value) return '—'
  const date = new Date(value)
  return isValid(date) ? format(date, pattern) : '—'
}
