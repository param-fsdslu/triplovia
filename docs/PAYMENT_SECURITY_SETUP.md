# Payment Security & Refund System Setup Guide

## Overview

This guide covers the complete setup of the secure payment system with Razorpay integration, refund management, and the 48-hour cancellation policy.

---

## 🔐 Security Features Implemented

### ✅ **Payment Security**
- **HMAC-SHA256 Signature Validation** - Prevents payment tampering
- **Amount Verification** - Double-checks payment amount from database
- **Idempotency Protection** - Prevents duplicate payment processing
- **Webhook Validation** - Secure server-to-server payment confirmation
- **User Authorization** - Strict ownership verification

### ✅ **Refund System**
- **48-Hour Cancellation Policy** - Automated policy enforcement
- **Full/Partial Refund Support** - Based on time before check-in
- **Admin Refund Management** - Manual refund processing capability
- **Refund Tracking** - Complete audit trail
- **Email Notifications** - Automatic refund confirmation emails

### ✅ **Audit & Compliance**
- **Payment Audit Log** - Every payment event logged
- **Anomaly Detection** - Flags suspicious transactions
- **Reconciliation Views** - Easy payment matching
- **Admin Dashboard** - Complete refund oversight

---

## 📋 Prerequisites

1. **Razorpay Account**
   - Sign up at https://razorpay.com
   - Complete KYC verification
   - Enable webhooks

2. **Supabase Project**
   - Running PostgreSQL database
   - Row Level Security enabled

3. **Environment Variables**
   - All Razorpay credentials configured

---

## 🚀 Setup Steps

### Step 1: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Razorpay Keys (from Razorpay Dashboard)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here

# Razorpay Webhook Secret (generate in Razorpay Dashboard)
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

**🔴 CRITICAL:** Never commit `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to version control!

---

### Step 2: Run Database Migration

Execute the refund schema migration in your Supabase SQL Editor:

```bash
# Option 1: Via Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of docs/refund-schema-migration.sql
# 3. Execute the script

# Option 2: Via CLI (if using Supabase CLI)
supabase db push
```

This creates:
- `refund_transactions` table
- `payment_anomalies` table
- `payment_audit_log` table
- Required indexes and RLS policies
- Audit logging triggers
- Admin dashboard views

---

### Step 3: Configure Razorpay Webhooks

1. **Login to Razorpay Dashboard**
   - Go to Settings → Webhooks
   - Click "Add New Webhook"

2. **Set Webhook URL**
   ```
   Production: https://yourdomain.com/api/payment/webhook
   Development: Use ngrok or similar to expose localhost
   ```

3. **Select Events to Track**
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `order.paid`
   - ✅ `refund.processed`
   - ✅ `refund.failed`

4. **Configure Webhook Secret**
   - Generate a webhook secret in Razorpay
   - Copy to `.env.local` as `RAZORPAY_WEBHOOK_SECRET`
   - Click "Create Webhook"

5. **Test Webhook**
   - Use Razorpay's test webhook feature
   - Verify events are being received at `/api/payment/webhook`

---

### Step 4: Update Admin Navigation

Add refund management to admin navigation:

```tsx
// In components/admin/AdminNav.tsx or similar
{
  name: 'Refunds',
  href: '/admin/refunds',
  icon: DollarSignIcon,
}
```

---

### Step 5: Test Payment Flow

#### Test Scenario 1: Successful Payment
1. Create a booking
2. Process payment with Razorpay test card: `4111 1111 1111 1111`
3. Verify booking status updates to "confirmed"
4. Check payment record is created
5. Verify confirmation email is sent

#### Test Scenario 2: Webhook Recovery
1. Create a booking
2. Make payment
3. Close browser before verification completes
4. Wait for webhook to fire (< 5 minutes)
5. Verify booking is marked as paid via webhook

#### Test Scenario 3: Refund (>48 hours)
1. Create a booking with check-in date 3 days from now
2. Complete payment
3. Go to Admin → Bookings → [Booking Details]
4. Click "Process Refund"
5. Verify full refund is calculated
6. Process refund
7. Check refund appears in Admin → Refunds

#### Test Scenario 4: Refund (<48 hours)
1. Create a booking with check-in date tomorrow
2. Complete payment
3. Attempt refund
4. Verify "No refund available" message
5. Check 48-hour policy is enforced

---

## 🎯 API Endpoints

### Payment Endpoints

#### Create Payment Order
```
POST /api/payment/create-order
Body: { bookingId: string }
Returns: { orderId, amount, currency }
```

#### Verify Payment
```
POST /api/payment/verify
Body: {
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  bookingId: string
}
Returns: { success: true, bookingReference }
```

#### Webhook Handler
```
POST /api/payment/webhook
Headers: { x-razorpay-signature }
Body: Razorpay event payload
```

### Refund Endpoints

#### Check Refund Eligibility
```
GET /api/payment/refund?bookingId={id}
Returns: {
  eligible: boolean,
  refundAmount: number,
  cancellationCharge: number,
  hoursUntilCheckIn: number,
  message: string
}
```

#### Process Refund
```
POST /api/payment/refund
Body: {
  bookingId: string,
  reason?: string,
  isAdminInitiated?: boolean
}
Returns: {
  success: true,
  refund: {
    refundId: string,
    refundAmount: number,
    estimatedDays: string
  }
}
```

---

## 🔧 Cancellation Policy Configuration

The 48-hour policy is configured in `/app/api/payment/refund/route.ts`:

```typescript
const FREE_CANCELLATION_HOURS = 48
const CANCELLATION_CHARGE_PERCENTAGE = 0 // 0% within 48hrs, 100% after
```

**To modify the policy:**
1. Change `FREE_CANCELLATION_HOURS` (e.g., 24, 72, etc.)
2. Adjust `CANCELLATION_CHARGE_PERCENTAGE` for partial refunds
3. Update the refund calculation logic if needed

**Example: 24-hour policy with 50% partial refund**
```typescript
const FREE_CANCELLATION_HOURS = 24

