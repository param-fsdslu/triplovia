# 🔗 Razorpay Webhook Setup Guide

## Overview

Webhooks are critical for catching payment events even if the user closes their browser. This guide shows you exactly how to set up Razorpay webhooks for your Honnavar Travels application.

---

## 📋 Prerequisites

Before setting up webhooks, ensure you have:

1. ✅ Razorpay account (Test or Live mode)
2. ✅ API Keys (from Razorpay Dashboard)
3. ✅ Application deployed or locally accessible via HTTPS
4. ✅ Database migration completed (creates webhook handler tables)

---

## 🚀 Step-by-Step Webhook Setup

### **Step 1: Get Your Webhook URL**

Your webhook endpoint is:
```
https://your-domain.com/api/payment/webhook
```

**For Different Environments:**

#### Production:
```
https://honnavar-travels.vercel.app/api/payment/webhook
```

#### Development (Local Testing):
You need to expose your localhost to the internet. Use **ngrok** or **localtunnel**:

**Option A: Using ngrok**
```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, expose localhost:3000
ngrok http 3000
```

You'll get a URL like:
```
https://abc123.ngrok.io
```

Your webhook URL becomes:
```
https://abc123.ngrok.io/api/payment/webhook
```

**Option B: Using Vercel Preview**
```bash
# Deploy to Vercel preview
vercel

# Get preview URL
# Webhook URL: https://your-app-xxxxx.vercel.app/api/payment/webhook
```

---

### **Step 2: Login to Razorpay Dashboard**

1. Go to: https://dashboard.razorpay.com
2. Login with your credentials
3. Make sure you're in the correct mode:
   - **Test Mode** (for development) - Blue banner at top
   - **Live Mode** (for production) - No banner

**Switch modes:** Click your account name (top right) → Select "Test Mode" or "Live Mode"

---

### **Step 3: Navigate to Webhooks Section**

1. In the Razorpay Dashboard, click **Settings** (gear icon) in left sidebar
2. Click **Webhooks** under "Developers" section
3. Click **+ Create New Webhook** button (blue button)

---

### **Step 4: Configure Webhook**

Fill in the webhook configuration form:

#### **A. Webhook URL**
```
https://your-domain.com/api/payment/webhook
```

**Examples:**
- Production: `https://honnavar-travels.vercel.app/api/payment/webhook`
- Staging: `https://staging.honnavar-travels.com/api/payment/webhook`
- Dev (ngrok): `https://abc123.ngrok.io/api/payment/webhook`

#### **B. Active Events**

Select these events (tick the checkboxes):

**Payment Events:**
- ✅ `payment.authorized`
- ✅ `payment.captured`
- ✅ `payment.failed`

**Order Events:**
- ✅ `order.paid`

**Refund Events:**
- ✅ `refund.created`
- ✅ `refund.processed`
- ✅ `refund.failed`
- ✅ `refund.speed_changed`

**Optional (for advanced features):**
- ☐ `payment.pending`
- ☐ `transfer.processed` (if using route/split payments)
- ☐ `settlement.processed` (for settlement tracking)

#### **C. Alert Email** (Optional)
Enter your email to get notified when webhooks fail:
```
admin@honnavar-travels.com
```

---

### **Step 5: Generate Webhook Secret**

1. After filling the form, click **Create Webhook**
2. Razorpay will show a **Webhook Secret** - this is shown ONLY ONCE!
3. **Copy the webhook secret immediately**

It looks like:
```
whsec_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

---

### **Step 6: Save Webhook Secret to Environment Variables**

Add the webhook secret to your `.env.local` file:

```bash
# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
RAZORPAY_WEBHOOK_SECRET=whsec_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

**IMPORTANT:**
- ❌ Never commit `.env.local` to Git
- ✅ Add to `.gitignore` (should already be there)
- ✅ Add webhook secret to Vercel/production environment variables

---

### **Step 7: Deploy Environment Variable (Production)**

If deploying to **Vercel**:

1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Key:** `RAZORPAY_WEBHOOK_SECRET`
   - **Value:** `whsec_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`
   - **Environment:** Production, Preview, Development (select all)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

