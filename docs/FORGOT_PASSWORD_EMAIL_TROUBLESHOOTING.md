# Forgot Password Email Not Received - Troubleshooting Guide

## 🔍 Problem
You're not receiving forgot password emails when users request a password reset.

---

## ✅ Quick Fix Checklist

Follow these steps in order:

### Step 1: Add Missing Environment Variable

**Issue:** Your `.env.local` is missing `NEXT_PUBLIC_SITE_URL`

**Fix:** Add this to your `.env.local` file:

```env
# Add this line to .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Complete `.env.local` should have:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xfjizthnxphpgsptesvt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Site URL (IMPORTANT for password reset emails)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# For production, use your actual domain:
# NEXT_PUBLIC_SITE_URL=https://honnavartravels.com

# Other config...
```

**After adding, restart your dev server:**
```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

---

### Step 2: Check Supabase Email Settings

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt

2. **Navigate to:** Authentication → Email Templates

3. **Check "Reset Password" template:**
   - Click on "Reset Password"
   - Verify the template is enabled
   - Check the "Confirmation URL" setting

4. **Check Site URL Configuration:**
   - Go to: Authentication → URL Configuration
   - **Site URL** should be set to: `http://localhost:3000` (for dev)
   - **Redirect URLs** should include: `http://localhost:3000/auth/reset-password`

---

### Step 3: Verify Email Provider Settings

**Check which email provider Supabase is using:**

1. Go to: **Project Settings** → **Auth** → **SMTP Settings**

