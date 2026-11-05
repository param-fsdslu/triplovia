import assert from 'node:assert/strict'
import { calculateHotelRefund, hotelPolicyText, isHotelCancellationPolicy } from '../../config/hotel-cancellation-policy'

const checkIn = new Date('2026-12-10T14:00:00+05:30')
const booking = { total_amount: 1000, check_in_date: '2026-12-10', cancellation_check_in_time: '14:00:00' }
let checks = 0
function expect(policy: string, hours: number, amount: number, extra = {}) {
  const result = calculateHotelRefund({ ...booking, cancellation_policy: policy, ...extra }, new Date(checkIn.getTime() - hours * 3_600_000))
  assert.equal(result.refundAmount, amount, policy + ' at ' + hours + ' hours')
  assert.equal(result.cancellationCharge, Math.round((1000 - amount) * 100) / 100)
  checks++
}
expect('flexible', 24, 1000)
expect('flexible', 24 - 1 / 3_600_000, 0)
expect('flexible', 72, 1000)
expect('moderate', 72, 1000)
expect('moderate', 72 - 1 / 3_600_000, 500)
expect('moderate', 24, 500)
expect('moderate', 24 - 1 / 3_600_000, 0)
expect('moderate', 48, 500)
expect('strict', 1000, 0)
expect('flexible', -1, 0)
expect('flexible', 100, 0, { booking_status: 'no_show' })
expect('moderate', 100, 0, { booking_status: 'no_show' })
expect('legacy', 48, 976.4)
expect('legacy', 47, 0)
// A hotel policy passed alongside an old booking must never replace its original terms.
const legacy = { ...booking, cancellation_check_in_time: null, hotel: { cancellation_policy: 'strict' } }
assert.equal(calculateHotelRefund(legacy, new Date('2026-12-08T00:00:00Z')).refundAmount, 976.4)
assert.equal(calculateHotelRefund({ ...booking, cancellation_policy: 'strict' }, checkIn, true).refundAmount, 1000)
assert.equal(calculateHotelRefund({ ...booking, total_amount: 999.99, cancellation_policy: 'moderate' }, new Date(checkIn.getTime() - 48 * 3_600_000)).refundAmount, 500)
assert.throws(() => calculateHotelRefund({ ...booking, total_amount: 'invalid' }))
assert.equal(isHotelCancellationPolicy('toString'), false)
assert.match(hotelPolicyText('moderate'), /50% refund/)
console.log('Hotel cancellation: ' + checks + ' timing cases and 6 safety/rounding checks passed')
