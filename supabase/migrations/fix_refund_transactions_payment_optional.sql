-- ============================================================
-- Migration: Handle missing payment records in refund_transactions
-- ============================================================
-- The payments table insert uses service role (fire-and-forget).
-- If service role is misconfigured, the payment record may not
-- exist when a refund is requested. This migration makes payment_id
-- nullable and adds a direct gateway payment ID column so refunds
-- can proceed without a payments table record.
-- ============================================================

-- Make payment_id nullable (it may already be, this is safe either way)
ALTER TABLE refund_transactions
  ALTER COLUMN payment_id DROP NOT NULL;

-- Store the Razorpay payment ID directly so admin approval can
-- proceed even when no payments table record exists
ALTER TABLE refund_transactions
  ADD COLUMN IF NOT EXISTS payment_gateway_payment_id TEXT;

-- ============================================================
-- Fix status CHECK constraint — add pending_approval and rejected
-- ============================================================
-- The refund flow uses 'pending_approval' for customer-initiated
-- cancellations awaiting admin review, and 'rejected' when admin
-- declines. The original constraint only had: processing, completed,
-- failed, cancelled.
-- ============================================================

ALTER TABLE refund_transactions
  DROP CONSTRAINT IF EXISTS refund_transactions_status_check;

ALTER TABLE refund_transactions
  ADD CONSTRAINT refund_transactions_status_check
  CHECK (status IN (
    'pending_approval',   -- customer cancelled, awaiting admin review
    'processing',         -- admin approved, Razorpay call in progress
    'completed',          -- refund processed by Razorpay
    'failed',             -- Razorpay refund failed
    'rejected',           -- admin declined the refund
    'cancelled'           -- cancelled before processing
  ));