2. **Default (Supabase's Email Service):**
   - ⚠️ Has rate limits (very low for free tier)
   - ⚠️ Emails may go to spam
   - ⚠️ Might not work in development

3. **Custom SMTP (Recommended):**
   - Configure a custom email provider
   - Options: Gmail, SendGrid, Resend, Mailgun, etc.

---

### Step 4: Check Email Rate Limits

**Supabase Free Tier Limits:**
- Only **4 emails per hour** for auth emails
- Resets hourly

**To check if you hit the limit:**
1. Go to: **Project Settings** → **Usage**
2. Look for "Auth emails sent"
3. If you've sent multiple test emails, you may have hit the limit

**Solution:** Wait 1 hour or upgrade to paid tier

---

### Step 5: Test with Different Email Provider

**Check if it's an email provider issue:**

Test with different email addresses:
- ✅ Gmail
- ✅ Outlook/Hotmail
- ✅ Yahoo
- ✅ Corporate email

Some providers block Supabase's default email service.

---

## 🔧 Immediate Solutions

### Solution A: Add Environment Variable (Most Common Fix)

1. **Edit `.env.local`:**
   ```env
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Test again:**
   - Go to forgot password page
   - Enter email
   - Check inbox (and spam folder)

---

### Solution B: Configure Custom SMTP (Recommended)

Instead of using Supabase's default email service, configure a custom provider:

#### Option 1: Use Gmail SMTP

1. **Go to:** Supabase Dashboard → Project Settings → Auth → SMTP Settings

2. **Enable Custom SMTP**

3. **Gmail Settings:**
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: your-gmail@gmail.com
   Password: your-app-password (NOT your Gmail password!)
   Sender email: your-gmail@gmail.com
   Sender name: Honnavar Travels
   ```

4. **Get Gmail App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Create app password for "Mail"
   - Use that password in SMTP settings

#### Option 2: Use Resend (Better for Production)

You already have Resend configured for booking emails!

1. **Go to:** https://resend.com/api-keys
2. **Copy your API key**
3. **Update Supabase:**
   - Dashboard → Project Settings → Auth → Email Provider
   - Select "Resend"
   - Enter your API key
   - Set sender: `noreply@honnavartravels.com`

---

### Solution C: Update Supabase URL Configuration

1. **Go to:** Supabase Dashboard → Authentication → URL Configuration

2. **Set these URLs:**
   ```
   Site URL: http://localhost:3000

   Redirect URLs:
   - http://localhost:3000/auth/callback
   - http://localhost:3000/auth/reset-password
   - http://localhost:3000/**
   ```

3. **Save changes**

4. **Test again**

---

## 🧪 Testing & Debugging

### Debug Step 1: Check if Request is Successful

Add console logging to see what's happening:

**Edit `lib/actions/auth.ts`:**

```typescript
export async function resetPasswordRequest(
  _prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const email = formData.get('email') as string

  console.log('🔍 Reset password request for:', email)
  console.log('🔍 Redirect URL:', `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`)

  const supabase = await createClient()

  const { error, data } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  console.log('📧 Email request result:', { error, data })

  if (error) {
    console.error('❌ Error sending reset email:', error)
    return { error: error.message }
  }

  console.log('✅ Reset email sent successfully')
  return { success: true }
}
```

**Check your terminal output when testing**

---

### Debug Step 2: Check Supabase Logs

1. **Go to:** Supabase Dashboard → Logs → Auth Logs

2. **Look for:**
   - Password reset requests
   - Email sending attempts
   - Any errors

3. **Filter by:** Your email address

---

### Debug Step 3: Verify Email in Supabase

1. **Go to:** Supabase Dashboard → Authentication → Users

2. **Find your user**

3. **Check:**
   - ✅ Email is confirmed
   - ✅ Email address is correct
   - ✅ User is not banned

---

## 📋 Common Issues & Solutions

### Issue 1: Email Goes to Spam

**Symptoms:**
- Email is sent but not in inbox
- Check spam/junk folder

**Solutions:**
1. Check spam folder
2. Add `noreply@supabase.io` to contacts
3. Configure custom SMTP with your domain
4. Use Resend with verified domain

---

### Issue 2: Rate Limit Exceeded

**Symptoms:**
- First email works, subsequent ones don't
- Error in logs: "rate limit exceeded"

**Solutions:**
1. Wait 1 hour
2. Upgrade Supabase plan
3. Use custom SMTP provider

---

### Issue 3: Wrong Redirect URL

**Symptoms:**
- Email arrives but link goes to wrong page
- 404 error when clicking link

**Solutions:**
1. Check `NEXT_PUBLIC_SITE_URL` in `.env.local`
2. Verify Supabase "Site URL" setting
3. Ensure reset-password page exists at `/auth/reset-password`

---

### Issue 4: Email Template Disabled

**Symptoms:**
- No emails sent at all
- No errors shown

**Solutions:**
1. Go to: Authentication → Email Templates
2. Check "Reset Password" is enabled
3. Verify template content exists

---

### Issue 5: Development Mode Blocking

**Symptoms:**
- Works in production but not locally
- Supabase blocks emails to unverified domains

**Solutions:**
1. Use custom SMTP
2. Test with real domain
3. Configure Resend for local development

---

## 🚀 Recommended Setup (Production-Ready)

### Step 1: Update Environment Variables

```env
# .env.local (Development)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# .env.production (Production)
NEXT_PUBLIC_SITE_URL=https://honnavartravels.com
```

### Step 2: Configure Custom Email Provider

**Use Resend (Recommended):**

1. Go to https://resend.com
2. Add and verify your domain
3. Get API key
4. Configure in Supabase:
   - Dashboard → Settings → Auth
   - Select Resend
   - Add API key
   - Set sender: `noreply@honnavartravels.com`

### Step 3: Configure Email Templates

**Customize the reset email template:**

1. Go to: Authentication → Email Templates → Reset Password

2. **Update template:**
   ```html
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
     <div style="background: #f8f9fa; padding: 20px; text-align: center;">
       <h1 style="color: #1a1a1a;">Honnavar Travels</h1>
     </div>

     <div style="padding: 40px 20px;">
       <h2 style="color: #1a1a1a;">Reset Your Password</h2>
       <p style="color: #666; font-size: 16px; line-height: 24px;">
         You requested to reset your password. Click the button below to set a new password:
       </p>

       <div style="text-align: center; margin: 30px 0;">
         <a href="{{ .ConfirmationURL }}"
            style="background: #3b82f6; color: white; padding: 12px 30px;
                   text-decoration: none; border-radius: 5px; display: inline-block;">
           Reset Password
         </a>
       </div>

       <p style="color: #999; font-size: 14px;">
         If you didn't request this, you can safely ignore this email.
       </p>

       <p style="color: #999; font-size: 14px;">
         This link expires in 24 hours.
       </p>
     </div>

     <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #999;">
       <p style="margin: 0; font-size: 14px;">
         © 2025 Honnavar Travels. All rights reserved.
       </p>
     </div>
   </div>
   ```

3. **Save template**

### Step 4: Test the Complete Flow

1. Request password reset
2. Check inbox
3. Click link
4. Reset password
5. Login with new password

---

## 📊 Verification Checklist

Use this checklist to verify everything is set up correctly:

```
Environment Variables:
□ NEXT_PUBLIC_SITE_URL is set
□ NEXT_PUBLIC_SUPABASE_URL is correct
□ NEXT_PUBLIC_SUPABASE_ANON_KEY is correct

Supabase Configuration:
□ Site URL matches NEXT_PUBLIC_SITE_URL
□ Redirect URLs include /auth/reset-password
□ Reset Password email template is enabled
□ Email template has correct confirmation URL
□ Custom SMTP configured (optional but recommended)

Testing:
□ Can access /auth/forgot-password page
□ Form submits without errors
□ Success message appears
□ Email arrives in inbox (check spam too)
□ Reset link works
□ Can set new password
□ Can login with new password

Email Provider:
□ Using custom SMTP or Resend (recommended)
□ OR within Supabase free tier limits (4 emails/hour)
□ Sender email is verified
□ Domain is verified (if using custom domain)
```

---

## 🎯 Quick Test Commands

### Test 1: Check Environment Variable

```bash
# In your project root
node -e "console.log(process.env.NEXT_PUBLIC_SITE_URL)"
```

Should output: `http://localhost:3000`

If `undefined`, add it to `.env.local`

---

### Test 2: Test Supabase Connection

Create a test file: `test-reset-email.js`

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xfjizthnxphpgsptesvt.supabase.co',
  'your-anon-key-here'
)

