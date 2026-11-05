# User Management Guide

## Overview

Super admins can manage all admin users through the **User Management** interface at `/admin/users`.

This page allows you to:
- ✅ Create new admin users (Super Admin or Hotel Admin)
- ✅ Assign hotels to Hotel Admins
- ✅ Edit existing admin users
- ✅ Change user roles and hotel assignments
- ✅ Delete admin users
- ✅ View all admin users at a glance

---

## Accessing User Management

### Requirements
- You must be logged in as a **Super Admin**
- Hotel Admins cannot access this page

### Navigation
1. Login to the admin panel
2. Click **"Users"** in the sidebar navigation
3. Or navigate directly to: `/admin/users`

---

## Creating Admin Users

### Step-by-Step

1. **Click "Create Admin User"** button in the top right
2. **Fill in the form:**
   - **Email**: The user's email address (must be unique)
   - **Password**: Minimum 8 characters (user can change later)
   - **Role**: Select either:
     - **Super Admin** - Full system access
     - **Hotel Admin** - Limited to assigned hotels

3. **For Hotel Admins Only:**
   - **Assign Hotels**: Check the hotels this admin should manage
   - You must select at least one hotel
   - Hotels already assigned to other admins will show a warning

4. **Click "Create User"**

### What Happens Behind the Scenes

When you create a user:
1. ✅ User account is created in Supabase Auth
2. ✅ Role is set in user metadata
3. ✅ For Hotel Admins: Hotel IDs are stored in user metadata
4. ✅ For Hotel Admins: `hotels.owner_id` is updated to link hotels to the user
5. ✅ Email confirmation is automatically set (no verification email needed)

---

## Editing Admin Users

### Step-by-Step

1. **Find the user** in the users table
2. **Click the "⋮" menu** (three dots) on the right
3. **Select "Edit User"**
4. **Update information:**
   - Email address
   - Password (leave blank to keep current)
   - Role
   - Hotel assignments (for Hotel Admins)
5. **Click "Save Changes"**

### Role Changes

**Super Admin → Hotel Admin:**
- User loses access to global features (Analytics, Users)
- Must assign at least one hotel
- User will only see their assigned hotels

**Hotel Admin → Super Admin:**
- User gains access to all features and all hotels
- Hotel assignments are removed
- Previous hotel ownerships are cleared

### Hotel Assignment Changes

**Adding Hotels:**
- Hotels are linked to the user via `owner_id`
- User immediately gains access to the new hotel

**Removing Hotels:**
- Hotel `owner_id` is set to `null` (unassigned)
- User loses access to that hotel
- Must have at least one hotel remaining (for Hotel Admins)

---

## Deleting Admin Users

### Step-by-Step

1. **Find the user** in the users table
2. **Click the "⋮" menu** (three dots) on the right
3. **Select "Delete User"**
4. **Confirm deletion** in the dialog

### What Happens When Deleting

- ✅ User account is permanently deleted from Supabase Auth
- ✅ User can no longer login
- ✅ Any hotels assigned to this user become unassigned (`owner_id = null`)
- ❌ User data cannot be recovered (this is permanent!)

### ⚠️ Important Notes

- **Cannot undo**: User deletion is permanent
- **Hotels become unassigned**: You'll need to reassign them to another admin
- **Bookings remain**: All booking history is preserved
- **Consider disabling instead**: There's currently no "disable" feature, but you can change the password to revoke access

---

## Understanding the Users Table

### Column Descriptions

| Column | Description |
|--------|-------------|
| **User** | Email address and verification status |
| **Role** | Super Admin or Hotel Admin badge |
| **Hotels** | For Hotel Admins: List of assigned hotels<br>For Super Admins: "All hotels" |
| **Created** | When the user account was created |
| **Last Sign In** | When the user last logged in (or "Never") |
| **Actions** | Edit and Delete options |

### Status Indicators

