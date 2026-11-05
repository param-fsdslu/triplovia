# Payment & Transaction Filtering

## Overview

All payment and transaction data is now **filtered by admin role**:
- ✅ **Super Admins** see ALL payments and transactions across all hotels
- ✅ **Hotel Admins** see ONLY payments and transactions for their assigned hotels

---

## What's Filtered

### Payment Views
All payment-related data is filtered by hotel ownership:

1. **Payment List** (`/admin/payments`)
   - Hotel admins see only payments for their hotels
   - Super admins see all payments

2. **Payment Statistics**
   - Total revenue
   - Revenue this month
   - Payment status counts (paid, pending, failed, refunded)
   - Recent transactions

3. **Dashboard Statistics**
   - Total revenue shown on dashboard
   - Revenue calculations based on hotel access

---

## How It Works

### Data Flow

```
Admin requests payment data
    ↓
getAdminHotelAccess() - Get user's role and hotel access
    ↓
If super_admin:
  hotelIds = null → Query ALL hotels
    ↓
If hotel_admin:
  hotelIds = ["uuid-1", "uuid-2"] → Query ONLY these hotels
    ↓
Apply filter to database query
    ↓
Return filtered results
```

### Example Query (Hotel Admin)

```typescript
// Hotel admin with 2 hotels
const adminAccess = {
  userId: "admin-uuid",
  role: "hotel_admin",
  hotelIds: ["hotel-1-uuid", "hotel-2-uuid"]
}

// Query payments
let query = supabase
  .from('bookings')
  .select('*, payments(*)')

// Apply hotel filter
query = query.in('hotel_id', adminAccess.hotelIds)

// Result: Only payments for hotel-1 and hotel-2
```

### Example Query (Super Admin)

```typescript
// Super admin
const adminAccess = {
  userId: "admin-uuid",
  role: "super_admin",
  hotelIds: null  // null = all hotels
}

// Query payments
let query = supabase
  .from('bookings')
  .select('*, payments(*)')

// NO filter applied - see all hotels

// Result: All payments across all hotels
```

---

## Updated Functions

### ✅ `getPayments()` - Payment List
**Location:** `lib/actions/admin.ts`

**What it does:**
- Gets paginated list of payments with filters
- Filters by status, search term, date range
- **NOW:** Filters by hotel ownership

**Filtering logic:**
```typescript
if (adminAccess.hotelIds !== null) {
  query = query.in('hotel_id', adminAccess.hotelIds)
}
```

### ✅ `getPaymentStats()` - Payment Statistics
**Location:** `lib/actions/admin.ts`

**What it does:**
- Total revenue (all time)
- Revenue this month
- Payment status counts
- Recent transactions
- **NOW:** All filtered by hotel ownership

**Applies to:**
- Total revenue calculation
- Monthly revenue
- Status counts (paid, pending, failed, refunded)
- Recent transaction list

### ✅ `getAdminStats()` - Dashboard Statistics
**Location:** `lib/actions/admin.ts`

**Already filtered:**
- Total hotels
- Total bookings
- Total revenue
- Bookings today
- Pending/confirmed bookings

**Updated earlier:** ✅ Already includes hotel filtering

---

## Payment Data Shown

### For Super Admins
- ✅ All payments across ALL hotels
- ✅ Total revenue from ALL hotels
- ✅ All transactions system-wide
- ✅ Payment statistics for entire platform

### For Hotel Admins
- ✅ Payments for THEIR hotels only
- ✅ Revenue from THEIR hotels only
- ✅ Transactions for THEIR hotels only
- ✅ Payment statistics scoped to their hotels
- ❌ Cannot see other hotels' payments
- ❌ Cannot see global revenue

---

## Database Security

### Row Level Security (RLS)

The RLS policies already ensure payment data isolation:

**Payments Table:**
```sql
-- Super admins see all
CREATE POLICY payments_super_admin_all ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Hotel admins see only their hotels' payments
CREATE POLICY payments_admin_own_hotel ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN hotels ON hotels.id = bookings.hotel_id
      WHERE bookings.id = payments.booking_id
      AND hotels.owner_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
      )
    )
  );
```

**Bookings Table:**
```sql
-- Similar policies for bookings
-- Super admins see all bookings
-- Hotel admins see only their hotels' bookings
```

---

## Payment Flow with Filtering

### 1. User Views Payments Page

