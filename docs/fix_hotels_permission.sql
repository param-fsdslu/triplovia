-- =====================================================
-- Fix: Permission Denied for Table Users Error
-- =====================================================
-- This script fixes the "permission denied for table users" error
-- that occurs when admin users try to view hotels
-- =====================================================

-- Step 1: Create a helper function with SECURITY DEFINER
-- This function uses elevated permissions to check admin status
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

-- Step 2: Create a helper function to check if a policy exists
CREATE OR REPLACE FUNCTION public.policy_exists(
  p_schema_name text,
  p_table_name text,
  p_policy_name text
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = p_schema_name
    AND tablename = p_table_name
    AND policyname = p_policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update hotels policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hotels') THEN
    IF public.policy_exists('public', 'hotels', 'hotels_super_admin_all') THEN
      DROP POLICY hotels_super_admin_all ON public.hotels;
    END IF;
    CREATE POLICY hotels_super_admin_all ON public.hotels
      FOR ALL
      USING (public.is_admin());
    RAISE NOTICE 'Updated hotels_super_admin_all policy';
  ELSE
    RAISE NOTICE 'Table hotels does not exist - skipping';
  END IF;
END $$;

-- Step 4: Update room_types policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'room_types') THEN
    IF public.policy_exists('public', 'room_types', 'room_types_super_admin_all') THEN
      DROP POLICY room_types_super_admin_all ON public.room_types;
    END IF;
    CREATE POLICY room_types_super_admin_all ON public.room_types
      FOR ALL
      USING (public.is_admin());
    RAISE NOTICE 'Updated room_types_super_admin_all policy';
  ELSE
    RAISE NOTICE 'Table room_types does not exist - skipping';
  END IF;
END $$;

-- Step 5: Update rooms policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rooms') THEN
    IF public.policy_exists('public', 'rooms', 'rooms_super_admin_all') THEN
      DROP POLICY rooms_super_admin_all ON public.rooms;
    END IF;
    CREATE POLICY rooms_super_admin_all ON public.rooms
      FOR ALL
      USING (public.is_admin());
    RAISE NOTICE 'Updated rooms_super_admin_all policy';
  ELSE
    RAISE NOTICE 'Table rooms does not exist - skipping';
  END IF;
END $$;

-- Step 6: Update bookings policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    IF public.policy_exists('public', 'bookings', 'bookings_super_admin_all') THEN
      DROP POLICY bookings_super_admin_all ON public.bookings;
    END IF;
    CREATE POLICY bookings_super_admin_all ON public.bookings
      FOR SELECT
      USING (public.is_admin());
    
    IF public.policy_exists('public', 'bookings', 'bookings_super_admin_update') THEN
      DROP POLICY bookings_super_admin_update ON public.bookings;
    END IF;
    CREATE POLICY bookings_super_admin_update ON public.bookings
      FOR UPDATE
      USING (public.is_admin());
    
    RAISE NOTICE 'Updated bookings policies';
  ELSE
    RAISE NOTICE 'Table bookings does not exist - skipping';
  END IF;
END $$;

-- Step 7: Update payments policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    IF public.policy_exists('public', 'payments', 'payments_super_admin_all') THEN
      DROP POLICY payments_super_admin_all ON public.payments;
    END IF;
    CREATE POLICY payments_super_admin_all ON public.payments
      FOR SELECT
      USING (public.is_admin());
    RAISE NOTICE 'Updated payments_super_admin_all policy';
  ELSE
    RAISE NOTICE 'Table payments does not exist - skipping';
  END IF;
END $$;

-- Step 8: Clean up the helper function
DROP FUNCTION IF EXISTS public.policy_exists(text, text, text);

-- =====================================================
-- Verification
-- =====================================================
-- After running this script, test the is_admin function:
-- SELECT public.is_admin();
--
-- If you get 'true', the function works correctly.
-- Then try accessing the hotels page in your admin panel.
-- =====================================================
