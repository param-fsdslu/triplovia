# Authentication Setup Guide

## Overview
Complete authentication system with email verification, password reset, and user profiles using Supabase Auth.

---

## ✅ Completed Features

### 1. **User Registration with Full Name**
- First Name & Last Name fields
- Email & Password with confirmation
- Password strength indicator (real-time)
- Email verification flow
- **Location**: [ModernSignupForm.tsx](../components/auth/ModernSignupForm.tsx)

### 2. **User Login**
- Email & Password authentication
- Forgot password link
- Remember me functionality (via Supabase sessions)
- **Location**: [ModernLoginForm.tsx](../components/auth/ModernLoginForm.tsx)

### 3. **Password Reset Flow**
- Forgot password request
- Email with reset link
- Set new password page
- **Location**: [ModernForgotPasswordForm.tsx](../components/auth/ModernForgotPasswordForm.tsx)

### 4. **User Profiles**
- Extended user data beyond auth
- Full name (first + last)
- Auto-generated from user metadata
- **Schema**: [profiles-table-schema.sql](./profiles-table-schema.sql)

### 5. **Protected Routes**
- Dashboard, Profile, Settings require authentication
- Auto-redirect to login if not authenticated
- **Location**: [middleware.ts](../middleware.ts)

---

## 📋 Setup Instructions

### Step 1: Run the Profiles Table Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL file: [profiles-table-schema.sql](./profiles-table-schema.sql)

This creates:
- `profiles` table linked to `auth.users`
- Row Level Security policies
- Auto-trigger to create profile on signup
- Generated `full_name` column

### Step 2: Configure Email Settings (Production)

1. In Supabase Dashboard, go to **Authentication** → **Email Templates**
2. Configure:
   - **Confirm Signup**: Customize the email verification template
   - **Reset Password**: Customize the password reset template
   - **Magic Link** (optional)

3. Go to **Project Settings** → **Auth**
4. Set:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: Add your production URL

### Step 3: Environment Variables

Already configured in [.env.local](../.env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Change for production
```

---

## 🗂️ Database Schema

### Auth Users (Supabase Built-in)
```sql
auth.users
├── id (UUID, Primary Key)
├── email (VARCHAR, Unique)
├── encrypted_password
├── email_confirmed_at
├── created_at
├── updated_at
└── raw_user_meta_data (JSONB) → Stores first_name, last_name, full_name
```

### Profiles Table (Custom)
```sql
public.profiles
├── id (UUID, FK to auth.users.id)
├── first_name (VARCHAR)
├── last_name (VARCHAR)
├── full_name (VARCHAR, GENERATED)  // Auto: "first_name last_name"
├── phone (VARCHAR)
├── date_of_birth (DATE)
├── nationality (VARCHAR)
├── profile_image (TEXT)
├── bio (TEXT)
├── preferences (JSONB)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### How They Connect
1. User signs up → Supabase creates record in `auth.users`
2. Trigger automatically creates matching record in `public.profiles`
3. User metadata (first_name, last_name) stored in both:
   - `auth.users.raw_user_meta_data` (for quick access)
   - `public.profiles` (for extended profile data)

---

## 📁 File Structure

```
├── app/[locale]/auth/
│   ├── login/page.tsx              # Login page
│   ├── signup/page.tsx             # Signup page
│   ├── forgot-password/page.tsx    # Forgot password page
│   ├── reset-password/page.tsx     # Reset password page
│   └── callback/route.ts           # Email verification callback
│
├── components/auth/
│   ├── ModernLoginForm.tsx         # Login form component
│   ├── ModernSignupForm.tsx        # Signup form with name fields
│   ├── ModernForgotPasswordForm.tsx
│   ├── ResetPasswordForm.tsx
│   └── LogoutButton.tsx
│
├── lib/actions/auth.ts             # Server actions for auth
├── lib/supabase/
│   ├── client.ts                   # Browser Supabase client
│   ├── server.ts                   # Server Supabase client
│   ├── middleware.ts               # Session refresh
│   └── profiles.ts                 # Profile helper functions
│
└── middleware.ts                   # Route protection
```

---

## 🔐 Security Features

### Row Level Security (RLS)
```sql
-- Users can only view/update their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
```

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Real-time strength indicator

### Session Management
- HTTP-only cookies
- Auto-refresh on navigation
- Secure session storage

---

## 🎨 UI Components Used

### Shadcn UI Blocks
- **login-04**: Modern two-column login layout
- **signup-04**: Two-column signup with side image
- **Field Components**: Form fields with labels and descriptions

### Features
- Password strength visualization
- Loading states with spinners
- Error alerts
- Success messages
- Responsive design (mobile + desktop)
- Beautiful hotel imagery

---

## 🔄 User Flow

### Registration Flow
1. User fills signup form (name, email, password)
2. Form validates password strength
3. Server action calls Supabase `auth.signUp()`
4. User metadata includes `first_name`, `last_name`, `full_name`
5. Database trigger creates profile record
6. Supabase sends verification email
7. User sees success message
8. User clicks email link → Verified

### Login Flow
1. User enters email & password
2. Server action calls `auth.signInWithPassword()`
3. Session created
4. Redirect to dashboard
5. Dashboard shows personalized welcome: "Welcome back, [FirstName]!"

### Password Reset Flow
1. User clicks "Forgot Password"
2. Enters email address
3. Supabase sends reset email
4. User clicks link → Reset password page
5. Sets new password
6. Redirect to login

---

## 📊 Data Storage

### What's Stored Where?

**Supabase Auth (auth.users)**
- ✅ Email
- ✅ Password (encrypted)
- ✅ Email verification status
- ✅ User metadata: `{ first_name, last_name, full_name }`

**Profiles Table (public.profiles)**
- ✅ First name
- ✅ Last name
- ✅ Full name (auto-generated)
- ⏳ Phone (to be added via profile edit)
- ⏳ Date of birth (to be added)
- ⏳ Nationality (to be added)
- ⏳ Profile image (to be added)

---

## 🚀 Next Steps

### To Implement
- [ ] Profile editing page
- [ ] Upload profile image
- [ ] Change password (while logged in)
- [ ] Change email functionality
- [ ] Social authentication (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Session history
- [ ] Account deletion

### For Production
- [ ] Configure Supabase SMTP for custom emails
- [ ] Customize email templates
- [ ] Set up domain verification
- [ ] Configure rate limiting
- [ ] Add CAPTCHA to signup
- [ ] Set up monitoring/alerts

---

## 🐛 Troubleshooting

### Issue: Email not received
**Solution**: Check Supabase email settings. In development, check Supabase dashboard → Authentication → Logs

### Issue: Profile not created
**Solution**: Ensure you ran the profiles-table-schema.sql migration

### Issue: "User already registered"
**Solution**: Check if email exists in Supabase Auth users table

### Issue: Session expires quickly
**Solution**: Configure session duration in Supabase Auth settings

---

## 📝 Notes

- All passwords are hashed by Supabase (bcrypt)
- Email verification is optional but recommended
- User metadata is limited to 16KB
- Profile table can store unlimited additional data
- RLS ensures users can only access their own data

---

**Last Updated**: 2025-12-09
**Status**: ✅ Production Ready (after running migrations)
