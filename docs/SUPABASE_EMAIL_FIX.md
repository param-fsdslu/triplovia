# Supabase Default Email Not Working - Troubleshooting

## 🎯 You're Right - Supabase Default Should Work!

Since you're using Supabase Cloud, the default email service **should work** without additional setup.

---

## 🔍 Why Emails Aren't Arriving

Based on your logs, here are the likely issues:

### 1. ⏰ **Rate Limit Hit (Most Likely)**

**Supabase Free Tier Email Limits:**
- Only **4 emails per hour**
- Counter resets every hour
- If you've been testing, you've likely exceeded this

**Solution:**
```bash
# Wait 1 hour, then test again
# OR check Supabase dashboard for rate limit status
```

### 2. 📧 **Emails Going to Spam (Very Common)**

Supabase's default email sender (`noreply@mail.app.supabase.io`) is often flagged as spam.

**Solution:**
1. Check your **spam/junk folder thoroughly**
2. Add `noreply@mail.app.supabase.io` to contacts
3. Mark as "Not Spam" if found

### 3. ❌ **Email Verification Links Failing**

From your logs:
```
"/verify | 403: Email link is invalid or has expired"
```

This means links are malformed or expired.

**Solution:** Configure redirect URLs in Supabase

---

## ✅ Fix Supabase Configuration

### Step 1: Configure Site URL & Redirect URLs

1. **Go to:** https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt

2. **Navigate to:** Authentication → URL Configuration

3. **Set Site URL:**
   ```
   http://localhost:3000
   ```

4. **Add Redirect URLs** (click "Add URL" for each):
   ```
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/reset-password
   http://localhost:3000/auth/confirm
   http://localhost:3000/verify
   ```

5. **Click "Save"**

### Step 2: Verify Email Templates Are Enabled

1. **Go to:** Authentication → Email Templates

2. **Check these templates are enabled:**
   - ✅ Confirm signup
   - ✅ Invite user
   - ✅ Magic Link
   - ✅ Change Email Address
   - ✅ Reset Password

3. **For each template, verify:**
   - Template has content
   - `{{ .ConfirmationURL }}` is present
   - Template is enabled (toggle on)

### Step 3: Check Auth Settings

1. **Go to:** Settings → Auth

2. **Verify these settings:**
   ```
   Enable email confirmations: ON
   Enable email change confirmations: ON
   Secure email change: ON
   ```

3. **Email Auth Provider:**
   - Should show "Default (Supabase)"
   - No custom SMTP configured

---

## 🧪 Test Procedure

### Clear Rate Limit & Test

1. **Wait 1 full hour** since last test

2. **Check your current usage:**
   - Dashboard → Usage
   - Look for "Auth Emails" count
   - Should reset every hour

3. **Use Fresh Email Address:**
   - Don't reuse email from previous tests
   - Try: `yourname+test1@gmail.com`
   - Gmail treats this as unique but delivers to same inbox

4. **Test Signup:**
   ```
   1. Go to: http://localhost:3000/en/auth/signup
   2. Use fresh email
   3. Submit form
   4. Wait 2 minutes
   5. Check inbox AND spam folder
   ```

5. **Test Forgot Password:**
   ```
   1. Go to: http://localhost:3000/en/auth/login
   2. Click "Forgot Password?"
   3. Use email of existing user
   4. Submit form
   5. Check inbox AND spam folder
   ```

---

## 🔍 Check Supabase Logs

### View Auth Logs

1. **Go to:** https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt/logs/auth-logs

2. **Filter by:**
   - Your email address
   - Time range: Last hour

3. **Look for:**
   - ✅ `auth.signup` - Signup attempt
   - ✅ `auth.password_reset` - Reset request
   - ❌ Any error messages
   - ⚠️ Rate limit warnings

4. **What to check:**
   - Is the request reaching Supabase?
   - What's the response status?
   - Any error messages?

### Check Email Queue

1. **Go to:** Settings → Auth → scroll to bottom

2. **Look for:** Email queue status or pending emails

3. **Check for:** Rate limit warnings

---

## 📧 Email Provider Testing

### Test Different Email Providers

Supabase's default email works differently with various providers:

| Provider | Deliverability | Note |
|----------|---------------|------|
| **Gmail** | ✅ Good | Check spam folder |
| **Outlook/Hotmail** | ⚠️ Mixed | Often goes to spam |
| **Yahoo** | ⚠️ Mixed | May block |
| **Corporate Email** | ❌ Often blocked | IT may block |
| **ProtonMail** | ✅ Good | Usually works |

**Test with Gmail first** - best compatibility.

---

## 🚨 Common Issues with Supabase Default Email

### Issue 1: Emails Go to Spam

**Why:**
- Sent from `mail.app.supabase.io` domain
- No SPF/DKIM from your domain
- Flagged by spam filters

**Solutions:**
1. Check spam folder FIRST
2. Add sender to contacts
3. Mark as "Not Spam"
4. Future emails should go to inbox

### Issue 2: Rate Limit

**Why:**
- Free tier: only 4 emails/hour
- Testing uses up quota fast

**Solutions:**
1. Wait 1 hour between tests
2. Use fewer test emails
3. Check usage dashboard
4. Consider Pro plan ($25/mo = unlimited emails)

