/**
 * Draws a booking's tax invoice as an A4 PDF with pdf-lib (pure JS, so it runs in serverless
 * functions). Issuer details come from lib/config/invoice.ts; lines and GST from invoiceBreakdown.
 *
 * pdf-lib's built-in Helvetica only covers Latin text (WinAnsi), so amounts are labelled INR rather
 * than ₹, and characters it can't draw (e.g. a name in Kannada) are replaced instead of failing.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { format } from 'date-fns'
import { INVOICE_ISSUER } from '@/lib/config/invoice'
import { invoiceBreakdown, rupeesInWords } from '@/lib/utils/invoice'
import { formatPhone } from '@/lib/utils/phone'

const PAGE = { width: 595.28, height: 841.89 }
const MARGIN = 40
const CONTENT_WIDTH = PAGE.width - MARGIN * 2
const COLORS = {
  primary: rgb(16 / 255, 127 / 255, 120 / 255),
  text: rgb(36 / 255, 58 / 255, 56 / 255),
  muted: rgb(100 / 255, 120 / 255, 116 / 255),
  border: rgb(226 / 255, 233 / 255, 229 / 255),
  mint: rgb(232 / 255, 243 / 255, 239 / 255),
  white: rgb(1, 1, 1),
}

export interface InvoicePdfInput {
  /** A bookings row with hotel, room_type and booking_meal_plans (see findInvoiceBooking) */
  booking: any
  invoiceNumber: string
  /** 'YYYY-MM-DD' */
  invoiceDate: string
}

