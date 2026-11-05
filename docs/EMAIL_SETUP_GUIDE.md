# 📧 Email Setup Guide - Fix "Not Receiving Emails" Issue

## 🚨 Current Problem

Based on the logs, emails are not being sent because:
1. ❌ Supabase is using its default email service (very limited)
2. ❌ Resend API key is placeholder: `your_resend_api_key_here`
3. ⚠️ Email verification links are failing
4. ⚠️ Supabase free tier limit: only **4 emails per hour**

---

## ✅ Solution: Set Up Real Email Service

You have **3 options** - choose one:

---

## 🎯 Option 1: Gmail SMTP (Easiest - 5 minutes)

### Step 1: Enable 2FA on Gmail

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** if not already enabled

### Step 2: Create App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select **"Mail"** as the app
3. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Configure Supabase

1. Go to: https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt
2. Navigate to: **Settings** → **Auth**
3. Scroll to **SMTP Settings**
4. Click **Enable Custom SMTP**
5. Enter these details:

```
Host: smtp.gmail.com
Port number: 587
Username: your-gmail@gmail.com
Password: [paste the 16-char app password]
Sender email: your-gmail@gmail.com
Sender name: Honnavar Travels
```

6. Click **Save**

### Step 4: Test

1. Restart your dev server
2. Try signup/forgot password
3. Check your email inbox

**Pros:**
- ✅ Free
- ✅ Quick setup (5 minutes)
- ✅ Reliable
- ✅ 500 emails/day limit (enough for development)

**Cons:**
- ⚠️ Gmail might flag as "sent via gmail.com"
- ⚠️ Not ideal for production

---

## 🎯 Option 2: Resend (Recommended for Production)

### Step 1: Sign Up for Resend

1. Go to: https://resend.com/signup
2. Create a free account
3. Verify your email

### Step 2: Add Your Domain (Optional but Recommended)

1. In Resend Dashboard, click **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain: `honnavartravels.com`
4. Follow DNS setup instructions
5. Wait for verification (can take up to 24 hours)

**For Testing Without Domain:**
- Use `onboarding@resend.dev` as sender
- Limited to 100 emails/day

### Step 3: Get API Key

1. In Resend Dashboard, click **"API Keys"**
2. Click **"Create API Key"**
3. Name it: "Honnavar Travels - Production"
4. Copy the API key (starts with `re_`)

### Step 4: Update .env.local

```env
# Replace the placeholder with your real API key
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM=Honnavar Travels <noreply@honnavartravels.com>
```

### Step 5: Configure Supabase to Use Resend

1. Go to: https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt
2. Navigate to: **Settings** → **Auth**
3. Find **Email Provider** section
4. Select **"Resend"**
5. Enter your Resend API key
6. Set sender email:
   - With domain: `noreply@honnavartravels.com`
   - Without domain: `onboarding@resend.dev`
7. Click **Save**

### Step 6: Test

1. Restart your dev server
2. Try signup/forgot password
3. Check email inbox

**Pros:**
- ✅ Professional email delivery
- ✅ 3,000 emails/month free
- ✅ Better deliverability
- ✅ Great for production
- ✅ No Gmail branding

**Cons:**
- ⚠️ Requires domain verification for branded emails
- ⚠️ Takes time to set up DNS records

---

## 🎯 Option 3: Use Supabase Default (Not Recommended)

### Current Setup

You're currently using Supabase's built-in email service.

**Limitations:**
- ❌ Only **4 emails per hour** (free tier)
- ❌ Often goes to spam
- ❌ May not work in development
- ❌ Email links from `supabase.io` domain

### Why Emails Aren't Working

1. **Rate Limit Hit:** You've likely exceeded 4 emails/hour from testing
2. **Spam Filtering:** Emails are being blocked or going to spam
3. **Development Environment:** Some providers block Supabase default emails

### Quick Fix (Temporary)

1. **Wait 1 hour** for rate limit to reset
2. Check **spam folder** thoroughly
3. Test with **Gmail address** (better deliverability)
4. Clear browser cookies and cache

---

