/**
 * Booking invoices — which bookings get one, the download link, and the invoice lines rebuilt from
 * the amounts the booking stored (lib/utils.ts calculateBookingTax: room GST by price slab, 5% GST
 * on meals, 6% service charge with 18% GST on it, extra bed untaxed). Safe for client components.
 */
import { INVOICE_SAC } from '@/lib/config/invoice'

/** Statuses of a booking that is booked and paid for (not cancelled or refunded) */
const INVOICED_BOOKING_STATUSES = ['confirmed', 'checked_in', 'checked_out', 'completed']

export function isInvoiceable(booking: { booking_status?: string | null; payment_status?: string | null }): boolean {
  return booking.payment_status === 'paid' && INVOICED_BOOKING_STATUSES.includes(booking.booking_status ?? '')
}

/** The PDF download (app/api/bookings/[reference]/invoice) */
export function invoiceUrl(bookingReference: string): string {
  return `/api/bookings/${encodeURIComponent(bookingReference)}/invoice`
}

export function invoiceFileName(invoiceNumber: string): string {
  return `Invoice-${invoiceNumber.replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`
}

const round2 = (n: number) => Math.round(n * 100) / 100
const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0)
/** Room GST slabs used by getRoomGstRate */
const ROOM_GST_SLABS = [0, 0.05, 0.18]

export interface InvoiceBookingAmounts {
  subtotal?: number | string | null
  price_per_night?: number | string | null
  num_nights?: number | null
  num_rooms?: number | null
  tax_amount?: number | string | null
  service_fee?: number | string | null
  meal_plan_total?: number | string | null
  extra_bed_charge?: number | string | null
  total_amount?: number | string | null
}

export interface InvoiceLine {
  description: string
  sac: string
  amount: number
}

export interface InvoiceBreakdown {
  lines: InvoiceLine[]
  taxableValue: number
  taxes: Array<{ label: string; amount: number }>
  roundOff: number
  total: number
}

/**
 * Invoice lines and GST for one booking. `intraState` (property in the issuer's state) splits each
 * GST into CGST + SGST halves; otherwise it's IGST.
 */
export function invoiceBreakdown(
  booking: InvoiceBookingAmounts,
  details: { roomName: string; mealNames?: string[]; intraState: boolean }
): InvoiceBreakdown {
  const nights = num(booking.num_nights)
  const rooms = num(booking.num_rooms) || 1
  const roomSubtotal = round2(num(booking.subtotal) || num(booking.price_per_night) * nights * rooms)
  const meals = round2(num(booking.meal_plan_total))
  const extraBed = round2(num(booking.extra_bed_charge))

  // service_fee = service charge + 18% GST on it; tax_amount = room GST + 5% meal GST
  const serviceFee = num(booking.service_fee)
  const serviceCharge = round2(serviceFee / 1.18)
  const serviceGst = round2(serviceFee - serviceCharge)
  const taxAmount = num(booking.tax_amount)
  const mealGst = round2(Math.min(meals * 0.05, taxAmount))
  const roomGst = round2(taxAmount - mealGst)
  const roomRate =
    roomSubtotal > 0
      ? ROOM_GST_SLABS.reduce((best, slab) =>
          Math.abs(slab - roomGst / roomSubtotal) < Math.abs(best - roomGst / roomSubtotal) ? slab : best
        )
      : 0

  const lines: InvoiceLine[] = [
    {
      description: `Accommodation: ${details.roomName}, ${rooms} ${rooms === 1 ? 'room' : 'rooms'} × ${nights} ${nights === 1 ? 'night' : 'nights'}`,
      sac: INVOICE_SAC.accommodation,
      amount: roomSubtotal,
    },
  ]
  if (meals > 0) {
    const names = details.mealNames?.filter(Boolean).join(', ')
    lines.push({ description: names ? `Meals: ${names}` : 'Meals', sac: INVOICE_SAC.meals, amount: meals })
  }
  if (extraBed > 0) lines.push({ description: 'Extra bed / extra guest charge', sac: INVOICE_SAC.accommodation, amount: extraBed })
  if (serviceCharge > 0) lines.push({ description: 'Service charge', sac: INVOICE_SAC.serviceCharge, amount: serviceCharge })

  const taxes: InvoiceBreakdown['taxes'] = []
  const addTax = (rate: number, amount: number, on: string) => {
    if (amount <= 0) return
    const pct = (r: number) => `${Number((r * 100).toFixed(2))}%`
    if (details.intraState) {
      const cgst = round2(amount / 2)
      taxes.push({ label: `CGST @ ${pct(rate / 2)} on ${on}`, amount: cgst })
      taxes.push({ label: `SGST @ ${pct(rate / 2)} on ${on}`, amount: round2(amount - cgst) })
    } else {
      taxes.push({ label: `IGST @ ${pct(rate)} on ${on}`, amount })
    }
  }
  addTax(roomRate, roomGst, 'accommodation')
  addTax(0.05, mealGst, 'meals')
  addTax(0.18, serviceGst, 'service charge')

  const taxableValue = round2(lines.reduce((sum, l) => sum + l.amount, 0))
  const computed = round2(taxableValue + taxes.reduce((sum, t) => sum + t.amount, 0))
  const total = round2(num(booking.total_amount) || computed)
  return { lines, taxableValue, taxes, roundOff: round2(total - computed), total }
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowHundred(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ')
}

/** Indian numbering (lakh, crore): 784612 → "Seven Lakh Eighty-Four Thousand Six Hundred Twelve" */
export function numberToIndianWords(value: number): string {
  let n = Math.floor(Math.abs(value))
  if (n === 0) return 'Zero'
  const parts: string[] = []
  const crore = Math.floor(n / 10_000_000)
  n %= 10_000_000
  const lakh = Math.floor(n / 100_000)
  n %= 100_000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`)
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`)
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`)
  if (n) parts.push(belowThousand(n))
  return parts.join(' ')
}

/** 7846.5 → "Rupees Seven Thousand Eight Hundred Forty-Six and Fifty Paise Only" */
export function rupeesInWords(amount: number): string {
  const rupees = Math.floor(round2(amount))
  const paise = Math.round((round2(amount) - rupees) * 100)
  return `Rupees ${numberToIndianWords(rupees)}${paise ? ` and ${belowHundred(paise)} Paise` : ''} Only`
}