- **✓ Verified** (green): Email is confirmed
- **⚠ Unverified** (yellow): Email not yet confirmed (shouldn't happen with UI creation)
- **Managing X hotel(s)**: Shows hotel count for Hotel Admins

---

## Hotel Assignment Interface

### Available Hotels

When assigning hotels to a Hotel Admin, you'll see:

- **Unassigned Hotels**: Available for assignment (no owner)
- **Your Assignments**: Hotels already assigned to this user
- **Other Admins' Hotels**: Shows warning "(Currently assigned)" or "(Assigned to another admin)"

### Multi-Select

- ✅ You can assign multiple hotels to one admin
- ✅ One hotel can only be assigned to one admin at a time
- ✅ You can reassign hotels from one admin to another
- ⚠️ Reassigning removes access for the previous admin

### Best Practices

1. **Group by location**: Assign hotels in the same city/region to one admin
2. **Clear ownership**: Each hotel should have exactly one owner (or none)
3. **Document changes**: Keep track of who manages which hotels
4. **Review regularly**: Periodically audit hotel assignments

---

## Common Workflows

### Onboarding a New Hotel Owner

1. Create hotel listing in system (if not already exists)
2. Create Hotel Admin user:
   - Email: Owner's email
   - Role: Hotel Admin
   - Assign their hotel(s)
3. Send login credentials to the owner (separately, securely)
4. Owner logs in and can manage their hotel

### Transferring Hotel Ownership

**Option 1: Using the UI**
1. Edit the old owner → Remove the hotel from their assignments
2. Edit the new owner → Add the hotel to their assignments

**Option 2: Reassign Directly**
1. Edit the new owner → Select the hotel (it will show warning)
2. Save changes (automatically removes from old owner)

### Promoting Hotel Admin to Super Admin

1. Edit the user
2. Change Role to "Super Admin"
3. Save changes
4. User now has access to all hotels and features

### Adding a New Super Admin

1. Click "Create Admin User"
2. Email and password
3. Role: Super Admin
4. Save
5. Done! (No hotel assignment needed)

---

## Security Considerations

### Password Security

- Minimum 8 characters required
- Use strong, unique passwords
- Consider using a password manager
- Users can change their password after first login (feature to be added)

### Access Control

- **Super Admins**:
  - Can view and modify all users
  - Can delete any user (including other super admins)
  - Use caution when assigning this role

- **Hotel Admins**:
  - Cannot access user management
  - Cannot see other admins
  - Limited to their hotel's data

### Best Practices

1. **Minimum Super Admins**: Only create as many as necessary
2. **Regular Audits**: Review user list monthly
3. **Remove Inactive Users**: Delete accounts for departed staff
4. **Unique Emails**: One email per account (no sharing)
5. **Document Roles**: Keep a record of who has what access

---

## Troubleshooting

### "Failed to create user"

**Possible causes:**
- Email already exists in the system
- Password too short (< 8 characters)
- Hotel Admin with no hotels selected
- Network/database error

**Solution:**
- Check if user already exists
- Use a different email
- Ensure password meets requirements
- Check Supabase logs for errors

### User can't login after creation

**Possible causes:**
- Incorrect password
- Email not verified (shouldn't happen with UI)
- User deleted

**Solution:**
- Use "Edit User" to set a new password
- Verify user exists in users table
- Check Supabase Auth dashboard

### Hotel shows as "Currently assigned" when it shouldn't

**Cause:**
- Hotel's `owner_id` is set but user doesn't have it in `hotel_ids` metadata
- Data inconsistency

**Solution:**
Run this SQL to find and fix:
```sql
-- Find hotels with mismatched ownership
SELECT h.id, h.name, h.owner_id, u.email, u.raw_user_meta_data->'hotel_ids' as metadata_hotels
FROM hotels h
LEFT JOIN auth.users u ON u.id = h.owner_id
WHERE h.owner_id IS NOT NULL;

-- Fix by clearing owner_id if needed
UPDATE hotels SET owner_id = NULL WHERE id = 'PROBLEM-HOTEL-ID';
```

### Can't delete a user

**Possible causes:**
- Database foreign key constraints
- Supabase permissions issue
- User is currently logged in

**Solution:**
- Check Supabase logs
- Try again after user logs out
- Contact support if issue persists

---

## Advanced: API Usage

The user management functionality is built with server actions. You can also use these programmatically:

```typescript
import {
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAllAdminUsers,
  getAvailableHotels,
} from '@/lib/actions/users'

// Create user
const result = await createAdminUser({
  email: 'admin@example.com',
  password: 'SecurePass123',
  role: 'hotel_admin',
  hotelIds: ['hotel-uuid-1', 'hotel-uuid-2'],
})

// Get all users
const { users } = await getAllAdminUsers()

// Update user
await updateAdminUser({
  userId: 'user-uuid',
  email: 'newemail@example.com',
  role: 'super_admin',
})

// Delete user
await deleteAdminUser('user-uuid')
```

---

## Future Enhancements

Potential improvements planned:

- [ ] Bulk user creation (CSV import)
- [ ] User disable/enable (without deletion)
- [ ] Password reset link generation
- [ ] Activity logs per user
- [ ] Email invitation system
- [ ] Two-factor authentication
- [ ] User groups and teams

---

## Summary

The User Management interface makes it easy to:
- ✅ Create admin accounts without SQL
- ✅ Visually assign hotels to admins
- ✅ Edit roles and access levels
- ✅ Maintain system security

**Remember:**
- Only Super Admins can access this feature
- Changes take effect immediately
- Deletions are permanent
- Keep a record of who manages what

For more information, see:
- [Admin Role System Documentation](ADMIN_ROLE_SYSTEM.md)
- [Quick Start Guide](QUICK_START_ROLES.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
