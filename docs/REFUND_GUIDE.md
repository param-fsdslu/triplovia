# Refund Management Guide

## Overview
Your hotel booking system has a complete refund management system with a **48-hour cancellation policy** integrated with Razorpay payment gateway.

## Refund Policy

### 48-Hour Free Cancellation Policy
- **48+ hours before check-in**: Full refund (100% of payment amount)
- **Within 48 hours of check-in**: No refund (100% cancellation charge)
- **After check-in date**: No refund available

## How to Initiate a Refund

You have **4 ways** to process refunds:

### 1. From Payments Admin Page (NEW!)
1. Navigate to **Admin > Payments**
2. Find the payment transaction
3. Click the **eye icon** to view payment details
4. In the payment details dialog, look for **"Refund Management"** section
5. Click **"Process Refund"** button
6. Review eligibility and refund breakdown
7. Optionally enter a refund reason
8. Click **"Confirm Refund"**

**Features:**
- Automatic eligibility check
- Shows refund breakdown (total paid, cancellation charge, refund amount)
- Displays hours until check-in
- Only shows for `paid` bookings that aren't already cancelled

### 2. From Bookings Admin Page
1. Navigate to **Admin > Bookings**
2. Find the booking
3. Click on booking to view details
4. Use the **"Process Refund"** button
5. Follow the same flow as above

### 3. From Refunds Admin Page
1. Navigate to **Admin > Refunds**
2. View all refund transactions
3. Track refund status (processing, completed, failed)
4. Monitor total refunded amounts

### 4. Via API (Programmatic)
For automated refunds or integration with other systems:

**Check Eligibility:**
```bash
GET /api/payment/refund?bookingId=xxx
```

**Process Refund:**
```bash
POST /api/payment/refund
Content-Type: application/json

{
  "bookingId": "booking-uuid",
  "reason": "Customer request",
  "isAdminInitiated": true
}
```

## Refund Process Flow

```
1. Admin clicks "Process Refund"
   ↓
2. System checks eligibility (48-hour policy)
   ↓
3. Shows refund breakdown:
   - Total Paid
   - Cancellation Charge
   - Refund Amount
   ↓
4. Admin confirms refund
   ↓
5. Razorpay processes refund
   ↓
6. Database updates:
   - Booking status → cancelled
   - Payment status → refunded/partially_refunded
   - Creates refund_transaction record
   ↓
7. Email sent to customer
   ↓
8. Refund completed (5-7 business days)
```

## Refund Calculation Logic

### Example 1: Full Refund (>48 hours)
```
Booking: Check-in is in 72 hours
Total Paid: ₹5,000
Cancellation Charge: ₹0
Refund Amount: ₹5,000 (100%)
```

### Example 2: No Refund (<48 hours)
```
Booking: Check-in is in 24 hours
Total Paid: ₹5,000
Cancellation Charge: ₹5,000 (100%)
Refund Amount: ₹0
```

### Example 3: Check-in Passed
```
Booking: Check-in was yesterday
Total Paid: ₹5,000
Refund Amount: ₹0
Status: Not Eligible
```

## Database Schema

### Refund Transactions Table
The system tracks all refunds in the `refund_transactions` table:

```sql
CREATE TABLE refund_transactions (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    payment_id UUID REFERENCES payments(id),

    -- Razorpay refund ID
    refund_gateway_id VARCHAR(255),

    -- Amount breakdown
    refund_amount DECIMAL(10, 2),
    cancellation_charge DECIMAL(10, 2),
    total_paid DECIMAL(10, 2),

    -- Metadata
    refund_reason TEXT,
    is_full_refund BOOLEAN,
    processed_by VARCHAR(50), -- 'customer', 'admin', or 'system'

    -- Status tracking
    status VARCHAR(20), -- 'processing', 'completed', 'failed', 'cancelled'
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Audit
    processed_by_user_id UUID,
    notes TEXT
);
```

## Refund Statuses

### Payment Statuses
- `paid` - Payment successful, eligible for refund
- `refunded` - Full refund processed
- `partially_refunded` - Partial refund processed
- `pending` - Payment not completed
- `failed` - Payment failed

### Booking Statuses
- `confirmed` - Active booking, can be refunded
- `cancelled` - Booking cancelled, refund processed/processing
- `completed` - Booking completed (check-out done)