---

### **Step 8: Test Webhook**

#### **Option 1: Test from Razorpay Dashboard**

1. In Razorpay Dashboard → Webhooks
2. Click on your webhook
3. Click **Send Test Webhook** button
4. Select event type: `payment.captured`
5. Click **Send**

You should see:
- ✅ Status: 200 OK
- ✅ Response time: < 2 seconds

#### **Option 2: Make Test Payment**

1. Create a test booking in your app
2. Use Razorpay test card:
   ```
   Card Number: 4111 1111 1111 1111
   CVV: Any 3 digits
   Expiry: Any future date
   ```
3. Complete payment
4. Check webhook logs in Razorpay Dashboard

---

## 🔍 Verify Webhook is Working

### **Check 1: Razorpay Webhook Logs**

1. Razorpay Dashboard → Webhooks → Your Webhook
2. Click **Logs** tab
3. You should see recent webhook deliveries:
   - **Green checkmark** = Success (200 response)
   - **Red X** = Failed
   - **Yellow warning** = Retry

### **Check 2: Application Logs**

If using Vercel:
1. Vercel Dashboard → Your Project → **Logs**
2. Search for: `Webhook received:`
3. You should see webhook event logs

### **Check 3: Database**

Run this query in Supabase SQL Editor:
```sql
-- Check if webhooks are creating payment records
SELECT
  event_type,
  event_source,
  success,
  created_at
FROM payment_audit_log
WHERE event_source = 'webhook'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔐 Security Verification

Your webhook handler automatically verifies signatures. Here's what happens:

```typescript
// In app/api/payment/webhook/route.ts
const signature = request.headers.get('x-razorpay-signature')
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!

const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(body)
  .digest('hex')

if (expectedSignature !== signature) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
}
```

**Webhook Security Checklist:**
- ✅ Signature verification enabled
- ✅ HTTPS enforced (Razorpay requires it)
- ✅ Webhook secret kept secure
- ✅ Event type validation
- ✅ Idempotency protection

---

## 🐛 Troubleshooting

### **Problem: Webhook returns 404 Not Found**

**Solution:**
- Verify URL is correct: `https://your-domain.com/api/payment/webhook`
- Check deployment is live
- Ensure route file exists: `app/api/payment/webhook/route.ts`

### **Problem: Webhook returns 401 Unauthorized**

**Solution:**
- Check `RAZORPAY_WEBHOOK_SECRET` is set correctly
- Verify environment variable is deployed
- Redeploy application after adding env var

### **Problem: Webhook returns 500 Internal Server Error**

**Solution:**
1. Check Vercel logs for error details
2. Verify database migration ran successfully
3. Check all required tables exist:
   - `payments`
   - `payment_audit_log`
   - `payment_anomalies`

### **Problem: Webhook signature verification fails**

**Solution:**
- Webhook secret doesn't match
- Copy the correct secret from Razorpay Dashboard
- Update environment variable
- Redeploy

### **Problem: Webhooks not firing at all**

**Solution:**
1. Check webhook is **Active** in Razorpay Dashboard
2. Verify correct events are selected
3. Ensure webhook URL is publicly accessible (test with curl)
4. Check for firewall/security group blocking Razorpay IPs

---

## 📊 Webhook Event Details

### **payment.captured**
Fired when payment is successfully captured.