```
Hotel Admin logs in
    ↓
Navigate to /admin/payments
    ↓
Page calls getPayments()
    ↓
getAdminHotelAccess() returns:
  { role: 'hotel_admin', hotelIds: ['hotel-uuid'] }
    ↓
Query filters: WHERE hotel_id IN ('hotel-uuid')
    ↓
Returns ONLY payments for their hotel
    ↓
Table displays filtered payments
```

### 2. User Views Dashboard

```
Hotel Admin views dashboard
    ↓
Page calls getAdminStats()
    ↓
getAdminHotelAccess() returns:
  { role: 'hotel_admin', hotelIds: ['hotel-uuid'] }
    ↓
All queries filtered by hotel_id
    ↓
Total revenue = SUM(payments WHERE hotel_id IN their hotels)
    ↓
Dashboard shows ONLY their hotel's data
```

---

## Testing Payment Filtering

### Test as Super Admin
1. Login as super admin
2. Go to `/admin/payments`
3. ✅ Should see payments from ALL hotels
4. Check dashboard
5. ✅ Revenue should include ALL hotels
6. Check payment statistics
7. ✅ Should show global stats

### Test as Hotel Admin
1. Login as hotel admin
2. Go to `/admin/payments`
3. ✅ Should see ONLY payments for your hotel(s)
4. ❌ Should NOT see other hotels' payments
5. Check dashboard
6. ✅ Revenue should ONLY include your hotel(s)
7. Check payment statistics
8. ✅ Should show stats for your hotel(s) only

### Test Data Isolation
1. Create test payment for Hotel A
2. Create test payment for Hotel B
3. Login as Hotel A admin
4. ✅ Should see Hotel A payment
5. ❌ Should NOT see Hotel B payment
6. Login as Hotel B admin
7. ✅ Should see Hotel B payment
8. ❌ Should NOT see Hotel A payment

---

## Common Scenarios

### Scenario 1: Hotel Admin Views Revenue
**Question:** What revenue does a hotel admin see?

**Answer:**
- Total revenue = SUM of all paid bookings for their assigned hotels
- Monthly revenue = SUM of this month's paid bookings for their hotels
- Does NOT include revenue from other hotels

### Scenario 2: Multiple Hotels
**Question:** Hotel admin manages 3 hotels. What do they see?

**Answer:**
- All payments from all 3 hotels combined
- Revenue from all 3 hotels combined
- Payment statistics aggregated across all 3 hotels
- Cannot distinguish between hotels in current view (future enhancement)

### Scenario 3: Reassigned Hotel
**Question:** Hotel ownership changes from Admin A to Admin B. What happens?

**Answer:**
- Admin A immediately loses access to that hotel's payments
- Admin B immediately gains access to that hotel's payments
- Historical payments remain in database (just access changes)
- RLS policies enforce the new ownership

### Scenario 4: Super Admin Becomes Hotel Admin
**Question:** Super admin is converted to hotel admin. What happens?

**Answer:**
- Loses access to ALL hotels' payments
- Must be assigned specific hotels
- Only sees payments for assigned hotels going forward
- No longer sees global statistics

---

## API Usage

### Get Filtered Payments

```typescript
import { getPayments } from '@/lib/actions/admin'

// Get payments (automatically filtered by role)
const { payments, pagination } = await getPayments({
  page: 1,
  limit: 20,
  status: 'paid',
  search: 'john@example.com',
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31'
})

// Super admin: Gets all payments
// Hotel admin: Gets only their hotels' payments
```

### Get Payment Statistics

```typescript
import { getPaymentStats } from '@/lib/actions/admin'

// Get payment stats (automatically filtered by role)
const { stats } = await getPaymentStats()

// Returns:
// - totalRevenue
// - revenueThisMonth
// - statusCounts
// - recentTransactions
// All filtered by hotel access
```

---

## Summary

✅ **All payment data is filtered by admin role**
✅ **Hotel admins see ONLY their hotels' payments**
✅ **Super admins see ALL payments**
✅ **Database-level security with RLS**
✅ **Application-level filtering in queries**
✅ **Immediate updates when hotel ownership changes**

**Key Points:**
- Payment filtering is automatic based on admin role
- No special configuration needed
- Works for all payment-related views and statistics
- Secure at both database and application level
- Cannot be bypassed by hotel admins

For more information:
- [Admin Role System](ADMIN_ROLE_SYSTEM.md)
- [User Management Guide](USER_MANAGEMENT_GUIDE.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
