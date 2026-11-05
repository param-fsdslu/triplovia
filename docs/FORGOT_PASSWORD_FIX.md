# 🚨 Forgot Password Email Not Working - QUICK FIX

## ✅ Issue Fixed!

I've added the missing environment variable to your `.env.local` file.

---

## 🔧 What Was Wrong

Your `.env.local` was missing `NEXT_PUBLIC_SITE_URL` which is required for password reset emails.

---

## ✅ What I Fixed

Added to `.env.local`:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🚀 Next Steps

### 1. Restart Your Dev Server

**IMPORTANT:** You must restart for the changes to take effect.

```bash
# Press Ctrl+C to stop the server
# Then restart:
npm run dev
```

### 2. Test Forgot Password Flow

1. Go to: http://localhost:3000/en/auth/login
2. Click "Forgot Password?"
3. Enter your email
4. Check your inbox (and spam folder!)

---

## ⚠️ Additional Issues to Check

### Issue 1: Email Goes to Spam
- ✅ **Check spam/junk folder**
- The email might be there!

### Issue 2: Rate Limit (Supabase Free Tier)
Supabase free tier only allows **4 auth emails per hour**.

**If you've been testing:**
- Wait 1 hour before testing again
- OR configure custom SMTP

### Issue 3: Email Provider Blocking
Some email providers block Supabase's default sender.

**Try testing with:**
- Gmail
- Outlook
- Different email provider

---

## 🔍 Check Supabase Settings

Go to your Supabase Dashboard and verify:

### 1. URL Configuration
**Path:** Authentication → URL Configuration

Should have:
```
Site URL: http://localhost:3000

Redirect URLs:
- http://localhost:3000/**
- http://localhost:3000/auth/reset-password
```

### 2. Email Template
**Path:** Authentication → Email Templates → Reset Password

- ✅ Template should be **enabled**
- ✅ Confirmation URL should be set

### 3. Check Logs
**Path:** Logs → Auth Logs

Look for:
- Password reset requests
- Email sending attempts
- Any errors

---

## 📧 Recommended: Configure Custom Email Provider

For better email delivery, set up a custom SMTP provider:

### Option 1: Gmail SMTP (Quick Setup)

1. Go to: Supabase Dashboard → Settings → Auth → SMTP
2. Enable Custom SMTP
3. Configure:
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: your-gmail@gmail.com
   Password: [Gmail App Password]
   ```
4. Get Gmail App Password: https://myaccount.google.com/apppasswords

### Option 2: Resend (Recommended)

You already have Resend configured!

1. Go to: https://resend.com/api-keys
2. Copy your API key
3. In Supabase: Settings → Auth → Email Provider
4. Select "Resend"
5. Enter API key
6. Set sender: `noreply@honnavartravels.com`

---

## 🧪 Testing Checklist

```
□ Restart dev server (npm run dev)
□ Clear browser cache
□ Go to forgot password page
□ Submit form with valid email
□ Check inbox
□ Check spam folder
□ Wait 1-2 minutes for email
□ Click reset link
□ Reset password
□ Login with new password
```

---

## 📱 Quick Debug Commands

### Check if environment variable is loaded:
```bash
# Run this in your project directory
node -e "console.log('Site URL:', process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET')"
```

Should output: `Site URL: http://localhost:3000`

---

## 🆘 Still Not Working?

### 1. Check Server Logs
Look at your terminal where `npm run dev` is running.
You should see requests when submitting the forgot password form.

### 2. Add Debug Logging

Edit `lib/actions/auth.ts` and add console.log:

```typescript
export async function resetPasswordRequest(
  _prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const email = formData.get('email') as string

  console.log('🔍 Sending reset email to:', email)
  console.log('🔍 Redirect URL:', process.env.NEXT_PUBLIC_SITE_URL)

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  console.log('📧 Result:', error ? 'ERROR' : 'SUCCESS')

  // ... rest of code
}
```

### 3. Check Supabase Dashboard

Go to: **Logs** → **Auth Logs**

Filter by your email to see if the request is reaching Supabase.

---

## 📚 Full Documentation

For complete troubleshooting guide, see:
- [FORGOT_PASSWORD_EMAIL_TROUBLESHOOTING.md](docs/FORGOT_PASSWORD_EMAIL_TROUBLESHOOTING.md)

---

## ✅ Summary

**What was done:**
1. ✅ Added `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local`

**What you need to do:**
1. 🔄 **Restart your dev server** (Ctrl+C then `npm run dev`)
2. 🧪 **Test forgot password** again
3. 📧 **Check inbox AND spam folder**
4. ⏰ **Wait 1 hour** if you hit rate limit from testing

**Most likely outcome:**
- Emails should now work! 🎉
- If still not working, check spam folder
- If still nothing, configure custom SMTP (see above)

---

## 🎯 Quick Links

- **Forgot Password Page:** http://localhost:3000/en/auth/forgot-password
- **Supabase Dashboard:** https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt
- **Auth Settings:** https://supabase.com/dashboard/project/xfjizthnxphpgsptesvt/auth/url-configuration

---

**Last Updated:** 2025-01-15
