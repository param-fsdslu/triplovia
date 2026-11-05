# Password Management Guide

## Quick Reference

### Change User Password via SQL

**File:** `supabase/scripts/change_user_password.sql`

```sql
-- Change password by email
UPDATE auth.users
SET
    encrypted_password = crypt('NewPassword123!', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'user@example.com';
```

---

## Methods to Change Password

### Method 1: Using Supabase Dashboard (Recommended)

**Best for production and most secure.**

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Authentication** → **Users**
3. Find the user and click the **...** menu
4. Select **Reset Password**
5. User receives an email with reset link

**Pros:**
- ✅ Secure and audited
- ✅ User receives email notification
- ✅ Follows security best practices
- ✅ No SQL knowledge required

---

### Method 2: Using SQL Editor

**Best for development or urgent admin resets.**

1. Go to Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Use this template:

```sql
-- Find the user first
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'user@example.com';

-- Change their password
UPDATE auth.users
SET
    encrypted_password = crypt('YourNewPassword123!', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'user@example.com';
```

4. Click **Run**
5. Notify the user of their new password

**Pros:**
- ✅ Immediate effect
- ✅ No email needed
- ✅ Works when email is unavailable

**Cons:**
- ⚠️ Requires SQL access
- ⚠️ No automatic user notification
- ⚠️ Less secure (password visible in logs)

---

### Method 3: Using Supabase CLI

**Best for automation and scripts.**

```bash
# Reset password via CLI
supabase auth admin reset-password user@example.com

# Or using the REST API
curl -X POST 'https://your-project.supabase.co/auth/v1/admin/users/{user-id}' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"password": "new_password_here"}'
```

---

## Common Scenarios

### Scenario 1: Admin Forgot Password

```sql
-- List all admins first
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE raw_user_meta_data->>'role' IN ('super_admin', 'hotel_admin')
ORDER BY created_at DESC;

-- Reset specific admin password
UPDATE auth.users
SET encrypted_password = crypt('AdminPass123!', gen_salt('bf'))
WHERE email = 'admin@honnavar-travels.com';
```

### Scenario 2: New Super Admin Setup

```sql
-- Create super admin with initial password
-- (This is done via user management UI, but here's the SQL equivalent)

-- First, create the user via Supabase Dashboard or signup
-- Then update their role and password:
UPDATE auth.users
SET
    encrypted_password = crypt('SuperAdminPass123!', gen_salt('bf')),
    raw_user_meta_data = jsonb_set(
        raw_user_meta_data,
        '{role}',
        '"super_admin"'
    )
WHERE email = 'superadmin@honnavar-travels.com';
```

### Scenario 3: Bulk Password Reset (Development Only)

```sql
-- Reset all test user passwords
UPDATE auth.users
SET encrypted_password = crypt('TestPass123', gen_salt('bf'))
WHERE email LIKE '%@test.com';
```

### Scenario 4: Force User Logout After Password Change

```sql
-- Change password
UPDATE auth.users
SET encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
WHERE email = 'user@example.com';

-- Delete all their sessions (forces re-login)
DELETE FROM auth.sessions
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'user@example.com'
);
```

---

## Password Requirements

### Current Supabase Defaults
- Minimum length: **6 characters**
- No complexity requirements by default

### Recommended Requirements
- Minimum length: **12 characters**
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Good Password Examples
- `HonnavarTravel2025!`
- `SuperAdmin@HT123`
- `MySecure#Pass2024`

### Bad Password Examples
- ❌ `password` (too simple)
- ❌ `12345678` (no letters)
- ❌ `admin` (too short)

---

## Security Best Practices

### 1. Never Store Passwords in Plain Text
```sql
-- ❌ NEVER DO THIS
UPDATE auth.users SET password = 'plaintext';

-- ✅ ALWAYS DO THIS
UPDATE auth.users
SET encrypted_password = crypt('password', gen_salt('bf'));
```