**Use case:** Confirm booking, send confirmation email

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxxxx",
        "amount": 50000,
        "status": "captured"
      }
    }
  }
}
```

### **payment.failed**
Fired when payment fails.

**Use case:** Mark booking as failed, notify user

### **refund.processed**
Fired when refund is successfully processed.

**Use case:** Update booking status, send refund confirmation email

```json
{
  "event": "refund.processed",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_xxxxx",
        "amount": 50000,
        "payment_id": "pay_xxxxx"
      }
    }
  }
}
```

---

## 🔄 Webhook Retry Logic

Razorpay automatically retries failed webhooks:

- **Retry Schedule:** 5 min, 10 min, 30 min, 1 hour, 6 hours, 12 hours, 24 hours
- **Max Retries:** 7 attempts over 24 hours
- **Timeout:** 30 seconds per attempt

**Your webhook should:**
- ✅ Respond quickly (< 5 seconds)
- ✅ Return 200 status on success
- ✅ Handle duplicate events (idempotency)
- ✅ Log errors for debugging

---

## 📧 Webhook Monitoring

### **Set Up Alerts**

1. **Razorpay Dashboard Alerts:**
   - Settings → Webhooks → Your Webhook
   - Add alert email
   - Get notified on failures

2. **Application Monitoring:**
   - Use Vercel error tracking
   - Monitor `payment_audit_log` table
   - Set up Slack/email alerts for webhook failures

### **Key Metrics to Monitor**

```sql
-- Webhook success rate (last 24 hours)
SELECT
  event_source,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed,
  ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as success_rate
FROM payment_audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND event_source = 'webhook'
GROUP BY event_source;
```

---

## 🎯 Testing Checklist

Before going live, test these scenarios:

### **✅ Payment Success Flow**
- [ ] Make test payment
- [ ] Webhook fires successfully
- [ ] Booking marked as "paid"
- [ ] Payment record created
- [ ] Confirmation email sent

### **✅ Payment Failure Flow**
- [ ] Force payment failure (insufficient funds card)
- [ ] Webhook fires
- [ ] Booking marked as "failed"
- [ ] User notified

### **✅ Browser Close Scenario (Critical!)**
- [ ] Start payment
- [ ] Close browser BEFORE payment completes
- [ ] Webhook catches payment
- [ ] Booking still gets confirmed

### **✅ Refund Flow**
- [ ] Process refund from admin dashboard
- [ ] Webhook fires for refund
- [ ] Booking status updated
- [ ] Refund confirmation email sent

### **✅ Duplicate Webhook**
- [ ] Manually resend webhook from Razorpay
- [ ] System handles duplicate gracefully (idempotency)
- [ ] No duplicate payment records created

---

## 🚀 Going Live

### **Pre-Production Checklist**

- [ ] Test webhooks thoroughly in Test Mode
- [ ] Verify all webhook events are handled
- [ ] Check error logging works
- [ ] Confirm database has enough capacity
- [ ] Set up monitoring and alerts

### **Switch to Live Mode**

1. **Get Live API Keys:**
   - Razorpay Dashboard → Settings → API Keys
   - Switch to **Live Mode**
   - Copy Live Key ID and Secret

2. **Create Live Webhook:**
   - Settings → Webhooks (Live Mode)
   - Create webhook with PRODUCTION URL
   - Copy LIVE webhook secret

3. **Update Production Environment:**
   ```bash
   # Update these in production
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
   RAZORPAY_KEY_SECRET=live_secret_here
   RAZORPAY_WEBHOOK_SECRET=live_webhook_secret_here
   ```

4. **Test with Small Real Payment**
   - Make ₹10 test booking
   - Verify webhook works
   - Confirm refund works

---

## 📚 Additional Resources

- **Razorpay Webhooks Docs:** https://razorpay.com/docs/webhooks
- **Test Webhooks:** https://razorpay.com/docs/webhooks/test
- **Event List:** https://razorpay.com/docs/webhooks/supported-events
- **Webhook Best Practices:** https://razorpay.com/docs/webhooks/best-practices

---

## 🆘 Support

### **Razorpay Support**
- Email: support@razorpay.com
- Dashboard: Live Chat (bottom right)
- Phone: 1800-123-0000

### **Debug Mode**

To enable detailed webhook logging, check application logs:
```bash
# Vercel
vercel logs --follow

# Local
# Check terminal where `npm run dev` is running
```

---

**Last Updated:** 2025-12-28
**Status:** Production Ready ✅

---

## Quick Reference

```bash
# Webhook URL Format
https://your-domain.com/api/payment/webhook

# Environment Variable
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx

# Test Webhook (curl)
curl -X POST https://your-domain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test" \
  -d '{"event":"payment.captured"}'
```

That's it! Your webhooks are now set up and ready to catch all payment events reliably. 🎉
