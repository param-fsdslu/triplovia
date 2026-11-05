-- =====================================================
-- COMPLETE FIX: Permission Denied for Table Users
-- =====================================================
-- This fixes ALL RLS policies that reference auth.users
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Create helper functions with SECURITY DEFINER
-- These bypass RLS and can access auth.users safely

-- Check if user is any type of admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'super_admin'
        OR auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'super_admin'
        OR auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is hotel admin
CREATE OR REPLACE FUNCTION public.is_hotel_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Step 2: Update HOTELS policies
-- =====================================================

DROP POLICY IF EXISTS hotels_super_admin_all ON hotels;
CREATE POLICY hotels_super_admin_all ON hotels
  FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS hotels_admin_own ON hotels;
CREATE POLICY hotels_admin_own ON hotels
  FOR ALL
  USING (
    owner_id = auth.uid()
    AND public.is_hotel_admin()
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND public.is_hotel_admin()
  );

-- Keep public view policy as-is (doesn't query auth.users)
-- DROP POLICY IF EXISTS hotels_public_view ON hotels;
-- CREATE POLICY hotels_public_view ON hotels
--   FOR SELECT
--   USING (status = 'active');

-- =====================================================
-- Step 3: Update ROOM_TYPES policies
-- =====================================================

DROP POLICY IF EXISTS room_types_super_admin_all ON room_types;
CREATE POLICY room_types_super_admin_all ON room_types
  FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS room_types_admin_own ON room_types;
CREATE POLICY room_types_admin_own ON room_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = room_types.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

-- Keep public view policy as-is
-- DROP POLICY IF EXISTS room_types_public_view ON room_types;

-- =====================================================
-- Step 4: Update ROOMS policies
-- =====================================================

DROP POLICY IF EXISTS rooms_super_admin_all ON rooms;
CREATE POLICY rooms_super_admin_all ON rooms
  FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS rooms_admin_own ON rooms;
CREATE POLICY rooms_admin_own ON rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = rooms.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

-- =====================================================
-- Step 5: Update BOOKINGS policies
-- =====================================================

DROP POLICY IF EXISTS bookings_super_admin_all ON bookings;
CREATE POLICY bookings_super_admin_all ON bookings
  FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS bookings_super_admin_update ON bookings;
CREATE POLICY bookings_super_admin_update ON bookings
  FOR UPDATE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS bookings_admin_own_hotel ON bookings;
CREATE POLICY bookings_admin_own_hotel ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = bookings.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

-- Keep user own policy as-is (doesn't query auth.users)
-- DROP POLICY IF EXISTS bookings_user_own ON bookings;
-- CREATE POLICY bookings_user_own ON bookings
--   FOR ALL
--   USING (user_id = auth.uid());

-- =====================================================
-- Step 6: Update PAYMENTS policies
-- =====================================================

DROP POLICY IF EXISTS payments_super_admin_all ON payments;
CREATE POLICY payments_super_admin_all ON payments
  FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS payments_admin_own_hotel ON payments;
CREATE POLICY payments_admin_own_hotel ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN hotels ON hotels.id = bookings.hotel_id
      WHERE bookings.id = payments.booking_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

-- Keep user own policy as-is
-- DROP POLICY IF EXISTS payments_user_own ON payments;

-- =====================================================
-- Verification
-- =====================================================
-- Test the functions by running:
-- SELECT public.is_admin();
-- SELECT public.is_super_admin();
-- SELECT public.is_hotel_admin();
--
-- You should see 'true' for the appropriate roles
-- =====================================================
