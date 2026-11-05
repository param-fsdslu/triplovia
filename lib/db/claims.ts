/**
 * Run-once claims: the first caller to claim a key gets true, every later (or concurrent) caller
 * gets false. Backed by a create-only document (`_claims/<key>`), so it holds even when two
 * requests race, e.g. payment verify and the Razorpay webhook both trying to send the booking
 * confirmation. Keys must not contain "/".
 */
import { isAlreadyExists, type DocStore } from './store'
import type { Row } from './types'

export const CLAIMS_COLLECTION = '_claims'

export async function claimOnce(store: DocStore, key: string, data: Row = {}): Promise<boolean> {
  if (!key || key.includes('/')) throw new Error(`Invalid claim key: ${key}`)
  try {
    await store.transaction(async (tx) => {
      tx.create(`${CLAIMS_COLLECTION}/${key}`, { ...data, claimed_at: new Date().toISOString() })
    })
    return true
  } catch (error) {
    if (isAlreadyExists(error)) return false
    throw error
  }
}
