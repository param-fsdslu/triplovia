/**
 * Invoice numbers for bookings: one consecutive series per Indian financial year
 * ("TRV/26-27/00001"), kept in a counter document (_counters/invoice_<FY>).
 *
 * assignInvoiceNumber reads the booking and the counter and writes both in one transaction, plus
 * two create-only guard documents: _invoice_numbers/<number> (a number is issued once) and
 * _invoices/<booking id> (a booking is numbered once). If another transaction got there first,
 * the create fails at commit, nothing is written, and it retries on fresh data. So two payments
 * confirming at once can't share a number, verify + webhook can't number one booking twice, and
 * no number is skipped. Called when a payment is confirmed (api/payment/verify, the Razorpay
 * webhook) and, for bookings paid before numbering existed, on first download.
 */
import { isAlreadyExists, type DocStore } from './store'

export const INVOICE_COUNTER_COLLECTION = '_counters'
const ISSUED_NUMBERS_COLLECTION = '_invoice_numbers'
const NUMBERED_BOOKINGS_COLLECTION = '_invoices'
const MAX_ATTEMPTS = 5

/** Calendar date in India (UTC+5:30), 'YYYY-MM-DD' */
export function indiaDate(now: Date): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10)
}

/** Indian financial year (April–March) of a 'YYYY-MM-DD' date: '2026-10-21' → '26-27' */
export function financialYear(date: string): string {
  const [year, month] = date.split('-').map(Number)
  const start = month >= 4 ? year : year - 1
  const yy = (n: number) => String(n % 100).padStart(2, '0')
  return `${yy(start)}-${yy(start + 1)}`
}

export function formatInvoiceNumber(prefix: string, fy: string, serial: number, digits: number): string {
  return `${prefix}/${fy}/${String(serial).padStart(digits, '0')}`
}

export interface InvoiceNumbering {
  prefix: string
  digits: number
}

export interface AssignedInvoice {
  invoiceNumber: string
  invoiceDate: string
  /** False when the booking already had a number */
  created: boolean
}

/** Gives a booking its invoice number (or returns the one it has). Null when the booking doesn't exist. */
export async function assignInvoiceNumber(
  store: DocStore,
  bookingId: string,
  numbering: InvoiceNumbering,
  now: Date = new Date()
): Promise<AssignedInvoice | null> {
  const invoiceDate = indiaDate(now)
  const fy = financialYear(invoiceDate)
  const bookingPath = `bookings/${bookingId}`
  const counterPath = `${INVOICE_COUNTER_COLLECTION}/invoice_${fy}`

  for (let attempt = 1; ; attempt++) {
    try {
      return await store.transaction(async (tx) => {
        // Firestore: every read before the first write
        const docs = await tx.getByPaths([bookingPath, counterPath])
        const booking = docs.find((d) => d.path === bookingPath)
        if (!booking) return null
        if (typeof booking.data.invoice_number === 'string' && booking.data.invoice_number) {
          return { invoiceNumber: booking.data.invoice_number, invoiceDate: String(booking.data.invoice_date ?? ''), created: false }
        }

        const counter = docs.find((d) => d.path === counterPath)
        const serial = Number(counter?.data.next) > 0 ? Number(counter!.data.next) : 1
        const invoiceNumber = formatInvoiceNumber(numbering.prefix, fy, serial, numbering.digits)
        const issuedAt = now.toISOString()

        tx.create(`${ISSUED_NUMBERS_COLLECTION}/${invoiceNumber.replace(/\//g, '-')}`, {
          invoice_number: invoiceNumber,
          booking_id: bookingId,
          created_at: issuedAt,
        })
        tx.create(`${NUMBERED_BOOKINGS_COLLECTION}/${bookingId}`, { invoice_number: invoiceNumber, created_at: issuedAt })
        tx.set(counterPath, { fy, next: serial + 1, updated_at: issuedAt })
        tx.set(bookingPath, { ...booking.data, invoice_number: invoiceNumber, invoice_date: invoiceDate })
        return { invoiceNumber, invoiceDate, created: true }
      })
    } catch (error) {
      // Lost a race for the number or the booking: try again on fresh data
      if (!isAlreadyExists(error) || attempt >= MAX_ATTEMPTS) throw error
    }
  }
}
