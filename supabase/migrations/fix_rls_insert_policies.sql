-- ============================================================
-- Migration: Add user INSERT policies for payments and refund_transactions
-- ============================================================
-- The service role key is misconfigured in production (set to anon key).
-- Until fixed, authenticated users need INSERT policies so the payment
-- record and refund transaction record can be created via the user client.
-- These policies are safe: they verify ownership through the booking.
-- ============================================================

-- Allow authenticated users to insert a payment for their own booking
CREATE POLICY payments_user_insert ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM boat_bookings
      WHERE boat_bookings.id = payments.boat_booking_id
      AND boat_bookings.user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert a refund transaction for their own booking
CREATE POLICY refund_transactions_user_insert ON refund_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = refund_transactions.booking_id
      AND bookings.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM boat_bookings
      WHERE boat_bookings.id = refund_transactions.boat_booking_id
      AND boat_bookings.user_id = auth.uid()
    )
  );
