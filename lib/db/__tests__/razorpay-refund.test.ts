import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { normalRefundOptions } from '../../razorpay/refund-options'
import { formatRupees } from '../../utils'

test('normal refunds retain the full rupee/paise amount without requesting instant processing', () => {
  assert.deepEqual(normalRefundOptions(3), { amount: 300, speed: 'normal' })
  assert.deepEqual(normalRefundOptions(3.21), { amount: 321, speed: 'normal' })
  assert.deepEqual(normalRefundOptions(3.2), { amount: 320, speed: 'normal' })
  for (const amount of [NaN, Infinity, -Infinity, 0, -3, 0.99, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => normalRefundOptions(amount))
  }
})

const realRequire = createRequire(path.join(process.cwd(), 'package.json'))
const childrenText = (node: any): string => Array.isArray(node) ? node.map(childrenText).join('')
  : node && typeof node === 'object' ? childrenText(node.props?.children) : typeof node === 'string' ? node : ''

/** Drive actual form handlers with isolated hook state. All network calls/actions are mocked. */
function formHarness(file: string, component: string, props: any, actions: any = {}, fetchMock?: any) {
  const states: any[] = []
  let cursor = 0
  let tree: any
  const widgets = new Proxy({}, { get: () => () => null })
  const exports: Record<string, any> = {}
  const source = ts.transpileModule(readFileSync(path.join(process.cwd(), file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  runInNewContext(source, {
    exports, alert: () => {}, fetch: fetchMock,
    require: (name: string) => {
      if (name === 'react') return { useState: (initial: any) => {
        const index = cursor++
        if (!(index in states)) states[index] = initial
        return [states[index], (value: any) => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
      } }
      if (name.startsWith('@/components/ui/') || name === '@/components/icons') return widgets
      if (name === '@/lib/utils') return { formatRupees }
      if (name === 'next/navigation') return { useRouter: () => ({ refresh() {} }) }
      if (name === '@/lib/actions/admin') return actions
      if (name === './ExportButtons') return { ExportButtons: () => null }
      return realRequire(name)
    },
  }, { filename: file })
  const render = () => { cursor = 0; tree = exports[component](props) }
  const find = (predicate: (props: any) => boolean, node: any): any => {
    if (Array.isArray(node)) return node.map(child => find(predicate, child)).find(Boolean)
    if (!node || typeof node !== 'object') return undefined
    return predicate(node.props ?? {}) ? node : find(predicate, node.props?.children)
  }
  render()
  return {
    render,
    click: async (label: string) => {
      const node = find(props => typeof props.onClick === 'function' && childrenText(props.children).trim() === label, tree)
      assert.ok(node, `Missing button: ${label}`)
      await node.props.onClick()
      render()
    },
    input: (id: string) => { const node = find(props => props.id === id && typeof props.onChange === 'function', tree); assert.ok(node, `Missing input: ${id}`); return node.props },
  }
}

const refund = {
  id: 'refund-fixture', refund_amount: '3.21', cancellation_charge: '0', total_paid: '3.21',
  status: 'pending_approval', created_at: '2026-11-05T12:00:00Z',
  booking: { booking_reference: 'BK-TEST' },
}

test('approval form preserves paise and submits even sub-rupee edits as explicit overrides', async () => {
  for (const [edited, expected] of [[undefined, undefined], ['3.20', 3.2], ['3', 3]] as const) {
    const calls: any[] = []
    const form = formHarness('components/admin/RefundsTable.tsx', 'RefundsTable', { refunds: [refund] }, {
      approveRefundRequest: async (...args: any[]) => { calls.push(args); return { success: true } },
    })
    await form.click('Approve')
    assert.equal(form.input('approveAmount').value, '3.21')
    if (edited !== undefined) { form.input('approveAmount').onChange({ target: { value: edited } }); form.render() }
    await form.click('Confirm Approval')
    assert.deepEqual(calls, [['refund-fixture', expected]])
  }
})

test('direct admin refund form sends the exact edited rupees to the API', async () => {
  const calls: any[] = []
  const form = formHarness('components/admin/RefundButton.tsx', 'RefundButton', {
    bookingId: 'booking-fixture', bookingReference: 'BK-TEST', totalAmount: 3.21,
    checkInDate: '2026-11-10', paymentStatus: 'paid', status: 'confirmed',
  }, {}, async (_url: string, options: any) => {
    if (options?.method === 'POST') {
      calls.push(JSON.parse(options.body))
      return { ok: true, json: async () => ({ refund: { refundId: 'mock-refund', refundAmount: 3, estimatedDays: '5-7 business days' } }) }
    }
    return { json: async () => ({ eligible: true, refundAmount: 3.21, cancellationCharge: 0, hoursUntilCheckIn: 72 }) }
  })
  await form.click('Process Refund')
  assert.equal(form.input('editedAmount').value, '3.21')
  await form.click('Edit amount')
  form.input('editedAmount').onChange({ target: { value: '3' } })
  form.render()
  await form.click('Confirm Refund')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].overrideAmount, 3)
  assert.equal(calls[0].isAdminInitiated, true)
})
