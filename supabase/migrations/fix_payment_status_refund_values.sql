-- ============================================================
-- Migration: Add refund workflow payment_status values
-- ============================================================
-- The refund flow sets payment_status to 'refund_requested'
-- (customer-initiated, pending admin review) and 'refund_rejected'
-- (admin declined). Both tables need these values in their CHECK
-- constraints.
-- ============================================================


-- ============================================================
-- 1. bookings table
-- ============================================================

-- Drop existing payment_status constraint (if any) and recreate with new values.
-- The constraint name may differ — check with:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'bookings'::regclass AND contype = 'c';
-- Replace 'bookings_payment_status_check' below with the actual name if different.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'processing',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'refund_requested',   -- customer cancelled, waiting for admin to approve refund
    'refund_rejected'     -- admin declined the refund request
  ));


-- ============================================================
-- 2. boat_bookings table
-- ============================================================

-- The existing constraint only allows: pending, processing, paid, failed, refunded
-- Drop and recreate with the full set.

ALTER TABLE boat_bookings DROP CONSTRAINT IF EXISTS boat_bookings_payment_status_check;

ALTER TABLE boat_bookings
  ADD CONSTRAINT boat_bookings_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'processing',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'refund_requested',   -- customer cancelled, waiting for admin to approve refund
    'refund_rejected'     -- admin declined the refund request
  ));
