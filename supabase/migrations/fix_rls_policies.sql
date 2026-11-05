-- =====================================================
-- Migration: Fix RLS Policies for Admin Access
-- =====================================================
-- Description: Fix permission issues with admin access
-- Created: 2026-01-20
-- =====================================================

-- =====================================================
-- 1. Fix Bookings RLS - Add admin update policy
-- =====================================================

-- Allow super_admin to update bookings
DROP POLICY IF EXISTS bookings_super_admin_update ON bookings;
CREATE POLICY bookings_super_admin_update ON bookings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.raw_user_meta_data->>'role' = 'super_admin'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Allow hotel_admin to update their hotels' bookings
DROP POLICY IF EXISTS bookings_hotel_admin_update ON bookings;
CREATE POLICY bookings_hotel_admin_update ON bookings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM hotels
            WHERE hotels.id = bookings.hotel_id
            AND hotels.owner_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
            )
        )
    );

-- =====================================================
-- 2. Fix Hotels Policies - Support 'admin' role for backwards compatibility
-- =====================================================

-- Drop and recreate super admin policy to include 'admin' role
DROP POLICY IF EXISTS hotels_super_admin_all ON hotels;

CREATE POLICY hotels_super_admin_all ON hotels
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.raw_user_meta_data->>'role' = 'super_admin'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- =====================================================
-- 3. Fix Room Types Policies
-- =====================================================

DROP POLICY IF EXISTS room_types_super_admin_all ON room_types;

CREATE POLICY room_types_super_admin_all ON room_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.raw_user_meta_data->>'role' = 'super_admin'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- =====================================================
-- 4. Fix Rooms Policies
-- =====================================================

DROP POLICY IF EXISTS rooms_super_admin_all ON rooms;

CREATE POLICY rooms_super_admin_all ON rooms
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.raw_user_meta_data->>'role' = 'super_admin'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Add public read policy for rooms
DROP POLICY IF EXISTS rooms_public_view ON rooms;
CREATE POLICY rooms_public_view ON rooms
    FOR SELECT
    USING (
        status = 'available'
        AND EXISTS (
            SELECT 1 FROM hotels
            WHERE hotels.id = rooms.hotel_id
            AND hotels.status = 'active'
        )
    );

-- =====================================================
-- 5. Fix Bookings Policies - Support 'admin' role
-- =====================================================

DROP POLICY IF EXISTS bookings_super_admin_all ON bookings;

CREATE POLICY bookings_super_admin_all ON bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.raw_user_meta_data->>'role' = 'super_admin'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- =====================================================
-- 6. Fix Payments Policies
-- =====================================================

DROP POLICY IF EXISTS payments_super_admin_all ON payments;

CREATE POLICY payments_super_admin_all ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.raw_user_meta_data->>'role' = 'super_admin'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- =====================================================
-- 7. Create or update profiles table
-- =====================================================

-- Check if profiles table exists and add missing columns if needed
DO $$
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT,
            role TEXT,
            hotel_ids JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if table exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
            ALTER TABLE public.profiles ADD COLUMN email TEXT;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
            ALTER TABLE public.profiles ADD COLUMN role TEXT;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'hotel_ids') THEN
            ALTER TABLE public.profiles ADD COLUMN hotel_ids JSONB;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
            ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
            ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS profiles_view_own ON profiles;
CREATE POLICY profiles_view_own ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS profiles_admin_view_all ON profiles;
CREATE POLICY profiles_admin_view_all ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.raw_user_meta_data->>'role' = 'super_admin'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Admins can update all profiles
DROP POLICY IF EXISTS profiles_admin_update_all ON profiles;
CREATE POLICY profiles_admin_update_all ON profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.raw_user_meta_data->>'role' = 'super_admin'
                OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- =====================================================
-- 8. Create function to sync auth.users to profiles
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, hotel_ids)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->'hotel_ids'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        hotel_ids = EXCLUDED.hotel_ids,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 9. Sync existing users to profiles
-- =====================================================

INSERT INTO public.profiles (id, email, role, hotel_ids)
SELECT
    id,
    email,
    raw_user_meta_data->>'role',
    raw_user_meta_data->'hotel_ids'
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    hotel_ids = EXCLUDED.hotel_ids,
    updated_at = NOW();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
