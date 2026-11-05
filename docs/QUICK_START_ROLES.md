# Quick Start: Setting Up Admin Roles

## Step 1: Run the Database Migration

First, apply the database migration to add the necessary schema changes:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the migration file in Supabase SQL Editor
# File: supabase/migrations/add_hotel_ownership.sql
```

## Step 2: Create Your First Super Admin

Open the Supabase SQL Editor and run:

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

## Step 3: Use the User Management UI (Recommended)

Once you have a super admin account set up, you can manage all other admin users through the web interface!

1. Login as super admin
2. Navigate to **Admin Panel → Users** (`/admin/users`)
3. Click **"Create Admin User"**
4. Fill in the form:
   - Email and password
   - Select role (Super Admin or Hotel Admin)
   - For Hotel Admins: Select which hotels to assign
5. Click **"Create User"**

### Benefits of Using the UI
- ✅ No SQL required
- ✅ Visual hotel selection
- ✅ Automatic hotel ownership management
- ✅ Edit and delete users
- ✅ See all admin users at a glance

---

## Alternative: Create a Hotel Admin via SQL (Manual Method)

If you prefer SQL or need to script user creation:

### Get a Hotel ID

```sql
-- List available hotels
SELECT id, name, city FROM hotels;
```

### Assign Hotel Admin Role

```sql
-- Replace with actual email and hotel ID
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'hotel_admin',
  'hotel_ids', jsonb_build_array('YOUR-HOTEL-UUID-HERE')
)
WHERE email = 'hotelowner@example.com';

-- Link the hotel to this user
UPDATE hotels
SET owner_id = (SELECT id FROM auth.users WHERE email = 'hotelowner@example.com')
WHERE id = 'YOUR-HOTEL-UUID-HERE';
```

## Step 4: Test the Setup

1. **Login as Super Admin:**
   - You should see all menu items (Dashboard, Bookings, Hotels, Payments, Refunds, Analytics, Users, Settings)
   - You should see all hotels in the system
   - You should see all bookings

2. **Login as Hotel Admin:**
   - You should see limited menu items (no Analytics or Users)
   - You should only see your assigned hotel(s)
   - You should only see bookings for your hotel(s)

## Step 5: Verify Data Isolation

Test that hotel admins cannot access other hotels' data:

1. Login as hotel admin
2. Try to view bookings - should only show your hotel
3. Navigate to hotels page - should only show your hotel
4. The system should automatically filter all data

## Common Commands

### Check User Roles

```sql
SELECT
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->'hotel_ids' as hotel_ids
FROM auth.users
WHERE raw_user_meta_data->>'role' IN ('super_admin', 'hotel_admin');
```

### List All Hotel Admins and Their Hotels

```sql
SELECT
  u.email,
  u.raw_user_meta_data->>'role' as role,
  h.id as hotel_id,
  h.name as hotel_name
FROM auth.users u
LEFT JOIN hotels h ON h.owner_id = u.id
WHERE u.raw_user_meta_data->>'role' = 'hotel_admin';
```

### Remove Admin Access

```sql
-- Remove all admin access
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role' - 'hotel_ids'
WHERE email = 'user@example.com';
```

### Change Role

```sql
-- Convert hotel_admin to super_admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('role', 'super_admin')
WHERE email = 'user@example.com';

-- Convert super_admin to hotel_admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'hotel_admin',
  'hotel_ids', jsonb_build_array('hotel-uuid-here')
)
WHERE email = 'user@example.com';
```

## Troubleshooting

**Can't login to admin panel:**
- Check if user exists: `SELECT email, raw_user_meta_data FROM auth.users WHERE email = 'your@email.com';`
- Verify role is set correctly
- Clear browser cache and cookies

**Hotel admin sees no data:**
- Check `hotel_ids` array is set correctly
- Verify hotel `owner_id` matches user ID
- Ensure migration was applied successfully

**RLS errors:**
- Make sure migration was applied
- Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- Verify policies exist: `SELECT * FROM pg_policies WHERE schemaname = 'public';`

## Next Steps

- Read the full documentation: `docs/ADMIN_ROLE_SYSTEM.md`
- Create additional hotel admins as needed
- Test the permission system thoroughly
- Consider creating a UI for role management

## Need Help?

Check the main documentation or review the implementation in:
- `lib/utils/roles.ts` - Role utilities
- `lib/utils/admin.ts` - Admin utilities
- `lib/actions/admin.ts` - Admin actions with filtering
