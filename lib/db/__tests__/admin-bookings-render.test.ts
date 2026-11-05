import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { formatBookingDate } from '../../utils/booking-display'
import { ADMIN_PATH } from '../../config/admin-path'

const realRequire = createRequire(path.join(process.cwd(), 'package.json'))
const booking = {
  id: 'booking-fixture', booking_reference: 'BK-RETAINED', guest_first_name: 'Test', guest_last_name: 'Guest',
  guest_email: 'guest@example.com', check_in_date: '2026-11-06', check_out_date: '2026-11-07',
  total_amount: 2000, booking_status: 'confirmed', payment_status: 'paid',
  created_at: '2026-11-05T12:00:00Z', updated_at: '2026-11-05T12:00:00Z',
  hotel: { name: 'Existing property', city: 'Honnavar', state: 'Karnataka' }, room_type: { name: 'Deluxe' },
  booking_meal_plans: [],
}

/** Render actual page/table code; stub UI widgets and external actions, with no Firebase access. */
function loadView(file: string, row: any, captureExport: (props: any) => void = () => {}) {
  const stub = ({ children }: any) => React.createElement('span', null, children)
  const widgets = new Proxy({}, { get: () => stub })
  const exports: Record<string, any> = {}
  const source = ts.transpileModule(readFileSync(path.join(process.cwd(), file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name.startsWith('@/components/ui/') || name === '@/components/icons') return widgets
      if (name === '@/lib/utils/booking-display') return { formatBookingDate }
      if (name === '@/lib/config/admin-path') return { ADMIN_PATH }
      if (name === 'next/navigation') return { useRouter: () => ({}), redirect: () => { throw new Error('Unexpected redirect') } }
      if (name === '@/lib/actions/admin') return { getBookingDetails: async () => ({ success: true, booking: row }) }
      if (name === '@/lib/utils/admin') return { checkIsSuperAdmin: async () => false }
      if (name === '@/lib/utils/invoice') return { isInvoiceable: () => false }
      if (name === './ExportButtons') return { ExportButtons: (props: any) => { captureExport(props); return null } }
      if (name === './StatusPill' || name === '@/components/admin/StatusPill') return { StatusPill: ({ status }: any) => React.createElement('span', null, status) }
      if (name.startsWith('@/components/admin/')) return widgets
      return realRequire(name)
    },
  }, { filename: file })
  return exports
}

test('admin booking list keeps orphaned bookings viewable and exportable', () => {
  const orphan = { ...booking, hotel: null, room_type: null, check_in_date: 'invalid', check_out_date: null }
  let exported: any
  const { BookingsTable } = loadView('components/admin/BookingsTable.tsx', orphan, props => { exported = props })
  const html = renderToStaticMarkup(React.createElement(BookingsTable, { bookings: [booking, orphan] }))
  assert.match(html, /Existing property/)
  assert.match(html, /Property unavailable/)
  assert.match(html, /Location unavailable/)
  assert.equal((html.match(/BK-RETAINED/g) ?? []).length, 2)
  assert.equal(exported.rows.length, 2)
  const cell = (header: string) => exported.columns.find((column: any) => column.header === header).accessor(orphan)
  assert.equal(cell('Hotel'), 'Property unavailable')
  assert.equal(cell('Check-in'), '—')
  assert.equal(cell('Check-out'), '—')
  assert.match(renderToStaticMarkup(React.createElement(BookingsTable, { bookings: [] })), /No bookings found/)
})

test('admin booking detail renders when property, room and historical dates are missing', async () => {
  const orphan = { ...booking, hotel: null, room_type: null, check_in_date: 'invalid', check_out_date: null, created_at: null, updated_at: 'invalid' }
  const { default: Page } = loadView('app/console-b69ece1a1dc2/(panel)/bookings/[reference]/page.tsx', orphan)
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ reference: orphan.booking_reference }) }))
  assert.match(html, /Property unavailable/)
  assert.match(html, /Room type unavailable/)
  assert.doesNotMatch(html, /NaN/)
  assert.equal(formatBookingDate(null), '—')
  assert.equal(formatBookingDate('invalid'), '—')
  assert.equal(formatBookingDate('2026-11-06'), 'Nov 06, 2026')
})
