-- =====================================================
-- Change User Password Script
-- =====================================================
-- Description: Update a user's password in Supabase Auth
-- Usage: Replace the email and new password before running
-- =====================================================

-- Method 1: Change password by email
-- Replace 'user@example.com' with the actual email
-- Replace 'new_password_here' with the new password
UPDATE auth.users
SET
    encrypted_password = crypt('new_password_here', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'user@example.com';

-- Verify the update
SELECT
    id,
    email,
    created_at,
    updated_at,
    raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'user@example.com';

-- =====================================================
-- Method 2: Change password by user ID
-- =====================================================

-- UPDATE auth.users
-- SET
--     encrypted_password = crypt('new_password_here', gen_salt('bf')),
--     updated_at = NOW()
-- WHERE id = 'user-uuid-here';

-- =====================================================
-- Method 3: Reset password for multiple users (admin)
-- =====================================================

-- Change password for all super admins (use with caution!)
-- UPDATE auth.users
-- SET
--     encrypted_password = crypt('new_admin_password', gen_salt('bf')),
--     updated_at = NOW()
-- WHERE raw_user_meta_data->>'role' = 'super_admin';

-- =====================================================
-- Method 4: List all users with their roles
-- =====================================================

-- Use this to find the user you want to update
SELECT
    id,
    email,
    created_at,
    email_confirmed_at,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name
FROM auth.users
ORDER BY created_at DESC;

-- =====================================================
-- Method 5: Create a temporary reset token (alternative)
-- =====================================================

-- This generates a password reset token (use Supabase dashboard instead)
-- Not recommended for direct SQL execution
-- Better to use: Supabase Dashboard > Authentication > Users > ... > Reset Password

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================

-- 1. Password Hashing:
--    Supabase uses bcrypt (bf) to hash passwords
--    The crypt() function handles the hashing automatically

-- 2. Security:
--    - Never store passwords in plain text
--    - Use strong passwords (min 8 characters, mixed case, numbers, symbols)
--    - Consider using the Supabase Dashboard for password resets in production

-- 3. After changing password:
--    - User will need to log in with the new password
--    - All existing sessions remain valid until they expire
--    - To force logout, you can delete their sessions:
--    -- DELETE FROM auth.sessions WHERE user_id = 'user-uuid-here';

-- 4. Password Requirements:
--    - Minimum 6 characters (Supabase default)
--    - Recommended: 12+ characters with complexity

-- =====================================================
-- Common Use Cases
-- =====================================================

-- Case 1: Admin forgot password
-- UPDATE auth.users
-- SET encrypted_password = crypt('NewSecurePassword123!', gen_salt('bf'))
-- WHERE email = 'admin@example.com';

-- Case 2: Reset user password and notify them
-- UPDATE auth.users
-- SET encrypted_password = crypt('TemporaryPass123!', gen_salt('bf'))
-- WHERE email = 'user@example.com';
-- Then notify user to change password on first login

-- Case 3: Bulk password reset for testing/development
-- UPDATE auth.users
-- SET encrypted_password = crypt('DevPassword123', gen_salt('bf'))
-- WHERE email LIKE '%@test.com';

-- =====================================================
-- END OF SCRIPT
-- =====================================================
