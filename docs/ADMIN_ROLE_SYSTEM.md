# Admin Role-Based Access Control System

## Overview

The admin panel now supports two distinct roles with different access levels:

1. **Super Admin** - Full system access (view/manage all hotels and data)
2. **Hotel Admin** - Limited access (manage only their assigned hotels)

## Roles Explained

### Super Admin (`super_admin`)

**Access Level:** Full system access

**Capabilities:**
- View and manage **all hotels** in the system
- View **all bookings** across all hotels
- View **all payments and refunds** system-wide
- Access global **analytics** dashboard
- Manage **user accounts** and assign roles
- Create and assign hotel admins
- Full CRUD operations on all resources

**Use Case:** Platform administrators, system owners, support staff

---

### Hotel Admin (`hotel_admin`)

**Access Level:** Limited to assigned hotels only

**Capabilities:**
- View and manage **only their assigned hotels**
- View **bookings** for their hotels only
- View **payments and refunds** for their hotels only
- Manage hotel details (rooms, pricing, availability, amenities)
- Update booking statuses for their hotels
- **Cannot** see other hotels or their data
- **Cannot** access global analytics
- **Cannot** manage other users

**Use Case:** Hotel owners, property managers, hotel staff

---

## Database Schema

### Migration Applied

The following database changes have been implemented:

```sql
-- Add owner_id to hotels table
ALTER TABLE hotels
ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Row Level Security policies added for:
- hotels
- room_types
- rooms
- bookings
- payments
```

### User Metadata Structure

Roles are stored in Supabase Auth `user_metadata`:

```json
{
  "role": "super_admin" | "hotel_admin",
  "hotel_ids": ["uuid-1", "uuid-2"]  // Only for hotel_admin
}
```

---

## How to Assign Roles

### Method 1: Via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click on the user you want to modify
3. Edit their `user_metadata` JSON:

**For Super Admin:**
```json
{
  "role": "super_admin"
}
```

**For Hotel Admin:**
```json
{
  "role": "hotel_admin",
  "hotel_ids": ["hotel-uuid-1", "hotel-uuid-2"]
}
```

### Method 2: Via SQL (Database)

**Create a Super Admin:**
```sql
-- Update user metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'admin@example.com';
```

**Create a Hotel Admin:**
```sql
-- First, get the hotel ID
SELECT id FROM hotels WHERE name = 'Hotel Name';

-- Then update user metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"hotel_admin"'
  ),
  '{hotel_ids}',
  '["hotel-uuid-here"]'::jsonb
)
WHERE email = 'hotelowner@example.com';

-- Also set owner_id on the hotel
UPDATE hotels
SET owner_id = (SELECT id FROM auth.users WHERE email = 'hotelowner@example.com')
WHERE id = 'hotel-uuid-here';
```

---

## Implementation Details

### Key Files Modified

1. **Database:**
   - `supabase/migrations/add_hotel_ownership.sql` - Migration file
   - `supabase/supabase.database.types.ts` - Updated types

2. **Utilities:**
   - `lib/utils/roles.ts` - Role management utilities (NEW)
   - `lib/utils/admin.ts` - Enhanced admin utilities

3. **Actions:**
   - `lib/actions/admin.ts` - All admin actions now filter by role

4. **UI Components:**
   - `app/admin/layout.tsx` - Role-based layout
   - `components/admin/AdminNav.tsx` - Dynamic navigation

### How Data Filtering Works

All admin actions automatically filter data based on the user's role:

```typescript
// Example: Getting bookings
const adminAccess = await getAdminHotelAccess()

// Super admin: hotelIds = null (all hotels)
// Hotel admin: hotelIds = ["uuid-1", "uuid-2"]

let query = supabase.from('bookings').select('*')

if (adminAccess.hotelIds !== null) {
  // Filter for hotel admin
  query = query.in('hotel_id', adminAccess.hotelIds)
}
// Super admin sees everything (no filter applied)
```

### Navigation

Navigation items are filtered based on role:

- **Dashboard** - Both roles
- **Bookings** - Both roles (filtered by hotel)
- **Hotels** - Both roles (filtered by hotel)
- **Payments** - Both roles (filtered by hotel)
- **Refunds** - Both roles (filtered by hotel)
- **Analytics** - Super Admin only
- **Users** - Super Admin only
- **Settings** - Both roles

---

## Testing the System

### 1. Create a Super Admin User

```sql
-- Create or update a super admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'your-super-admin@example.com';
```

**Test:**
- Login and verify you can see all hotels
- Check that you can access all navigation items
- Verify you can see all bookings and payments

### 2. Create a Hotel Admin User

```sql
-- First, get a hotel ID
SELECT id, name FROM hotels LIMIT 1;

-- Create/update hotel admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'hotel_admin',
  'hotel_ids', jsonb_build_array('your-hotel-uuid-here')
)
WHERE email = 'hotel-admin@example.com';

-- Link hotel to owner
UPDATE hotels
SET owner_id = (SELECT id FROM auth.users WHERE email = 'hotel-admin@example.com')
WHERE id = 'your-hotel-uuid-here';
```

