/**
 * Replacements for the Postgres triggers and generated columns from schema.sql.
 * `beforeWrite` runs on every inserted/updated row; `afterWrite` returns follow-up
 * inserts (the payment audit trail) that run after the mutation commits.
 */
import { daysBetween } from './values'
import type { Row } from './types'

/** Tables whose updated_at was maintained by a BEFORE UPDATE trigger */
const UPDATED_AT_TABLES = new Set([
  'bookings', 'profiles', 'blogs', 'child_policies', 'faqs', 'hotels',
  'price_rules', 'promotions', 'reviews', 'room_types', 'rooms', 'saved_stays',
])

export function beforeWrite(table: string, row: Row, op: 'insert' | 'update'): Row {
  const next = { ...row }

  if (op === 'update' && UPDATED_AT_TABLES.has(table)) {
    next.updated_at = new Date().toISOString()
  }

  // profiles.full_name was a GENERATED ALWAYS column
  if (table === 'profiles') {
    const first = next.first_name ?? null
    const last = next.last_name ?? null
    next.full_name = first !== null && last !== null ? `${first} ${last}` : (first ?? last)
  }

  // calculate_booking_amounts trigger
  if (table === 'bookings') {
    if (next.check_in_date && next.check_out_date) {
      next.num_nights = daysBetween(next.check_in_date, next.check_out_date)
    } else {
      next.num_nights = null
    }
    const price = next.price_per_night
    next.subtotal =
      price !== null && price !== undefined && next.num_nights !== null && next.num_rooms !== null && next.num_rooms !== undefined
        ? Number(price) * next.num_nights * Number(next.num_rooms)
        : null
  }

  return next
}

export interface FollowUpInsert {
  table: string
  row: Row
}

export function afterWrite(table: string, row: Row, op: 'insert' | 'update'): FollowUpInsert[] {
  // log_payment_event trigger
  if (table === 'payments') {
    return [
      {
        table: 'payment_audit_log',
        row: {
          payment_id: row.id,
          booking_id: row.booking_id ?? null,
          event_type: op.toUpperCase(),
          event_source: 'database_trigger',
          payload: row,
          success: row.status === 'success',
        },
      },
    ]
  }
  return []
}
