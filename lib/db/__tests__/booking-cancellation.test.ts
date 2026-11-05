import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { cn, formatRupees } from '../../utils'
import { formatBookingDate } from '../../utils/booking-display'

const realRequire = createRequire(path.join(process.cwd(), 'package.json'))
const widget = () => null
const widgets = new Proxy({}, { get: () => widget })
const CancellationSlot = () => null
const text = (node: any): string => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : ''
const booking = {
  id: 'booking-fixture', booking_reference: 'BK-FIXTURE', booking_status: 'confirmed', payment_status: 'paid',
  check_in_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  check_out_date: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
  created_at: new Date().toISOString(), num_nights: 1, num_adults: 2, num_children: 0, num_rooms: 1,
  total_amount: 3.21, hotel: null, room_type: null,
}

function mount(file: string, component: string, props: any, options: { states?: any[]; fetch?: any; cancel?: any } = {}) {
  const states = [...(options.states ?? [])]
  let cursor = 0
  let tree: any
  let currentProps = props
  const exports: Record<string, any> = {}
  const source = ts.transpileModule(readFileSync(path.join(process.cwd(), file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  runInNewContext(source, {
    exports, fetch: options.fetch,
    require: (name: string) => {
      if (name === 'react') return {
        useState: (initial: any) => {
          const index = cursor++
          if (!(index in states)) states[index] = initial
          return [states[index], (value: any) => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
        },
        useRef: (initial: any) => {
          const index = cursor++
          if (!(index in states)) states[index] = { current: initial }
          return states[index]
        },
        useMemo: (callback: any) => callback(), useEffect: () => {},
      }
      if (name.startsWith('@/components/ui/') || name === '@/components/icons') return widgets
      if (name === '@/components/booking/BookingCancellation') return { BookingCancellation: CancellationSlot }
      if (name.startsWith('@/components/booking/') || name.startsWith('@/components/reviews/')) return widgets
      if (name === '@/lib/utils') return { cn, formatRupees }
      if (name === '@/lib/utils/booking-display') return { formatBookingDate }
      if (name === '@/i18n/routing') return { Link: widget, useRouter: () => ({ refresh() {} }) }
      if (name === 'next/image') return widget
      if (name === '@/lib/actions/bookings') return { cancelBooking: options.cancel }
      if (name === '@/lib/actions/reviews') return {}
      if (name === '@/lib/utils/invoice') return { isInvoiceable: () => false }
      if (name === '@/lib/config/contact') return { CONTACT: { phone: '+910000000000', email: 'support@example.com' }, whatsappUrl: () => 'https://wa.me/0000000000' }
      if (name === '@/lib/utils/maps') return { directionsUrl: () => '' }
      return realRequire(name)
    },
  }, { filename: file })
  const render = (nextProps?: any) => { if (nextProps) currentProps = nextProps; cursor = 0; tree = exports[component](currentProps) }
  const find = (predicate: (node: any) => boolean, node: any): any => {
    if (Array.isArray(node)) return node.map(child => find(predicate, child)).find(Boolean)
    if (!node || typeof node !== 'object') return undefined
    return predicate(node) ? node : find(predicate, node.props?.children)
  }
  render()
  return {
    render, get tree() { return tree },
    find: (predicate: (node: any) => boolean, root?: any) => find(predicate, root ?? tree),
    click: async (label: string) => {
      const node = find(node => typeof node.props?.onClick === 'function' && text(node.props.children).trim().startsWith(label), tree)
      assert.ok(node, `Missing button: ${label}`)
      await node.props.onClick(); render()
    },
    choose: (value: string) => {
      const node = find(node => typeof node.props?.onValueChange === 'function', tree)
      assert.ok(node, 'Missing reason dropdown')
      node.props.onValueChange(value); render()
    },
  }
}

test('paid cancellation requires a reason and final confirmation, and keeps success visible after the booking updates', async () => {
  const requests: any[] = []
  let completed = 0
  const view = mount('components/booking/BookingCancellation.tsx', 'BookingCancellation', { booking, onCancelled: () => completed++ }, {
    fetch: async (_url: string, options: any) => { requests.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ success: true }) } },
    cancel: () => { throw new Error('Paid bookings must go through refund review') },
  })
  await view.click('Cancel booking')
  await view.click('Review cancellation')
  assert.equal(requests.length, 0)
  assert.match(text(view.tree), /Please select a reason/)
  view.choose('Other')
  const input = view.find(node => node.props?.id === 'booking-cancel-other' && typeof node.props.onChange === 'function')
  input.props.onChange({ target: { value: '  Change of plans  ' } }); view.render()
  await view.click('Review cancellation')
  assert.equal(requests.length, 0)
  assert.match(text(view.tree), /Are you sure you want to cancel/)
  await view.click('Back')
  assert.equal(view.find(node => node.props?.id === 'booking-cancel-other' && typeof node.props.onChange === 'function').props.value.trim(), 'Change of plans')
  await view.click('Review cancellation')
  await view.click('Yes, cancel booking')
  assert.deepEqual(requests, [{ bookingId: booking.id, reason: 'Change of plans', isAdminInitiated: false, bookingType: 'hotel' }])
  assert.equal(completed, 1)
  view.render({ booking: { ...booking, booking_status: 'cancelled', payment_status: 'refund_requested' }, onCancelled: () => completed++ })
  assert.match(text(view.tree), /Booking cancelled/)
  assert.match(text(view.tree), /refund request has been submitted for review/)
  assert.equal(view.find(node => typeof node.props?.onOpenChange === 'function').props.open, true)
  await view.click('Done')
  assert.equal(view.tree, null)
})

test('unpaid bookings use cancellation action; closed or past bookings have no cancellation action', async () => {
  const calls: any[] = []
  const view = mount('components/booking/BookingCancellation.tsx', 'BookingCancellation', { booking: { ...booking, payment_status: 'pending' }, onCancelled() {} }, {
    fetch: () => { throw new Error('Unpaid booking must not request a refund') },
    cancel: async (...args: any[]) => { calls.push(args); return { success: true } },
  })
  await view.click('Cancel booking'); view.choose('Change of plans'); await view.click('Review cancellation'); await view.click('Yes, cancel booking')
  assert.deepEqual(calls, [[booking.id, 'Change of plans']])
  assert.match(text(view.tree), /reservation has been cancelled successfully/)
  assert.doesNotMatch(text(view.tree), /refund request has been submitted/)
  for (const row of [{ ...booking, booking_status: 'cancelled' }, { ...booking, check_in_date: '2000-01-01' }]) {
    assert.equal(mount('components/booking/BookingCancellation.tsx', 'BookingCancellation', { booking: row, onCancelled() {} }).tree, null)
  }
})

test('a rejected cancellation stays on confirmation without showing success', async () => {
  let completed = 0
  const view = mount('components/booking/BookingCancellation.tsx', 'BookingCancellation', { booking, onCancelled: () => completed++ }, {
    fetch: async () => ({ ok: false, json: async () => ({ error: 'Booking could not be cancelled' }) }),
  })
  await view.click('Cancel booking'); view.choose('Change of plans'); await view.click('Review cancellation'); await view.click('Yes, cancel booking')
  assert.equal(completed, 0)
  assert.match(text(view.tree), /Booking could not be cancelled/)
  assert.doesNotMatch(text(view.tree), /Your cancellation is confirmed/)
  assert.ok(view.find(node => typeof node.props?.onClick === 'function' && text(node.props.children).startsWith('Yes, cancel booking')))
})

test('double confirmation submits only one cancellation request', async () => {
  let calls = 0
  let release: any
  const view = mount('components/booking/BookingCancellation.tsx', 'BookingCancellation', { booking, onCancelled() {} }, {
    fetch: async () => { calls++; return new Promise(resolve => { release = resolve }) },
  })
  await view.click('Cancel booking'); view.choose('Change of plans'); await view.click('Review cancellation')
  const button = view.find(node => typeof node.props?.onClick === 'function' && text(node.props.children).startsWith('Yes, cancel booking'))
  const pending = button.props.onClick()
  await button.props.onClick()
  assert.equal(calls, 1)
  release({ ok: true, json: async () => ({ success: true }) })
  await pending; view.render()
  assert.match(text(view.tree), /Your cancellation is confirmed/)
})

test('My Bookings links to Need help, where cancellation updates the detail status after success', () => {
  const list = mount('components/booking/BookingsList.tsx', 'BookingsList', { bookings: [booking] })
  assert.ok(list.find(node => node.props?.href === `/bookings/${booking.booking_reference}#need-help`))
  assert.equal(list.find(node => typeof node.props?.onClick === 'function' && text(node.props.children).trim() === 'Cancel'), undefined)
  const detail = mount('components/booking/BookingConfirmation.tsx', 'BookingConfirmation', { bookingReference: booking.booking_reference }, { states: [booking, false, null] })
  const help = detail.find(node => node.props?.id === 'need-help')
  assert.ok(help)
  const cancellation = detail.find(node => node.type === CancellationSlot, help)
  assert.equal(cancellation.props.booking.id, booking.id)
  cancellation.props.onCancelled(); detail.render()
  assert.match(text(detail.tree), /Booking Cancelled/)
  assert.equal(detail.find(node => node.type === CancellationSlot).props.booking.payment_status, 'refund_requested')
})
