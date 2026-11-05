# Fix Permission Errors - Quick Guide

## The Errors You're Seeing

```
Error fetching user bookings: permission denied for table users
Error fetching recent activity: permission denied for table users
Error fetching admin users: User not allowed
```

## The Root Cause

1. Your app is trying to access `auth.users` table directly, but RLS (Row Level Security) is blocking it
2. Admin operations using `supabase.auth.admin` methods require a service role key, not a regular user session

## The Complete Fix (3 Steps)

### Step 1: Add Service Role Key to Environment

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Navigate to: **Settings → API**
3. Copy the `service_role` key (not the anon key!)
4. Add it to your `.env.local` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANT:** Never commit this key to git! Keep it in `.env.local` only.

### Step 2: Run the Database Migration

Open Supabase Dashboard → SQL Editor and run this entire script:

```sql
-- =====================================================
-- Migration: Fix RLS Policies for Admin Access
-- =====================================================

-- 1. Fix Bookings RLS - Add admin update policy
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

-- 2. Update super admin policies to support 'admin' role (backwards compatibility)
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

-- 3. Create or update profiles table
DO $$
BEGIN
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_view_own ON profiles;
CREATE POLICY profiles_view_own ON profiles
    FOR SELECT
    USING (auth.uid() = id);

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

-- 4. Create trigger to sync auth.users to profiles
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Sync existing users to profiles
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
```

### Step 3: Restart Your Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
pnpm dev
```

## Verify the Fix

1. **Test as Regular User:**
   - Go to `/dashboard`
   - Should see your bookings without errors

2. **Test as Admin:**
   - Go to `/admin`
   - Should see dashboard without permission errors
   - Go to `/admin/users`
   - Should be able to view and manage users

## What This Fix Does

### Code Changes (Already Applied)

1. ✅ Added `createServiceRoleClient()` to [lib/supabase/server.ts](lib/supabase/server.ts)
2. ✅ Updated [lib/actions/users.ts](lib/actions/users.ts) to use service role for admin operations

### Database Changes (You Need to Run)

1. Creates a `profiles` table to avoid querying `auth.users` directly
2. Sets up auto-sync trigger from `auth.users` to `profiles`
3. Fixes all RLS policies to support both `super_admin` and `admin` roles
4. Adds missing update policies for bookings

## If You Still Get Errors

### "SUPABASE_SERVICE_ROLE_KEY is not set"

- Make sure you added the key to `.env.local`
- Restart your dev server after adding it

### "permission denied for table users"

- Run the SQL migration in Supabase Dashboard
- Verify the `profiles` table was created: `SELECT * FROM profiles;`

### Need to Create Super Admin?

If you need to create your first super admin user, run this in Supabase SQL Editor:

```sql
-- Replace with your actual email
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'your-email@example.com';
```

## Summary

The files I've already updated for you:
- ✅ `lib/supabase/server.ts` - Added service role client
- ✅ `lib/actions/users.ts` - Uses service role for admin operations
- ✅ `supabase/migrations/fix_rls_policies.sql` - Full migration file
- ✅ `docs/RLS_PERMISSION_FIX.md` - Detailed documentation

What you need to do:
1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
2. Run the SQL migration in Supabase Dashboard
3. Restart dev server

That's it! Your permission errors should be resolved.
