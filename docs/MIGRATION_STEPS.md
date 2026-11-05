# Migration Steps for Admin Role System

Follow these steps to deploy the role-based access control system.

## Prerequisites

- Access to Supabase Dashboard or Supabase CLI
- Database admin credentials
- At least one user account to test with

---

## Step 1: Apply Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/add_hotel_ownership.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl+Enter`
7. Verify success message appears

### Option B: Using Supabase CLI

```bash
# Navigate to project root
cd d:/2025/honnavar-travels

# Push migration to database
supabase db push

# Or apply specific migration
supabase migration up
```

### Verify Migration

Run this query to confirm the migration was successful:

```sql
-- Check if owner_id column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'hotels' AND column_name = 'owner_id';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('hotels', 'bookings', 'payments', 'room_types', 'rooms');

-- Check if policies were created
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected results:
- `owner_id` column exists on `hotels` table
- RLS is enabled (`rowsecurity = true`) on key tables
- Multiple policies exist (e.g., `hotels_super_admin_all`, `hotels_admin_own`, etc.)

---

## Step 2: Update Your Application Code

The code changes are already in place, but verify these files exist:

```bash
# Check new files
ls lib/utils/roles.ts
ls docs/ADMIN_ROLE_SYSTEM.md
ls docs/QUICK_START_ROLES.md
ls docs/IMPLEMENTATION_SUMMARY.md

# Check modified files have the updates
grep -n "getAdminRole" lib/utils/admin.ts
grep -n "AdminRole" components/admin/AdminNav.tsx
```

---

## Step 3: Create Your First Super Admin

**IMPORTANT:** Do this immediately after migration to ensure you don't lose admin access!

### Get your user ID
```sql
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';
```

### Assign super_admin role
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'YOUR_EMAIL@example.com';
```

### Verify
```sql
SELECT
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com';
```

Expected output:
```
email                    | role
------------------------+-------------
YOUR_EMAIL@example.com  | super_admin
```

---

## Step 4: Test Super Admin Access

1. **Logout** from your application if currently logged in
2. **Login** with the super admin account
3. Navigate to `/admin`
4. **Verify:**
   - ✅ You can access the admin panel
   - ✅ You see all navigation items (Dashboard, Bookings, Hotels, Payments, Refunds, Analytics, Users, Settings)
   - ✅ The navigation shows "Super Admin" badge
   - ✅ You can see all hotels in the hotels list
   - ✅ You can see all bookings

---

## Step 5: Create a Test Hotel Admin (Optional)

### Get a hotel to assign
```sql
SELECT id, name, city FROM hotels LIMIT 5;
```

### Create/get a test user
```sql
-- Check if user exists
SELECT id, email FROM auth.users WHERE email = 'hoteltest@example.com';

-- If user doesn't exist, create via Supabase Dashboard or your app's signup
```

### Assign hotel_admin role
```sql
-- Replace 'HOTEL_UUID_HERE' with actual hotel ID from above
-- Replace email with your test user email
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'hotel_admin',
  'hotel_ids', jsonb_build_array('HOTEL_UUID_HERE')
)
WHERE email = 'hoteltest@example.com';

-- Set hotel ownership
UPDATE hotels
SET owner_id = (SELECT id FROM auth.users WHERE email = 'hoteltest@example.com')
WHERE id = 'HOTEL_UUID_HERE';
```

### Verify
```sql
SELECT
  u.email,
  u.raw_user_meta_data->>'role' as role,
  u.raw_user_meta_data->'hotel_ids' as hotel_ids,
  h.name as hotel_name
FROM auth.users u
LEFT JOIN hotels h ON h.owner_id = u.id
WHERE u.email = 'hoteltest@example.com';
```

---

## Step 6: Test Hotel Admin Access

1. **Logout** from super admin account
2. **Login** with the hotel admin test account
3. Navigate to `/admin`
4. **Verify:**
   - ✅ You can access the admin panel
   - ✅ Navigation shows "Hotel Admin" badge
   - ✅ "Analytics" and "Users" menu items are HIDDEN
   - ✅ You can only see YOUR assigned hotel(s) in hotels list
   - ✅ You can only see bookings for YOUR hotel(s)
   - ✅ Navigation shows "Managing 1 hotel" (or number of hotels assigned)