## 🔧 Debugging Current Issues

Based on your logs:

```
"/verify | 403: Email link is invalid or has expired"
"/token | 400: invalid request: both auth code and code verifier should be non-empty"
```

### Issue 1: Invalid Email Links

**Cause:** Email links are expiring or malformed

**Fix:**
1. Make sure `NEXT_PUBLIC_SITE_URL` is correct (already added ✅)
2. Configure redirect URLs in Supabase

**Configure Redirect URLs:**

1. Go to: **Authentication** → **URL Configuration**
2. Add these redirect URLs:
   ```
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/reset-password
   http://localhost:3000/verify
   ```
3. Set Site URL to: `http://localhost:3000`
4. Click **Save**

### Issue 2: Code Verifier Missing

**Cause:** PKCE flow not configured properly

**Fix:** Update your Supabase client configuration

Check: `lib/supabase/client.ts` and `lib/supabase/server.ts`

Should have:
```typescript
{
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true
  }
}
```

---

## 📋 Complete Setup Checklist

### Environment Variables

```env
# ✅ Already set
NEXT_PUBLIC_SUPABASE_URL=https://xfjizthnxphpgsptesvt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ❌ Need to set with real value
RESEND_API_KEY=re_your_actual_resend_api_key  # Get from resend.com

# OR use Gmail SMTP in Supabase dashboard instead
```

### Supabase Dashboard Configuration

Go to: https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt

#### 1. URL Configuration
**Path:** Authentication → URL Configuration

```
Site URL: http://localhost:3000

Redirect URLs (add all):
- http://localhost:3000/**
- http://localhost:3000/auth/callback
- http://localhost:3000/auth/reset-password
- http://localhost:3000/verify
```

#### 2. Email Provider
**Path:** Settings → Auth → Email Provider

**Option A: Use Resend**
- Select "Resend"
- Enter API key from resend.com
- Set sender email

**Option B: Use Gmail SMTP**
- Enable "Custom SMTP"
- Enter Gmail settings (see Option 1 above)

#### 3. Email Templates
**Path:** Authentication → Email Templates

Check each template:
- ✅ **Confirm Signup** - Enabled
- ✅ **Reset Password** - Enabled
- ✅ **Magic Link** - Enabled (if using)

Verify the confirmation URL in each template:
```
{{ .ConfirmationURL }}
```

---

## 🧪 Testing Procedure

### Test 1: Signup Flow

1. Open: http://localhost:3000/en/auth/signup
2. Enter email and password
3. Submit form
4. Check for success message
5. **Check email inbox** (wait 1-2 minutes)
6. **Check spam folder**
7. Click confirmation link
8. Should redirect to login

### Test 2: Forgot Password Flow

1. Open: http://localhost:3000/en/auth/login
2. Click "Forgot Password?"
3. Enter email
4. Submit form
5. Check for success message
6. **Check email inbox**
7. **Check spam folder**
8. Click reset link
9. Enter new password
10. Should redirect to login

### Test 3: Check Logs

**In Terminal (dev server):**
Watch for auth requests

**In Supabase Dashboard:**
1. Go to: **Logs** → **Auth Logs**
2. Filter by your email
3. Look for:
   - Signup attempts
   - Password reset requests
   - Email sending status
   - Any error messages

---

## 🔍 Real-Time Debugging

Add this to `lib/actions/auth.ts` to see what's happening:

```typescript
export async function resetPasswordRequest(
  _prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const email = formData.get('email') as string

  console.log('=' .repeat(50))
  console.log('🔍 PASSWORD RESET REQUEST')
  console.log('Email:', email)
  console.log('Site URL:', process.env.NEXT_PUBLIC_SITE_URL)
  console.log('Redirect:', `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`)
  console.log('=' .repeat(50))

  const supabase = await createClient()

  const { error, data } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    console.error('❌ ERROR:', error.message)
    console.error('Error details:', error)
    return { error: error.message }
  }

  console.log('✅ SUCCESS: Email sent')
  console.log('Response:', data)
  return { success: true }
}
```

Watch your terminal when testing.

