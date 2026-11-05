-- =====================================================
-- Migration: Fix RLS policies that query auth.users directly
-- =====================================================
-- Root Cause:
--   The `authenticated` role has NO SELECT permission on `auth.users`.
--   PostgreSQL evaluates ALL matching policies for every operation.
--   Any policy that contains `SELECT 1 FROM auth.users WHERE ...`
--   will cause `permission denied for table users` (code 42501) for
--   every authenticated user — even if that policy wouldn't have matched.
--
-- Example: `bookings_hotel_admin_update` queries auth.users to check
--   for hotel_admin role. When a regular user tries to cancel their own
--   booking, PostgreSQL evaluates this policy too, hits the auth.users
--   subquery, and aborts the entire UPDATE with a permission error.
--
-- Fix:
--   Replace all direct `auth.users` subqueries with:
--     - SECURITY DEFINER functions: is_super_admin(), is_hotel_admin(), is_admin()
--     - auth.jwt() for JWT claim access (no table read required)
--   These are already used by the correctly-working policies.
-- =====================================================

-- =====================================================
-- 1. bookings — fix hotel_admin UPDATE policy
-- =====================================================
DROP POLICY IF EXISTS bookings_hotel_admin_update ON bookings;

CREATE POLICY bookings_hotel_admin_update ON bookings
    FOR UPDATE
    USING (
        is_hotel_admin()
        AND EXISTS (
            SELECT 1 FROM hotels
            WHERE hotels.id = bookings.hotel_id
            AND hotels.owner_id = auth.uid()
        )
    );

-- =====================================================
-- 2. booking_meal_plans — fix admin read policy
-- =====================================================
DROP POLICY IF EXISTS "Admins can read all booking meal plans" ON booking_meal_plans;

CREATE POLICY "Admins can read all booking meal plans" ON booking_meal_plans
    FOR SELECT
    USING (is_admin());

-- =====================================================
-- 3. meal_plans — fix admin manage policy
--    Original checks role + hotel_ids from auth.users.
--    Use auth.jwt() instead — hotel_ids lives under user_metadata in the JWT.
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage meal plans" ON meal_plans;

CREATE POLICY "Admins can manage meal plans" ON meal_plans
    FOR ALL
    USING (
        is_super_admin()
        OR (
            is_hotel_admin()
            AND (meal_plans.hotel_id)::text = ANY (
                ARRAY(
                    SELECT jsonb_array_elements_text(auth.jwt() -> 'user_metadata' -> 'hotel_ids')
                )
            )
        )
    );

-- =====================================================
-- 4. payment_anomalies — fix admin policy
-- =====================================================
DROP POLICY IF EXISTS "Only admins can access payment anomalies" ON payment_anomalies;

CREATE POLICY "Only admins can access payment anomalies" ON payment_anomalies
    FOR ALL
    USING (is_super_admin());

-- =====================================================
-- 5. payment_audit_log — fix admin policy
-- =====================================================
DROP POLICY IF EXISTS "Only admins can access payment audit log" ON payment_audit_log;

CREATE POLICY "Only admins can access payment audit log" ON payment_audit_log
    FOR ALL
    USING (is_super_admin());

-- =====================================================
-- 6. refund_transactions — fix admin policy
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all refund transactions" ON refund_transactions;

CREATE POLICY "Admins can view all refund transactions" ON refund_transactions
    FOR ALL
    USING (is_super_admin());

-- =====================================================
-- 7. profiles — fix admin view/update policies
-- =====================================================
DROP POLICY IF EXISTS profiles_admin_view_all ON profiles;

CREATE POLICY profiles_admin_view_all ON profiles
    FOR SELECT
    USING (is_super_admin());

DROP POLICY IF EXISTS profiles_admin_update_all ON profiles;

CREATE POLICY profiles_admin_update_all ON profiles
    FOR UPDATE
    USING (is_super_admin());

-- =====================================================
-- 8. boat_bookings — add missing user UPDATE policy
--    (currently has no UPDATE policy for regular users;
--     cancellation via refund API goes through admin path,
--     but adding this for completeness)
-- =====================================================
DROP POLICY IF EXISTS "Users can update own boat bookings" ON boat_bookings;

CREATE POLICY "Users can update own boat bookings" ON boat_bookings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Verification — run this separately after applying:
--
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND qual LIKE '%auth.users%'
-- ORDER BY tablename, policyname;
-- Should return 0 rows after this migration.
-- =====================================================