// In calculateRefundAmount():
if (hoursUntilCheckIn >= FREE_CANCELLATION_HOURS) {
  // Full refund
  return { refundAmount: totalAmount, ... }
} else if (hoursUntilCheckIn >= 12) {
  // 50% refund between 12-24 hours
  return { refundAmount: totalAmount * 0.5, ... }
} else {
  // No refund within 12 hours
  return { refundAmount: 0, ... }
}
```

---

## 📊 Admin Dashboard Features

### Refund Management Dashboard
**URL:** `/admin/refunds`

**Features:**
- View all refund transactions
- Filter by status (processing, completed, failed)
- See refund amount breakdowns
- Track cancellation charges
- View refund reasons
- Monitor Razorpay refund IDs

### Booking Detail Refund Button
**Location:** `/admin/bookings/[reference]`

**Features:**
- Check refund eligibility in real-time
- See hours until check-in
- View amount breakdown before processing
- Process refunds with optional reason
- Enforce 48-hour policy automatically

---

## 🛡️ Security Best Practices

### ✅ DO:
1. **Always validate webhook signatures** before processing
2. **Fetch amounts from database**, never trust client input
3. **Use HTTPS in production** for webhook endpoints
4. **Monitor payment anomalies** regularly
5. **Review audit logs** for suspicious activity
6. **Keep Razorpay keys secure** (use environment variables)
7. **Test webhooks** before going live
8. **Enable rate limiting** on payment endpoints

### ❌ DON'T:
1. **Never expose `RAZORPAY_KEY_SECRET`** to client-side code
2. **Don't skip signature validation** on webhooks
3. **Don't process payments without amount verification**
4. **Don't allow duplicate payment processing**
5. **Don't ignore webhook failures** - investigate immediately
6. **Don't store card details** - let Razorpay handle it
7. **Don't modify payment amounts** client-side

---

## 🔍 Monitoring & Debugging

### Check Payment Status
```sql
SELECT
  b.booking_reference,
  b.payment_status,
  p.status as payment_status,
  p.payment_gateway_payment_id,
  p.amount,
  p.created_at
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.booking_reference = 'BK-2025-123456';
```

### View Refund History
```sql
SELECT * FROM refund_summary
ORDER BY refund_date DESC
LIMIT 10;
```

### Check Payment Anomalies
```sql
SELECT * FROM payment_anomalies
WHERE status = 'pending_review'
ORDER BY created_at DESC;
```

### Payment Audit Trail
```sql
SELECT
  event_type,
  event_source,
  success,
  created_at
