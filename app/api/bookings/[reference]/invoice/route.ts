import { NextRequest, NextResponse } from 'next/server'
import { findInvoiceBooking, issueInvoiceNumber } from '@/lib/services/invoice.service'
import { renderInvoicePdf } from '@/lib/services/invoice-pdf'
import { invoiceFileName, isInvoiceable } from '@/lib/utils/invoice'
import { withApiLogging } from '@/lib/utils/with-api-logging'

/**
 * GET /api/bookings/[reference]/invoice — the booking's tax invoice as a PDF download.
 * For the booking's owner, admins of its hotel (row policies), or the browser that made a guest
 * checkout; only once it's paid and not cancelled. Bookings paid before invoice numbering get
 * their number here, on first download.
 */
const handler = async (_request: NextRequest, { params }: { params: Promise<{ reference: string }> }) => {
  const { reference } = await params
  const booking = await findInvoiceBooking(reference)
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (!isInvoiceable(booking)) {
    return NextResponse.json({ error: 'The invoice is available once the booking is paid' }, { status: 409 })
  }

  let invoiceNumber: string | null = booking.invoice_number ?? null
  let invoiceDate: string | null = booking.invoice_date ?? null
  if (!invoiceNumber) {
    const assigned = await issueInvoiceNumber(booking.id)
    if (!assigned) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    invoiceNumber = assigned.invoiceNumber
    invoiceDate = assigned.invoiceDate
  }

  const pdf = await renderInvoicePdf({ booking, invoiceNumber, invoiceDate: invoiceDate ?? '' })
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoiceFileName(invoiceNumber)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

export const GET = withApiLogging(handler, 'bookings/invoice')