const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 'YYYY-MM-DD' → '21 Oct 2026' (read as a calendar date, not shifted by time zone) */
function day(value: unknown) {
  const [y, m, d] = String(value ?? '').slice(0, 10).split('-').map(Number)
  return y && m && d ? format(new Date(y, m - 1, d), 'EEE, d MMM yyyy') : '-'
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export async function renderInvoicePdf({ booking, invoiceNumber, invoiceDate }: InvoicePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Invoice ${invoiceNumber}`)
  pdf.setAuthor(INVOICE_ISSUER.name)
  pdf.setSubject(`Tax invoice for booking ${booking.booking_reference}`)
  pdf.setCreator(INVOICE_ISSUER.name)

  const page = pdf.addPage([PAGE.width, PAGE.height])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const drawable = new Set(regular.getCharacterSet())
  const clean = (value: unknown) =>
    Array.from(String(value ?? ''))
      .map((ch) => (ch === '₹' ? 'INR ' : drawable.has(ch.codePointAt(0)!) ? ch : '?'))
      .join('')

  type TextStyle = { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; align?: 'left' | 'right' | 'center' }
  const write = (value: unknown, x: number, y: number, { font = regular, size = 9, color = COLORS.text, align = 'left' }: TextStyle = {}) => {
    const text = clean(value)
    const width = font.widthOfTextAtSize(text, size)
    page.drawText(text, { x: align === 'right' ? x - width : align === 'center' ? x - width / 2 : x, y, size, font, color })
    return width
  }

  /** Word-wraps (and hard-breaks very long words) to fit maxWidth */
  const wrap = (value: unknown, font: PDFFont, size: number, maxWidth: number): string[] => {
    const lines: string[] = []
    for (const paragraph of String(value ?? '').split(/\r?\n/)) {
      let line = ''
      for (let word of clean(paragraph).split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          line = candidate
          continue
        }
        if (line) lines.push(line)
        while (font.widthOfTextAtSize(word, size) > maxWidth) {
          let cut = word.length - 1
          while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--
          lines.push(word.slice(0, cut))
          word = word.slice(cut)
        }
        line = word
      }
      if (line) lines.push(line)
    }
    return lines
  }

  const rule = (y: number, color = COLORS.border) =>
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.width - MARGIN, y }, thickness: 0.75, color })

  const hotel = booking.hotel ?? {}
  const hotelState = String(hotel.state ?? '').trim()
  const intraState = !hotelState || hotelState.toLowerCase() === INVOICE_ISSUER.state.toLowerCase()
  const breakdown = invoiceBreakdown(booking, {
    roomName: booking.room_type?.name ?? 'Room',
    mealNames: (booking.booking_meal_plans ?? []).map((mp: any) => mp.name),
    intraState,
  })

  // ── Header: issuer (left), invoice title and numbers (right) ──────────────────
  const top = PAGE.height - MARGIN
  write(INVOICE_ISSUER.name, MARGIN, top - 18, { font: bold, size: 20, color: COLORS.primary })
  let leftY = top - 34
  for (const line of INVOICE_ISSUER.addressLines) {
    write(line, MARGIN, leftY, { size: 8.5, color: COLORS.muted })
    leftY -= 11
  }
  write(`GSTIN: ${INVOICE_ISSUER.gstin}`, MARGIN, leftY, { font: bold, size: 8.5 })
  leftY -= 11
  write(`${INVOICE_ISSUER.email} · ${INVOICE_ISSUER.phone}`, MARGIN, leftY, { size: 8.5, color: COLORS.muted })

  const right = PAGE.width - MARGIN
  write('TAX INVOICE', right, top - 16, { font: bold, size: 16, align: 'right' })
  let rightY = top - 34
  for (const [label, value] of [
    ['Invoice No.', invoiceNumber],
    ['Invoice Date', day(invoiceDate)],
    ['Booking Ref.', booking.booking_reference],
  ]) {
    const valueWidth = write(value, right, rightY, { font: bold, size: 9, align: 'right' })
    write(`${label}:`, right - valueWidth - 5, rightY, { size: 9, color: COLORS.muted, align: 'right' })
    rightY -= 13
  }

  let y = Math.min(leftY, rightY) - 10
  rule(y)

  // ── Billed to (left) and stay details (right) ─────────────────────────────────
  type Line = { text: string; font?: PDFFont; color?: ReturnType<typeof rgb> }
  const columnWidth = (CONTENT_WIDTH - 24) / 2
  const guestName = [booking.guest_first_name, booking.guest_last_name].filter(Boolean).join(' ') || 'Guest'

  const billedTo: Line[] = []
  if (booking.gst_number) {
    billedTo.push(...wrap(booking.gst_company_name, bold, 9.5, columnWidth).map((text) => ({ text, font: bold })))
    billedTo.push({ text: `GSTIN: ${booking.gst_number}` })
    billedTo.push(...wrap(booking.gst_company_address, regular, 9, columnWidth).map((text) => ({ text, color: COLORS.muted })))
    billedTo.push({ text: `Guest: ${guestName}` })
  } else {
    billedTo.push({ text: guestName, font: bold })
  }
  if (booking.guest_phone) billedTo.push({ text: `Mobile: ${formatPhone(booking.guest_phone)}` })
  if (booking.guest_email) billedTo.push({ text: `Email: ${booking.guest_email}` })

  const adults = Number(booking.num_adults) || 0
  const children = Number(booking.num_children) || 0
  const nights = Number(booking.num_nights) || 0
  const stay: Line[] = [
    ...wrap(hotel.name ?? 'Hotel', bold, 9.5, columnWidth).map((text) => ({ text, font: bold })),
    ...wrap(
      [hotel.address_line_1, hotel.address_line_2, [hotel.city, hotel.state].filter(Boolean).join(', '), hotel.postal_code]
        .filter(Boolean)
        .join(', '),
      regular,
      9,
      columnWidth
    ).map((text) => ({ text, color: COLORS.muted })),
    { text: `Check-in: ${day(booking.check_in_date)}` },
    { text: `Check-out: ${day(booking.check_out_date)} (${plural(nights, 'night', 'nights')})` },
    {
      text: `Guests: ${[plural(adults, 'adult', 'adults'), children ? plural(children, 'child', 'children') : ''].filter(Boolean).join(', ')} · ${plural(Number(booking.num_rooms) || 1, 'room', 'rooms')}`,
    },
    { text: `Place of supply: ${hotelState || INVOICE_ISSUER.state}${intraState ? ` (${INVOICE_ISSUER.stateCode})` : ''}` },
  ]

  const drawColumn = (title: string, lines: Line[], x: number, startY: number) => {
    write(title, x, startY, { font: bold, size: 8, color: COLORS.primary })
    let lineY = startY - 14
    for (const line of lines) {
      write(line.text, x, lineY, { font: line.font ?? regular, size: line.font === bold ? 9.5 : 9, color: line.color ?? COLORS.text })
      lineY -= 12
    }
    return lineY
  }
  y -= 18
  y = Math.min(drawColumn('BILLED TO', billedTo, MARGIN, y), drawColumn('STAY DETAILS', stay, MARGIN + columnWidth + 24, y)) - 8

  // ── Charges table ─────────────────────────────────────────────────────────────
  const cols = { num: MARGIN + 8, desc: MARGIN + 30, sac: MARGIN + 360, amount: right - 8 }
  const descWidth = cols.sac - cols.desc - 12
  page.drawRectangle({ x: MARGIN, y: y - 20, width: CONTENT_WIDTH, height: 20, color: COLORS.mint })
  for (const [label, x, align] of [
    ['#', cols.num, 'left'],
    ['Description', cols.desc, 'left'],
    ['SAC', cols.sac, 'left'],
    ['Amount (INR)', cols.amount, 'right'],
  ] as const) {
    write(label, x, y - 13.5, { font: bold, size: 8.5, align })
  }
  y -= 20

  breakdown.lines.forEach((line, i) => {
    const descLines = wrap(line.description, regular, 9, descWidth)
    const rowTop = y
    write(String(i + 1), cols.num, rowTop - 14, { color: COLORS.muted })
    descLines.forEach((text, j) => write(text, cols.desc, rowTop - 14 - j * 11))
    write(line.sac || '-', cols.sac, rowTop - 14, { color: COLORS.muted })
    write(money(line.amount), cols.amount, rowTop - 14, { align: 'right' })
    y = rowTop - 14 - (descLines.length - 1) * 11 - 8
    rule(y)
  })

  // ── Totals ────────────────────────────────────────────────────────────────────
  const labelX = right - 120
  const summary: Array<[string, number, PDFFont?]> = [
    ['Taxable value', breakdown.taxableValue, bold],
    ...breakdown.taxes.map((t): [string, number] => [t.label, t.amount]),
    ...(breakdown.roundOff ? [['Round off', breakdown.roundOff] as [string, number]] : []),
  ]
  y -= 16
  for (const [label, amount, font] of summary) {
    write(label, labelX, y, { font: font ?? regular, size: 9, align: 'right', color: font ? COLORS.text : COLORS.muted })
    write(money(amount), cols.amount, y, { font: font ?? regular, size: 9, align: 'right' })
    y -= 14
  }

  // Total band, clear of the last summary row above it
  const bandWidth = 270
  y -= 8
  page.drawRectangle({ x: right - bandWidth, y: y - 12, width: bandWidth, height: 24, color: COLORS.primary })
  write('Total (INR)', right - bandWidth + 12, y - 4, { font: bold, size: 11, color: COLORS.white })
  write(money(breakdown.total), cols.amount, y - 4, { font: bold, size: 11, color: COLORS.white, align: 'right' })
  y -= 34

  for (const text of wrap(`Amount in words: ${rupeesInWords(breakdown.total)}`, bold, 9, CONTENT_WIDTH)) {
    write(text, MARGIN, y, { font: bold, size: 9 })
    y -= 12
  }
  y -= 6
  const payment = ['Paid online via Razorpay', booking.razorpay_payment_id ? `Payment ID: ${booking.razorpay_payment_id}` : '']
    .filter(Boolean)
    .join(' · ')
  write(payment, MARGIN, y, { size: 9, color: COLORS.muted })
  if (!intraState) {
    y -= 12
    write(`Inter-state supply: IGST applies (issuer in ${INVOICE_ISSUER.state}).`, MARGIN, y, { size: 8.5, color: COLORS.muted })
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footerY = MARGIN + 18
  rule(footerY + 14)
  write('This is a computer-generated invoice and does not need a signature.', PAGE.width / 2, footerY, {
    size: 8,
    color: COLORS.muted,
    align: 'center',
  })
  write(`Questions about this invoice? ${INVOICE_ISSUER.email} · ${INVOICE_ISSUER.phone}`, PAGE.width / 2, footerY - 11, {
    size: 8,
    color: COLORS.muted,
    align: 'center',
  })

  return pdf.save()
}
