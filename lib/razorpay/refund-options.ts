/** Standard refunds avoid the additional instant-refund fee charged for optimum speed. */
export function normalRefundOptions(amountRupees: number) {
  const amount = Math.round(amountRupees * 100)
  if (!Number.isFinite(amountRupees) || !Number.isSafeInteger(amount) || amount < 100) {
    throw new Error('The refund amount must be at least ₹1 and a valid amount in rupees.')
  }
  return { amount, speed: 'normal' as const }
}