### 2. Use Temporary Passwords
When resetting passwords for users, use temporary passwords and force them to change on first login.

### 3. Rotate Admin Passwords Regularly
```sql
-- Schedule to run every 90 days
UPDATE auth.users
SET encrypted_password = crypt('NewQuarterlyPass!', gen_salt('bf'))
WHERE raw_user_meta_data->>'role' = 'super_admin';
```

### 4. Audit Password Changes
```sql
-- View recent password changes
SELECT
    id,
    email,
    updated_at,
    raw_user_meta_data->>'role' as role
FROM auth.users
WHERE updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

---

## Troubleshooting

### Issue: "crypt function not found"

**Solution:** Ensure the `pgcrypto` extension is enabled:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Issue: "permission denied for table auth.users"

**Solution:** You need to run queries as a superuser. Use:
- Supabase Dashboard SQL Editor (has superuser access)
- Service role key with admin API

### Issue: User still can't login after password change

**Possible causes:**
1. Typo in password
2. Email not verified
3. User account locked

**Debug steps:**
```sql
-- Check user status
SELECT
    id,
    email,
    email_confirmed_at,
    banned_until,
    updated_at
FROM auth.users
WHERE email = 'user@example.com';

-- Confirm email if needed
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

---

## Using the Script

### Step 1: Open SQL Editor
1. Go to your Supabase project
2. Click **SQL Editor** in the sidebar
3. Click **New Query**

### Step 2: List Users
```sql
SELECT
    id,
    email,
    raw_user_meta_data->>'role' as role,
    email_confirmed_at,
    created_at
FROM auth.users
ORDER BY created_at DESC;
```

### Step 3: Change Password
```sql
-- Replace with actual email and password
UPDATE auth.users
SET
    encrypted_password = crypt('NewPassword123!', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'user@example.com';
```

### Step 4: Verify
```sql
-- Check the update
SELECT
    email,
    updated_at,
    raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'user@example.com';
```

### Step 5: Test Login
- Try logging in with the new password
- Verify access to appropriate admin sections

---

## Alternative: Using Application UI

### For Super Admins
You can create a password change feature in the admin panel:

**Route:** `/admin/users/[id]/change-password`

This would:
1. ✅ Log the change
2. ✅ Send notification email
3. ✅ Require current password verification
4. ✅ Enforce password policies

---

## Quick Command Reference

```sql
-- List all users
SELECT id, email, raw_user_meta_data->>'role' FROM auth.users;

-- Change password
UPDATE auth.users
SET encrypted_password = crypt('NewPass123!', gen_salt('bf'))
WHERE email = 'user@example.com';

-- Force logout
DELETE FROM auth.sessions WHERE user_id = 'user-uuid';

-- Verify email
UPDATE auth.users SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';

-- Check password change time
SELECT email, updated_at FROM auth.users
WHERE email = 'user@example.com';
```

---

## Important Notes

1. **Always backup before bulk operations**
   ```sql
   -- Backup auth.users table
   CREATE TABLE auth.users_backup AS SELECT * FROM auth.users;
   ```

2. **Test in development first**
   - Never run untested queries in production
   - Verify on a single user before bulk updates

3. **Notify users**
   - Always inform users when their password changes
   - Provide clear instructions for new passwords

4. **Document changes**
   - Keep a log of password resets
   - Note the reason for each change

---

## Related Documentation

- [User Management Guide](USER_MANAGEMENT_GUIDE.md)
- [Admin Role System](ADMIN_ROLE_SYSTEM.md)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

---

## Summary

**Recommended approach for production:**
1. Use Supabase Dashboard for password resets
2. User receives secure email link
3. They set their own new password

**For development/emergencies:**
1. Use SQL script from this guide
2. Change password directly in database
3. Notify user manually of new credentials

The SQL script in `supabase/scripts/change_user_password.sql` provides ready-to-use templates for all common password management scenarios.