**Test:**
- Login and verify you can only see your assigned hotel(s)
- Check that "Analytics" and "Users" menu items are hidden
- Verify you can only see bookings for your hotel
- Try to access another hotel's data (should be blocked)

---

## Security Features

### Row Level Security (RLS)

RLS policies ensure data isolation at the database level:

1. **Hotels Table:** Users can only query hotels they own (or all if super admin)
2. **Bookings Table:** Users can only see bookings for their hotels
3. **Payments Table:** Users can only see payments for their hotel's bookings
4. **Room Types & Rooms:** Filtered by hotel ownership

### Authorization Checks

Every admin action includes:
```typescript
await requireAdmin() // Check user has admin role
const adminAccess = await getAdminHotelAccess() // Get access level
await verifyHotelAccess(hotelId) // Verify specific hotel access
```

### Access Denial

When a hotel admin tries to access unauthorized data:
- API returns error: `"You do not have access to this hotel"`
- UI hides/disables actions they cannot perform
- Database RLS blocks unauthorized queries

---

## Migration Guide

### Existing 'admin' Users

Users with the old `role: 'admin'` are automatically treated as `super_admin` for backwards compatibility.

To migrate explicitly:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  '"super_admin"'
)
WHERE raw_user_meta_data->>'role' = 'admin';
```

### Assigning Hotels to Existing Admins

If you want to convert an existing super admin to a hotel admin:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(
    raw_user_meta_data,
    '{role}',
    '"hotel_admin"'
  ),
  '{hotel_ids}',
  '["hotel-uuid-1", "hotel-uuid-2"]'::jsonb
)
WHERE email = 'user@example.com';
```

---

## Best Practices

### 1. Principle of Least Privilege
- Only assign `super_admin` role to trusted platform administrators
- Use `hotel_admin` for all hotel owners/managers

### 2. Regular Audits
- Periodically review user roles and access levels
- Remove hotel_ids from users who no longer manage those hotels

### 3. Hotel Ownership
- Always set `owner_id` on hotels when assigning to hotel admins
- Keep `user_metadata.hotel_ids` in sync with actual ownership

### 4. Testing Access
- Test both roles thoroughly after any changes
- Verify data isolation works correctly
- Check that unauthorized access is properly blocked

---

## API Reference

### Role Utility Functions

```typescript
// Check role type
isSuperAdmin(user: User): boolean
isHotelAdmin(user: User): boolean
isAnyAdmin(user: User): boolean

// Get role information
getAdminRole(user: User): AdminRole | null
getUserHotelIds(user: User): string[] | null
hasHotelAccess(user: User, hotelId: string): boolean

// Display
getRoleDisplayName(role: AdminRole): string

// Permissions
canPerformAction(user: User, action: string): boolean
```

### Admin Utility Functions

```typescript
// Server-side checks (use in Server Actions)
await checkIsSuperAdmin(): Promise<boolean>
await checkIsHotelAdmin(): Promise<boolean>
await getAdminUser()
await requireAdmin()
await requireSuperAdmin()
await requireHotelAdmin()
await getAdminHotelAccess()
await checkHotelAccess(hotelId: string): Promise<boolean>
await requireHotelAccess(hotelId: string)
```

---

## Troubleshooting

### Issue: Hotel admin can't see any data

**Solution:**
1. Check `user_metadata.hotel_ids` is correctly set
2. Verify `hotels.owner_id` matches the user's ID
3. Ensure the hotel IDs in metadata are valid UUIDs
4. Check RLS policies are enabled on tables

### Issue: Super admin is blocked from viewing data

**Solution:**
1. Verify `user_metadata.role` is exactly `"super_admin"`
2. Check there are no RLS policies blocking super admins
3. Clear browser cache and re-login

### Issue: Can't update role in Supabase Dashboard

**Solution:**
Use SQL method:
```sql
UPDATE auth.users
SET raw_user_meta_data = '{"role": "super_admin"}'::jsonb
WHERE email = 'user@example.com';
```

---

## Future Enhancements

Potential improvements to consider:

1. **UI for Role Management** - Create admin interface to assign roles
2. **Multi-Hotel Assignment** - UI to assign multiple hotels to hotel admins
3. **Granular Permissions** - Fine-tune permissions per hotel admin
4. **Audit Logs** - Track all admin actions
5. **Hotel Transfer** - Transfer hotel ownership between users
6. **Role Hierarchy** - Add more role levels (e.g., "hotel_staff")

---

## Support

For questions or issues with the role system:
1. Check this documentation
2. Review the implementation in `lib/utils/roles.ts`
3. Test with the SQL examples above
4. Check Supabase logs for RLS policy errors
