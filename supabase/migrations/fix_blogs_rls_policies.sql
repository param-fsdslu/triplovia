-- =====================================================
-- Fix Blogs RLS Policies
-- =====================================================
-- Description: Updates RLS policies to use helper function instead of querying auth.users directly
-- Created: 2026-01-15
-- =====================================================

-- First, create a helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Try to get role from JWT claims user_metadata
    BEGIN
        user_role := current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role';
    EXCEPTION WHEN OTHERS THEN
        user_role := NULL;
    END;

    -- If not found in JWT, check auth.users table
    IF user_role IS NULL THEN
        SELECT u.raw_user_meta_data->>'role' INTO user_role
        FROM auth.users u
        WHERE u.id = auth.uid();
    END IF;

    RETURN COALESCE(user_role = 'super_admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS blogs_super_admin_all ON blogs;
DROP POLICY IF EXISTS blog_images_super_admin_all ON blog_images;

-- Recreate blogs policy using the helper function
CREATE POLICY blogs_super_admin_all ON blogs
    FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Recreate blog_images policy using the helper function
CREATE POLICY blog_images_super_admin_all ON blog_images
    FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated, anon;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