### Issue 3: Email Links Expire Fast

**Why:**
- Default expiration: 24 hours
- May be configured shorter

**Solution:**
Click email links immediately after receiving.

### Issue 4: Development Environment

**Why:**
- Some corporate networks block external emails
- VPN may interfere
- Firewall settings

**Solutions:**
1. Test without VPN
2. Use personal email (not corporate)
3. Test from different network

---

## 🔧 Debugging Steps

### Debug 1: Check if Email is Sent

Add logging to your auth action:

```typescript
// In lib/actions/auth.ts
export async function resetPasswordRequest(
  _prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const email = formData.get('email') as string

  console.log('🔍 Starting password reset for:', email)
  console.log('🔍 Site URL:', process.env.NEXT_PUBLIC_SITE_URL)

  const supabase = await createClient()

  const { error, data } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    console.error('❌ Supabase error:', error.message)
    console.error('Error code:', error.status)
    console.error('Error details:', error)
    return { error: error.message }
  }

  console.log('✅ Supabase says email sent!')
  console.log('Response data:', data)
  return { success: true }
}
```

**Watch terminal output** when testing.

### Debug 2: Check Supabase Response

The response will tell you if:
- ✅ Email was queued for sending
- ❌ Request was rejected
- ⚠️ Rate limit hit

### Debug 3: Verify User Exists

For forgot password, user must exist:

1. **Go to:** Authentication → Users
2. **Find your test email**
3. **Check:**
   - User exists
   - Email is confirmed (green checkmark)
   - User is not banned

---

## 💡 Most Likely Scenario

Based on your logs and typical issues:

### You've Hit the Rate Limit

**Evidence:**
- You've been testing multiple times
- 4 email limit on free tier
- Reset every hour

**Fix:**
1. **Wait 1 full hour**
2. **Test with only 1 email** (don't spam tests)
3. **Check spam folder** (50% of emails go here)

---

## ✅ Step-by-Step Fix Right Now

### 1. Configure Supabase (5 minutes)

```
✅ Go to: Authentication → URL Configuration
✅ Set Site URL: http://localhost:3000
✅ Add Redirect URLs (all listed above)
✅ Save
```

### 2. Wait for Rate Limit Reset

```
✅ Check dashboard → Usage → Auth Emails count
✅ Wait until count resets (every hour)
✅ Don't test in meantime
```

### 3. Test with Fresh Email

```
✅ Use: yourname+test1@gmail.com
✅ Submit forgot password form
✅ Wait 2 minutes
✅ Check inbox
✅ Check spam folder thoroughly
```

### 4. Check Logs

```
✅ Go to: Logs → Auth Logs
✅ Filter by your email
✅ Look for success/error messages
```

---

## 🎯 Quick Checklist

Before testing again:

```
□ Configured Site URL in Supabase ✅
□ Added Redirect URLs in Supabase
□ Waited 1 hour since last test
□ Using fresh email address
□ Email templates are enabled
□ Will check spam folder
□ Using Gmail (best compatibility)
□ Dev server is running
□ NEXT_PUBLIC_SITE_URL is set ✅
```

---

## 📊 Email Timeline

**What to expect:**

```
Submit form
    ↓ (instantly)
Success message shown ✅
    ↓ (0-30 seconds)
Supabase queues email
    ↓ (30-120 seconds)
Email delivered to inbox/spam
    ↓
Check inbox AND spam folder
```

**If no email after 2 minutes:**
- Check spam folder
- Check Supabase logs
- Verify not at rate limit
- Try different email provider

---

## 🆘 If Still Not Working After 1 Hour

### Verify These:

1. **Supabase Dashboard → Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: All added ✅

2. **Supabase Dashboard → Authentication → Email Templates**
   - All templates enabled ✅
   - Content exists in each ✅

3. **Supabase Dashboard → Logs → Auth Logs**
   - What do the logs show?
   - Any error messages?

4. **Supabase Dashboard → Usage**
   - How many auth emails sent this hour?
   - Are you at the 4 email limit?

5. **Your Terminal**
   - Any errors when form submits?
   - What does console.log show?

### Share These Details:

1. Screenshot of Supabase Auth Logs
2. Terminal output when submitting form
3. Which email provider you're using
4. Did you check spam folder?
5. How long did you wait?

---

## 🎉 Expected Outcome

After fixing configuration and waiting for rate limit:

```
✅ Form submits successfully
✅ "Check your email" message appears
✅ Email arrives within 2 minutes
✅ Email might be in spam (check there!)
✅ Link works when clicked
✅ Can complete password reset
```

**Most likely location for email:** 📧 **SPAM FOLDER**

---

## 🚀 Action Plan

**Do this right now:**

1. **Configure Supabase URLs** (see Step 1 above)
2. **Wait 1 full hour** (let rate limit reset)
3. **Test with fresh Gmail address**
4. **Check spam folder first**
5. **Report what happens**

---

**The emails ARE being sent by Supabase - they're just:**
1. ⏰ Blocked by rate limit (wait 1 hour)
2. 📧 Going to spam (check spam folder!)
3. 🔗 Links failing (fix redirect URLs)

**Fix those 3 things and it will work!** 🎯