---

## 💡 Most Likely Solution for You

Based on your setup, here's what I recommend:

### Quick Fix (5 minutes):

1. **Set up Gmail SMTP** (see Option 1 above)
   - Fastest to set up
   - Works immediately
   - Free and reliable

2. **Add Redirect URLs in Supabase**
   - Go to Authentication → URL Configuration
   - Add all the URLs listed above

3. **Clear Rate Limit**
   - Wait 1 hour if you've been testing
   - Or upgrade Supabase plan

4. **Restart Everything**
   ```bash
   # Restart dev server
   npm run dev

   # Clear browser cache
   # Test in incognito mode
   ```

### Long-term Fix:

1. **Get Resend API key** (free account)
2. **Verify your domain** on Resend
3. **Configure Supabase to use Resend**
4. **Update .env.local** with real API key

---

## 📊 Comparison Table

| Provider | Setup Time | Cost | Emails/Day | Deliverability | Production Ready |
|----------|-----------|------|------------|----------------|-----------------|
| **Supabase Default** | 0 min | Free | 96 (4/hour) | ⭐⭐ | ❌ No |
| **Gmail SMTP** | 5 min | Free | 500 | ⭐⭐⭐⭐ | ⚠️ OK |
| **Resend** | 20 min | Free | 3,000 | ⭐⭐⭐⭐⭐ | ✅ Yes |

---

## 🎯 Action Plan - Do This Now

### Step 1: Choose Email Provider (Pick One)

- [ ] **Option A:** Gmail SMTP (5 min setup)
- [ ] **Option B:** Resend (20 min setup, better for production)

### Step 2: Configure Supabase

- [ ] Add redirect URLs in Authentication → URL Configuration
- [ ] Configure email provider (Gmail or Resend)
- [ ] Verify email templates are enabled

### Step 3: Update Environment

- [ ] Update `.env.local` with real Resend key (if using Resend)
- [ ] Verify `NEXT_PUBLIC_SITE_URL` is set ✅ (already done)

### Step 4: Restart & Test

- [ ] Restart dev server
- [ ] Test signup flow
- [ ] Test forgot password flow
- [ ] Check spam folder
- [ ] Verify emails arrive

---

## 🆘 Still Not Working?

### Check These:

1. **Supabase Auth Logs**
   - Dashboard → Logs → Auth Logs
   - What errors do you see?

2. **Email Provider Dashboard**
   - Gmail: Check "Sent" folder
   - Resend: Check dashboard logs

3. **Rate Limits**
   - Supabase free tier: 4 emails/hour
   - Did you exceed this from testing?

4. **Spam Folder**
   - Check thoroughly
   - Add sender to contacts

5. **Email Address**
   - Try different provider (Gmail, Outlook, Yahoo)
   - Some providers block certain senders

---

## 📞 Need Help?

**Provide these details:**

1. Which email provider are you using?
   - Supabase default
   - Gmail SMTP
   - Resend
   - Other

2. What do Supabase Auth Logs show?
   - Go to Logs → Auth Logs
   - Share error messages

3. Are emails going to spam?
   - Check spam folder

4. Have you configured redirect URLs?
   - Authentication → URL Configuration

5. What errors appear in your terminal?
   - Share console output

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Form submits without errors
2. ✅ Success message appears
3. ✅ Email arrives within 30 seconds
4. ✅ Email is in inbox (not spam)
5. ✅ Links in email work correctly
6. ✅ Can complete signup/reset flow

---

## 🎉 Expected Result

After proper setup:

```
User submits form
    ↓
Success message shown (instantly)
    ↓
Email sent by provider (within 30 seconds)
    ↓
Email arrives in inbox ✅
    ↓
User clicks link
    ↓
Process completes successfully ✅
```

---

## 📁 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt
- **Auth Settings:** https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt/auth/url-configuration
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
- **Resend Dashboard:** https://resend.com/dashboard
- **Auth Logs:** https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt/logs/auth-logs

---

**Start with Gmail SMTP (Option 1) - it's the fastest way to get emails working!** 🚀
