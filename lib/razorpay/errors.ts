/**
 * The reason inside a Razorpay SDK error. The SDK rejects with a plain object,
 * { statusCode, error: { code, description, reason, field, ... } }, not an Error, so
 * `err.message` is undefined and the gateway's explanation would be lost.
 */
export function razorpayErrorMessage(err: unknown): string {
  const e = err as { statusCode?: number; message?: string; error?: { code?: string; description?: string; reason?: string } }
  const description = e?.error?.description?.trim()
  if (description) {
    const reason = e.error?.reason && e.error.reason !== 'NA' ? ` [${e.error.reason}]` : ''
    return `${description}${reason}`
  }
  if (e?.message) return e.message
  return e?.statusCode ? `Razorpay returned HTTP ${e.statusCode}` : 'Unknown Razorpay error'
}
