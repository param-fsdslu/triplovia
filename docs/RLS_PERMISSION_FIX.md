# RLS Permission Issues Fix

## Problems Identified

1. **Permission denied for table users** - Bookings and admin dashboard trying to access `users` table with RLS blocking it
2. **User not allowed** - Admin user management using `supabase.auth.admin` methods without service role key
3. Missing backward compatibility for 'admin' role in RLS policies

## Solutions Applied

### 1. Database Migration: Fix RLS Policies

Run the migration file: [supabase/migrations/fix_rls_policies.sql](../supabase/migrations/fix_rls_policies.sql)

This migration:
- Adds update policies for bookings (super_admin and hotel_admin)
- Updates all RLS policies to support both `'super_admin'` and `'admin'` roles (backward compatibility)
- Creates a `profiles` table in public schema to avoid querying `auth.users` directly
- Sets up triggers to sync `auth.users` to `profiles` automatically
- Adds proper RLS policies for the profiles table

### 2. Service Role Client

Added a new service role client in [lib/supabase/server.ts](../lib/supabase/server.ts):

```typescript
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

**IMPORTANT:** The service role key bypasses RLS, so it should only be used in secure server-side contexts after proper authorization checks.

### 3. Updated User Management Actions

Modified [lib/actions/users.ts](../lib/actions/users.ts) to use `createServiceRoleClient()` instead of `createClient()` for admin operations:

- `getAllAdminUsers()` - Uses service role to list all users
- `createAdminUser()` - Uses service role to create new admin users
- `updateAdminUser()` - Uses service role to update user metadata
- `deleteAdminUser()` - Uses service role to delete users

All functions still enforce authorization via `requireSuperAdmin()` before using the service role client.

## How to Apply the Fix

### Step 1: Add Service Role Key to Environment

Add the following to your `.env.local` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find your service role key in:
- Supabase Dashboard → Settings → API → Project API keys → `service_role` key

**WARNING:** Never commit this key to git or expose it to the client side!

### Step 2: Run the Database Migration

Option A - Using Supabase CLI:
```bash
supabase db push
```

Option B - Manually in Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Open the file `supabase/migrations/fix_rls_policies.sql`
3. Copy and paste the entire content
4. Click "Run"

### Step 3: Restart Your Development Server

```bash
npm run dev
# or
pnpm dev
```

### Step 4: Verify the Fix

1. **Test Dashboard Access:**
   - Navigate to `/dashboard` as a regular user
   - Should see user's own bookings without permission errors

2. **Test Admin Dashboard:**
   - Navigate to `/admin` as an admin user
   - Should see recent activity without permission errors

3. **Test User Management:**
   - Navigate to `/admin/users` as a super admin
   - Should see all admin users without "User not allowed" error
   - Try creating, updating, and deleting users

## What Changed

### Database Level

1. **New `profiles` Table:**
   - Public table that mirrors admin user data from `auth.users`
   - Auto-synced via trigger
   - Has proper RLS policies for admin access

2. **Updated RLS Policies:**
   - All policies now support both `'super_admin'` and `'admin'` roles
   - Added missing update policies for bookings
   - Added public read policies for rooms

### Application Level

1. **Service Role Client:**
   - New client that bypasses RLS for admin operations
   - Only used after proper authorization checks
   - Required for `auth.admin` methods

2. **User Management:**
   - All admin user operations now use service role client
   - Maintains security through `requireSuperAdmin()` checks

## Security Considerations

### Service Role Key Safety

The service role key has **full access** to your database and bypasses all RLS policies. To use it safely:

1. ✅ **DO:**
   - Store in environment variables
   - Use only in server-side code
   - Always check authorization first (`requireSuperAdmin()`, etc.)
   - Use for admin operations that need to bypass RLS

2. ❌ **DON'T:**
   - Commit to git
   - Expose to client-side
   - Use without authorization checks
   - Use for regular user operations

### Authorization Flow

```typescript
// CORRECT Usage
export async function adminOperation() {
  await requireSuperAdmin() // ✅ Check authorization first
  const supabase = createServiceRoleClient() // ✅ Then use service role
  // ... perform admin operation
}

// WRONG Usage
export async function adminOperation() {
  const supabase = createServiceRoleClient() // ❌ No authorization check!
  // ... perform admin operation - SECURITY RISK!
}
```

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY is not set"

**Solution:** Add the service role key to your `.env.local` file and restart the dev server.

### Still getting "permission denied for table users"

**Solution:**
1. Verify the migration was applied successfully
2. Check if `profiles` table exists: `SELECT * FROM profiles LIMIT 1;`
3. Verify the trigger is working: Check if profiles are being created

### Users not syncing to profiles table

**Solution:** Run this in SQL Editor:
```sql
-- Manually sync all users
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

### Admin operations still failing

**Solution:**
1. Verify you're logged in as a super admin
2. Check user metadata: `SELECT raw_user_meta_data FROM auth.users WHERE email = 'your@email.com';`
3. Ensure role is set to `'super_admin'` or `'admin'`

## Files Changed

1. ✅ `supabase/migrations/fix_rls_policies.sql` (NEW)
2. ✅ `lib/supabase/server.ts` (MODIFIED)
3. ✅ `lib/actions/users.ts` (MODIFIED)

## Next Steps

After applying these fixes:

1. Test all admin functionalities
2. Test regular user functionalities
3. Monitor server logs for any remaining permission errors
4. Consider adding more granular permissions if needed

## Related Documentation

- [Admin Role System](./ADMIN_ROLE_SYSTEM.md)
- [Quick Start: Setting Up Admin Roles](./QUICK_START_ROLES.md)
- [User Management Guide](./USER_MANAGEMENT_GUIDE.md)