5. **Test Data Isolation:**
   - Try to navigate to another hotel's page (should see empty/error)
   - Verify bookings list only shows your hotel's bookings
   - Verify payments only show for your hotel's bookings

---

## Step 7: Convert Existing Admins (If Applicable)

If you have existing admin users with the old `role: 'admin'`, they'll work as super admins automatically. To update them explicitly:

```sql
-- List all old-style admins
SELECT id, email, raw_user_meta_data->>'role' as current_role
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'admin';

-- Convert them to super_admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  '"super_admin"'
)
WHERE raw_user_meta_data->>'role' = 'admin';

-- Verify
SELECT email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE raw_user_meta_data->>'role' IN ('super_admin', 'hotel_admin');
```

---

## Step 8: Deploy to Production

### Before Deploy
- [ ] Migration tested in development
- [ ] Super admin tested and working
- [ ] Hotel admin tested and working
- [ ] Data isolation verified
- [ ] All tests passing

### Deploy Checklist
1. **Backup your database** (Supabase creates automatic backups, but create a manual one)
2. **Apply migration** to production database
3. **Create super admin** in production immediately
4. **Test access** before announcing to users
5. **Monitor for errors** in first 24 hours

### Supabase Production Deployment
```bash
# If using Supabase CLI for production
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or manually run the migration SQL in production SQL editor.

---

## Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```sql
-- Disable RLS (restores full access)
ALTER TABLE hotels DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- Optionally remove owner_id column (if safe)
-- ALTER TABLE hotels DROP COLUMN owner_id;

-- Convert all admins back to old role
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  '"admin"'
)
WHERE raw_user_meta_data->>'role' IN ('super_admin', 'hotel_admin');
```

---

## Monitoring & Validation

### Daily Checks (First Week)
```sql
-- Check active admin users
SELECT
  email,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users
WHERE raw_user_meta_data->>'role' IN ('super_admin', 'hotel_admin')
ORDER BY created_at DESC;

-- Check hotel ownership is set
SELECT
  h.name,
  h.owner_id,
  u.email as owner_email
FROM hotels h
LEFT JOIN auth.users u ON u.id = h.owner_id
WHERE h.owner_id IS NOT NULL;

-- Check for RLS policy errors in logs
-- (Do this in Supabase Dashboard → Logs)
```

---

## Common Issues & Solutions

### Issue: "Unauthorized" error after migration
**Solution:** Create super admin using SQL commands in Step 3

### Issue: Hotel admin sees no data
**Solution:**
1. Check `hotel_ids` array is set correctly
2. Verify `hotels.owner_id` matches user ID
3. Confirm RLS policies are active

### Issue: RLS error "new row violates row-level security"
**Solution:**
```sql
-- Temporarily disable RLS on specific table
ALTER TABLE hotels DISABLE ROW LEVEL SECURITY;

-- Make your changes

-- Re-enable
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
```

### Issue: Can't login to admin panel at all
**Solution:**
```sql
-- Check user's role
SELECT email, raw_user_meta_data FROM auth.users WHERE email = 'YOUR_EMAIL';

-- Fix role if missing
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'YOUR_EMAIL';
```

---

## Post-Migration Tasks

- [ ] Document which users should be super admins vs hotel admins
- [ ] Create hotel admins for each hotel owner
- [ ] Train hotel admins on new limited interface
- [ ] Update user documentation/help articles
- [ ] Set up monitoring for unauthorized access attempts
- [ ] Plan for adding new hotel admins in the future

---

## Success Criteria

Migration is successful when:
- ✅ Super admins can access all data
- ✅ Hotel admins can only access their hotels
- ✅ Data isolation is working (RLS active)
- ✅ No existing functionality is broken
- ✅ All admin users can login
- ✅ Navigation shows/hides correctly per role

---

## Need Help?

1. Review `docs/ADMIN_ROLE_SYSTEM.md` for detailed information
2. Check `docs/QUICK_START_ROLES.md` for common commands
3. Review implementation in `lib/utils/roles.ts` and `lib/utils/admin.ts`
4. Check Supabase logs for RLS policy errors

---

**Next:** After successful migration, see `docs/QUICK_START_ROLES.md` for day-to-day role management.