FROM payment_audit_log
WHERE booking_id = 'your-booking-id'
ORDER BY created_at ASC;
```

---

## 🚨 Troubleshooting

### Issue: Webhook not receiving events
**Solution:**
1. Check webhook URL is publicly accessible
2. Verify `RAZORPAY_WEBHOOK_SECRET` is correct
3. Check Razorpay Dashboard → Webhooks → Logs
4. Ensure HTTPS in production (Razorpay requires it)

### Issue: Payment stuck in "processing"
**Solution:**
1. Check webhook logs for failures
2. Manually verify payment in Razorpay Dashboard
3. Check `payment_anomalies` table
4. Run payment reconciliation query

### Issue: Refund not processing
**Solution:**
1. Verify payment status is "paid" in database
2. Check Razorpay API credentials are correct
3. Review `refund_transactions` table for error messages
4. Ensure sufficient balance in Razorpay account

### Issue: Duplicate payments
**Solution:**
1. Idempotency protection should prevent this
2. Check `payment_audit_log` for duplicate events
3. Verify unique constraint on `payment_gateway_payment_id`

---

## 📈 Performance Optimization

1. **Database Indexes** - Already created by migration script
2. **Webhook Processing** - Runs asynchronously, doesn't block user
3. **Payment Verification** - Cached Razorpay API calls where possible
4. **Audit Logging** - Uses triggers for zero-overhead logging

---

## 🔄 Reconciliation Process

### Daily Reconciliation (Recommended)
Run this query daily to match payments with Razorpay settlements:

```sql
SELECT * FROM payment_reconciliation
WHERE payment_date >= CURRENT_DATE - INTERVAL '1 day'
AND payment_status != 'failed';
```

**Compare with:**
- Razorpay Dashboard → Settlements
- Match amounts and payment IDs
- Flag discrepancies in `payment_anomalies`

---

## 📝 Compliance & Legal

### Data Retention
- Payment records: 7 years (recommended for tax compliance)
- Audit logs: 3 years minimum
- Refund records: Indefinite (customer service)

### PCI DSS Compliance
- ✅ No card data stored locally
- ✅ All payments via Razorpay (PCI-certified)
- ✅ Webhook signatures validated
- ✅ HTTPS enforced in production

### Customer Rights
- Full refund within 48 hours of booking
- Clear cancellation policy displayed
- Email confirmation for all refunds
- Transparent amount breakdown

---

## 🎉 Success Checklist

Before going live, ensure:

- [ ] Database migration completed successfully
- [ ] Environment variables configured
- [ ] Razorpay webhooks set up and tested
- [ ] Test payment flow works end-to-end
- [ ] Webhook recovery tested (browser close scenario)
- [ ] Refund system tested (both >48hrs and <48hrs)
- [ ] Admin dashboard accessible
- [ ] Email notifications working
- [ ] Audit logging verified
- [ ] Security review completed
- [ ] Rate limiting enabled
- [ ] HTTPS enabled in production
- [ ] Backup and recovery tested
- [ ] Customer support trained on refund process

---

## 📞 Support

### Razorpay Support
- Dashboard: https://dashboard.razorpay.com
- Docs: https://razorpay.com/docs
- Support: support@razorpay.com

### Internal Issues
- Check `payment_audit_log` for debugging
- Review `payment_anomalies` for fraud detection
- Monitor webhook logs in Razorpay Dashboard

---

## 🔗 Related Documentation

- [Razorpay Payment Gateway Documentation](https://razorpay.com/docs/payments)
- [Razorpay Refund API](https://razorpay.com/docs/api/refunds)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks)
- Database Schema: `docs/refund-schema-migration.sql`
- Implementation Guide: `docs/IMPLEMENTATION_GUIDE.md`

---

**Last Updated:** 2025-12-27
**Version:** 1.0
**Status:** Production Ready ✅
