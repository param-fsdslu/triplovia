-- Add boat_booking_id to payments table and make booking_id nullable
-- This allows payments to reference either hotel bookings or boat bookings

-- 1. Make booking_id nullable (it was required, but boat bookings don't have a bookings row)
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;

-- 2. Add boat_booking_id column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS boat_booking_id UUID REFERENCES boat_bookings(id);

-- 3. Add index for boat_booking_id lookups
CREATE INDEX IF NOT EXISTS idx_payments_boat_booking_id ON payments(boat_booking_id);

-- 4. Add check constraint: exactly one of booking_id or boat_booking_id must be set
ALTER TABLE payments ADD CONSTRAINT payments_booking_type_check
  CHECK (
    (booking_id IS NOT NULL AND boat_booking_id IS NULL) OR
    (booking_id IS NULL AND boat_booking_id IS NOT NULL)
  );

-- 5. Same changes for refund_transactions
ALTER TABLE refund_transactions ALTER COLUMN booking_id DROP NOT NULL;

ALTER TABLE refund_transactions ADD COLUMN IF NOT EXISTS boat_booking_id UUID REFERENCES boat_bookings(id);

CREATE INDEX IF NOT EXISTS idx_refund_transactions_boat_booking_id ON refund_transactions(boat_booking_id);

ALTER TABLE refund_transactions ADD CONSTRAINT refund_transactions_booking_type_check
  CHECK (
    (booking_id IS NOT NULL AND boat_booking_id IS NULL) OR
    (booking_id IS NULL AND boat_booking_id IS NOT NULL)
  );

-- 6. Add razorpay fields to boat_bookings (matching bookings table)
ALTER TABLE boat_bookings ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE boat_bookings ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