async function testResetEmail() {
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    'your-test-email@gmail.com',
    {
      redirectTo: 'http://localhost:3000/auth/reset-password',
    }
  )

  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Success! Check your email.')
  }
}

testResetEmail()
```

Run:
```bash
node test-reset-email.js
```

---

## 💡 Most Likely Solution

**Based on your current setup, the issue is:**

1. ❌ Missing `NEXT_PUBLIC_SITE_URL` environment variable
2. ⚠️ Using Supabase's default email (limited to 4/hour)
3. ⚠️ Possible rate limit hit from testing

**Fix:**

```bash
# 1. Add to .env.local
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" >> .env.local

# 2. Restart server
npm run dev

# 3. Wait 1 hour if you hit rate limit

# 4. Test with fresh email address
```

---

## 📞 Still Not Working?

If emails still aren't arriving after following all steps:

### Check Supabase Auth Logs

1. Dashboard → Logs → Auth Logs
2. Look for errors
3. Share error message for further help

### Verify Email Provider

1. Test with multiple email providers (Gmail, Outlook, Yahoo)
2. Check spam folders
3. Try with a fresh email that hasn't been used for testing

### Contact Supabase Support

If it's a Supabase issue:
- Dashboard → Help → Support
- Describe the issue
- Mention you've checked SMTP settings

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Form submits without errors
2. ✅ Green success message appears
3. ✅ Email arrives within 1-2 minutes
4. ✅ Link in email works
5. ✅ Can reset password successfully
6. ✅ Can login with new password

---

## 📁 Summary

**Most Common Fix:**
```bash
# Add this to .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Restart server
npm run dev
```

**Long-term Solution:**
- Configure custom SMTP (Gmail or Resend)
- Verify your domain
- Set up proper email templates

**Need Help?**
- Check Supabase logs for specific errors
- Test with different email providers
- Verify rate limits haven't been hit