### Refund Transaction Statuses
- `processing` - Refund initiated with Razorpay
- `completed` - Refund successful
- `failed` - Refund failed (logged with error message)
- `cancelled` - Refund request cancelled

## Email Notifications

When a refund is processed, the system automatically sends:

**Cancellation Email** containing:
- Booking reference
- Hotel name
- Check-in/out dates
- Refund amount
- Estimated refund timeline (5-7 business days)

## Admin Dashboard Features

### Payment Statistics
- Total revenue
- Revenue this month
- Paid transaction count
- Pending transaction count

### Refund Statistics
- Total refunds processed
- Total refund amount
- Processing refunds count
- Completed refunds count

### Filters & Search
- Search by booking reference, email, name, transaction ID
- Filter by payment status
- Filter by date range
- Pagination support
- Export to CSV

## Error Handling

The refund system handles various error scenarios:

### Not Eligible Errors
- ❌ Check-in date has passed
- ❌ Within 48-hour cancellation window
- ❌ Booking already cancelled
- ❌ Payment not in 'paid' status
- ❌ Payment already refunded

### Payment Gateway Errors
- ❌ Razorpay API errors
- ❌ Invalid payment ID
- ❌ Network errors

**All failed refund attempts are logged** in the `refund_transactions` table with `status='failed'` and error details.

## Security & Audit

### Row Level Security (RLS)
- Users can only view their own refunds
- Admins can view and manage all refunds
- Admin role checked via `user_metadata.role = 'admin'`

### Audit Logging
All payment and refund events are logged in:
- `payment_audit_log` - Complete audit trail
- `refund_transactions` - Refund-specific tracking
- Includes: event type, source, payload, user ID, IP address, timestamp

### Payment Anomalies
Suspicious activities are tracked in:
- `payment_anomalies` table
- Types: amount_mismatch, duplicate_payment, refund_failed, etc.
- Severity levels: low, medium, high, critical

## Best Practices

### For Admins
1. ✅ Always check refund eligibility before processing
2. ✅ Add a reason for admin-initiated refunds
3. ✅ Verify booking details before confirming
4. ✅ Monitor refund status in the Refunds page
5. ✅ Check email notifications are sent

### For Developers
1. ✅ Never bypass the 48-hour policy check
2. ✅ Always log refund attempts (successful or failed)
3. ✅ Handle Razorpay errors gracefully
4. ✅ Update all related records (booking, payment, refund_transactions)
5. ✅ Send email notifications after successful refunds

## Configuration

### Refund Policy Settings
Located in `app/api/payment/refund/route.ts`:

```typescript
const FREE_CANCELLATION_HOURS = 48
const CANCELLATION_CHARGE_PERCENTAGE = 0 // 0% within 48h, 100% after
```

### Razorpay Configuration
Located in `lib/razorpay/config.ts`:

```typescript
export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})
```

## Troubleshooting

### Refund Button Not Showing
**Check:**
- Payment status is `paid`
- Booking status is NOT `cancelled`
- You have admin access

### Refund Failed
**Check:**
- Razorpay API credentials are correct
- Payment ID exists in Razorpay
- Network connectivity
- Check `refund_transactions` table for error message

### Customer Didn't Receive Email
**Check:**
- Email service configuration
- User email address is valid
- Check spam folder
- Review email service logs

## Related Files

### Components
- `components/admin/PaymentDetailsDialog.tsx` - Payment details with refund button
- `components/admin/RefundButton.tsx` - Refund button component
- `components/admin/RefundsTable.tsx` - Refunds table display

### API Routes
- `app/api/payment/refund/route.ts` - Refund processing endpoint

### Admin Pages
- `app/admin/payments/page.tsx` - Payments management
- `app/admin/refunds/page.tsx` - Refunds tracking

### Database
- `docs/refund-schema-migration.sql` - Database schema
- `docs/refund-schema-migration-fixed.sql` - Schema fixes

## Support

For technical issues or questions:
1. Check the error logs in `refund_transactions` table
2. Review Razorpay dashboard for payment status
3. Check email service logs for notification issues
4. Review `payment_audit_log` for complete event history

---

**Last Updated:** 2026-01-07
**Policy Version:** 48-Hour Free Cancellation v1.0
