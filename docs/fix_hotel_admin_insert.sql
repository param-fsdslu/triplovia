-- =====================================================
-- Fix: Hotel Admin Cannot Create Hotels
-- =====================================================
-- This fixes the RLS policy so hotel_admin can INSERT hotels
-- Run this in Supabase SQL Editor
-- =====================================================

-- Update the hotels_admin_own policy to allow INSERT
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

-- =====================================================
-- Verification
-- =====================================================
-- After running this, hotel_admin users should be able to:
-- 1. Create new hotels (automatically assigned to them)
-- 2. View their own hotels
-- 3. Update their own hotels
-- 4. Delete their own hotels
-- =====================================================
