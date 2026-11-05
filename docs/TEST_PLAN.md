# Honnavar Travels — Complete Test Plan

> **Version:** 1.0
> **Date:** March 2026
> **App:** Honnavar Travels (Next.js 15, Supabase, Razorpay)
> **Environments:** Development (`localhost:3000`) / Staging

---

## Test Users Required

| Role | How to Create | Access Level |
|------|--------------|--------------|
| **Guest (unauthenticated)** | No login needed | Public pages only |
| **Regular User A** | Sign up via `/auth/signup` | Dashboard, bookings, profile |
| **Regular User B** | Sign up via `/auth/signup` | Used to test cross-user isolation |
| **Hotel Admin** | Super admin creates via `/admin/users`, assigns hotel_ids | Specific hotel(s) only |
| **Super Admin** | Pre-seeded in Supabase DB with role `super_admin` | Full admin panel |

### Razorpay Test Credentials
```
Test card:   4111 1111 1111 1111  (any future expiry, any CVV)
UPI success: success@razorpay
UPI failure: failure@razorpay
Net banking: Use any test bank, select "Success"
```

---

## SECTION 1 — Public / Guest Access

### 1.1 Homepage

- [ ] Homepage loads at `/` and locale variants `/en`, `/es`, `/fr`
- [ ] Hero section renders with search widget
- [ ] Search widget shows **Hotels** tab only (Boats hidden — feature flag `false`)
- [ ] Featured hotels section loads with real hotel data
- [ ] Featured blogs section loads
- [ ] Language switcher changes locale and persists across navigation
- [ ] Navbar shows **Login** and **Sign Up** links (no user menu)
- [ ] Footer boat / bikes / cabs links are hidden (disabled features)
- [ ] Hero subtitle lists only enabled services

### 1.2 Hotel Search & Listing (`/hotels`)

- [ ] Hotels page loads with search form pre-filled from homepage search (Zustand store)
- [ ] Search by location returns filtered results
- [ ] Date range picker: check-in and check-out selectable
- [ ] Past dates disabled in calendar
- [ ] Guest selector (Adults / Children / Rooms) increments and decrements correctly
- [ ] Minimum Adults = 1 (cannot go below)
- [ ] Price range filter updates results
- [ ] Star rating filter (1–5 stars) works
- [ ] Property type filter (hotel, resort, villa, guesthouse, etc.) works
- [ ] Amenity checkboxes filter results
- [ ] Sort by price (low→high, high→low), rating, name works
- [ ] URL search params update when any filter changes
- [ ] Refreshing page with params in URL restores filter state
- [ ] Pagination loads next/previous pages
- [ ] Empty state message shown when no results match
- [ ] Hotel cards display: name, thumbnail image, star rating, price per night, property type

### 1.3 Hotel Detail Page (`/hotels/[slug]`)

- [ ] Hotel detail page loads for a valid slug
- [ ] Image gallery displays all hotel images
- [ ] Hotel description, address, star rating display
- [ ] Hotel amenities list correctly
- [ ] Room types display with name, images, capacity, base price, amenities
- [ ] Approved reviews display with rating breakdown (overall + categories)
- [ ] Average rating score shown correctly
- [ ] **Book Now** button visible; redirects to booking form
- [ ] Invalid slug returns **404** page
- [ ] SEO: page title and meta description reflect hotel name

### 1.4 Blog (`/blog`, `/blog/[slug]`)

- [ ] Blog listing page loads with published blogs
- [ ] Blog cards show title, cover image, author name, publish date, tags
- [ ] Individual blog post loads for valid slug
- [ ] Rich text content renders: headings, images, links, formatted text
- [ ] Tags display on blog post
- [ ] Invalid blog slug returns **404**

### 1.5 Feature Flag Enforcement

- [ ] `/boats` returns **404** (feature disabled)
- [ ] `/boat-bookings/*` returns **404**
- [ ] `/en/boats` returns **404**
- [ ] Boats tab absent from search widget
- [ ] Boats section absent from homepage
- [ ] Boats link absent from footer and navbar

---

## SECTION 2 — Authentication

### 2.1 Sign Up (`/auth/signup`)

- [ ] Form renders: First Name, Last Name, Email, Password fields
- [ ] Empty field submission shows validation errors per field
- [ ] Invalid email format shows error
- [ ] Weak password (< 8 chars) shows error
- [ ] Successful signup creates account and redirects to `/dashboard`
- [ ] Duplicate email shows "Email already registered" error
- [ ] Already authenticated user visiting `/auth/signup` redirects to `/dashboard`
- [ ] First name and last name stored in `user_metadata`

### 2.2 Login (`/auth/login`)

- [ ] Form renders: Email, Password fields
- [ ] Wrong password shows error message
- [ ] Non-existent email shows error (no user enumeration — same message as wrong password)
- [ ] Valid credentials authenticate and redirect to `/dashboard`
- [ ] Already authenticated user visiting `/auth/login` redirects to `/dashboard`
- [ ] **Forgot password** link navigates to `/auth/forgot-password`
- [ ] Post-login redirect: user going to `/dashboard` → login → redirected back to `/dashboard`

### 2.3 Forgot Password (`/auth/forgot-password`)

- [ ] Form accepts email input
- [ ] Submitting valid email triggers password reset email (check inbox)
- [ ] Reset email arrives within 2 minutes
- [ ] Reset link in email is valid and navigates to `/auth/reset-password`
- [ ] Submitting unknown email shows consistent response (no user enumeration)

### 2.4 Reset Password (`/auth/reset-password`)

- [ ] Page accessible only with valid token from email link
- [ ] New password + confirm password mismatch shows error
- [ ] Password too short shows validation error
- [ ] Successful reset redirects to login with success message
- [ ] Expired or invalid token shows clear error message
- [ ] Old password no longer works after reset; new password works

### 2.5 Sign Out

- [ ] Clicking sign out clears session and redirects to homepage
- [ ] After sign out, accessing `/dashboard` redirects to `/auth/login`
- [ ] After sign out, user menu no longer visible in navbar
- [ ] Session cleared across browser tabs after sign out

### 2.6 Session Handling

- [ ] Session persists across page refreshes
- [ ] Session persists after closing and reopening browser tab
- [ ] Expired session (Supabase token expiry) redirects to login gracefully — no crash
- [ ] Simultaneous sessions in two browser tabs both authenticated

---

## SECTION 3 — Regular User (Authenticated)

### 3.1 Dashboard (`/dashboard`)

- [ ] Dashboard loads after login
- [ ] Stat cards show correct counts: total bookings, upcoming trips, total spent
- [ ] Upcoming bookings list shows hotel name, dates, status badge, reference
- [ ] Past bookings listed separately
- [ ] Cancelled bookings shown with cancelled badge
- [ ] Empty state shown when user has no bookings
- [ ] Clicking a booking navigates to its detail page

### 3.2 Hotel Booking Flow

#### Step 1 — Booking Form (`/hotels/[slug]/book`)

- [ ] Booking form loads for a published hotel
- [ ] Check-in / check-out dates pre-filled from search store
- [ ] Guest count pre-filled from search store
- [ ] Guest details pre-filled from Zustand booking store (if previously used)
- [ ] Room type options listed with name, capacity, price
- [ ] Selecting different room type updates price summary
- [ ] Meal plan selector shows available plans with per-person pricing
- [ ] Price summary shows: room total + meal total + taxes + service charge = grand total
- [ ] Required fields: First Name, Last Name, Email, Phone — validated on submit
- [ ] Phone number format validation
- [ ] Submitting valid form creates booking and redirects to `/bookings/BK-YYYYMMDD-XXXX`
- [ ] Booking reference format is `BK-YYYYMMDD-XXXX`
- [ ] Unauthenticated user redirected to login when accessing booking form

#### Step 2 — Booking Confirmation Page (`/bookings/[reference]`)

- [ ] Booking details display: hotel name, room type, check-in, check-out, guest count, meal plan, total
- [ ] Guest contact details shown (name, email, phone)
- [ ] **Pay Now** button visible for `pending` / `processing` payment status
- [ ] **Pay Now** button disabled and shows loading until Razorpay script loads
- [ ] Pay Now button absent for already-paid bookings
- [ ] Booking reference matches URL and is displayed on page

#### Step 3 — Payment (Razorpay Modal)

- [ ] Clicking Pay Now opens Razorpay checkout modal
- [ ] Modal pre-fills: guest name, email, phone
- [ ] Completing payment with test card processes successfully
- [ ] Completing payment with UPI `success@razorpay` processes successfully
- [ ] On success: page redirects to `/payment/success?bookingRef=BK-...`
- [ ] Dismissing Razorpay modal without paying shows alert/message; booking remains unpaid
- [ ] Failed payment (`failure@razorpay`) shows error; booking remains `pending`

#### Step 4 — Post-Payment

- [ ] `/payment/success` page shows booking reference and confirmation message
- [ ] Booking detail page reflects `confirmed` status and `paid` payment status
- [ ] Pay Now button no longer visible on confirmed booking
- [ ] Payment receipt email arrives in guest inbox within 2–3 minutes
- [ ] Email contains: booking reference, hotel name, dates, amount paid, Razorpay payment ID
- [ ] Booking appears in `/bookings` list under Upcoming tab

### 3.3 Bookings List (`/bookings`)

- [ ] Lists only the logged-in user's bookings (not other users')
- [ ] Upcoming / Past / Cancelled filter tabs work
- [ ] Clicking booking navigates to detail page
- [ ] Booking reference, hotel name, dates, status, amount shown per row
- [ ] Pagination works if many bookings

### 3.4 Cancellation & Refund (User-Initiated)

- [ ] **Cancel** button visible on confirmed, paid bookings
- [ ] Cancel button absent on already-cancelled or checked-in bookings
- [ ] Cancellation confirmation dialog appears before proceeding
- [ ] Cancelling >= 48h before check-in: refund eligibility shows 100%
- [ ] Cancelling < 48h before check-in: refund eligibility shows 0%
- [ ] After cancellation: booking status changes to `cancelled`
- [ ] Refund status shows `pending_approval` (awaiting admin review)
- [ ] Refund request confirmation email received in guest inbox
- [ ] Cancelled booking moves to Cancelled tab in `/bookings`

### 3.5 Review Submission

- [ ] Review button visible only on `completed` + `paid` bookings
- [ ] Review button absent on pending / confirmed / cancelled bookings
- [ ] `ReviewDialog` opens with 1–5 star overall rating input
- [ ] Category ratings shown: staff, facilities, cleanliness, comfort, value, location, free_wifi
- [ ] Text review field (optional or required, per config)
- [ ] Image upload: accepts JPEG/PNG/WebP; rejects PDF/EXE etc.
- [ ] Image upload rejects files over 5MB
- [ ] Successful submission shows success toast/message
- [ ] Review button disabled after submission (one review per booking)
- [ ] Submitted review shows status `pending` — not visible on hotel page until admin approves

### 3.6 Profile (`/profile`)

- [ ] Profile page shows current: first name, last name, phone number
- [ ] Edit form updates values and saves correctly
- [ ] Changes persist after page refresh (TanStack Query invalidation)
- [ ] Profile picture upload: accepts JPEG/PNG/WebP under 5MB
- [ ] Profile picture updates in navbar user menu after upload
- [ ] Delete account section present with confirmation step

### 3.7 Cross-User Data Isolation

- [ ] User A cannot view User B's booking by guessing the reference in the URL
- [ ] User A cannot pay for User B's booking
- [ ] User A cannot submit a review for User B's booking
- [ ] API returns 403 / error when ownership check fails

---

## SECTION 4 — Hotel Admin

> Hotel admins access only hotels assigned in `user_metadata.hotel_ids[]`.

### 4.1 Access & Restrictions

- [ ] `/admin` panel loads for hotel_admin role
- [ ] Admin sidebar shows: Hotels, Bookings only (no Users, Analytics, Boats, Settings, Blogs, Payments, Refunds)
- [ ] Hotels list shows **only assigned hotels** — not all hotels
- [ ] Attempting to edit an unassigned hotel via direct URL → redirect or 403
- [ ] Attempting to access `/admin/users` → redirect or 403
- [ ] Attempting to access `/admin/analytics` → redirect or 403

### 4.2 Hotel Editing (assigned hotels only)

- [ ] Edit hotel: update name, description, location, star rating
- [ ] Change hotel status (draft → active → inactive)
- [ ] Save changes; verify on guest-facing hotel detail page
- [ ] Cannot create new hotels (super_admin only — verify UI button absent)

### 4.3 Room Type Management

- [ ] View room types for assigned hotel
- [ ] Create room type: name, max capacity, base price, description, beds configuration
- [ ] Edit room type details and pricing
- [ ] Delete room type (confirm dialog; only if no active bookings)
- [ ] New room type appears on hotel detail page

### 4.4 Images Management

- [ ] Upload hotel cover and gallery images
- [ ] File type validation: JPEG/PNG/WebP accepted; other types rejected
- [ ] File size validation: max 5MB; larger files rejected with error
- [ ] Reorder images (if UI supports drag & drop)
- [ ] Delete image: removed from hotel page and Supabase storage
- [ ] Upload room type images

### 4.5 Amenities Management

- [ ] Select hotel amenities from master amenity list
- [ ] Selected amenities save and appear on hotel detail page
- [ ] Select room type amenities
- [ ] Unselect amenity: removed from detail page

### 4.6 Bookings (assigned hotels only)

- [ ] Bookings list shows only bookings for assigned hotels
- [ ] Filter by status: pending, confirmed, checked_in, checked_out, cancelled
- [ ] Filter by date range
- [ ] Search by guest name or booking reference
- [ ] View booking detail: guest contact, room, dates, meal plan, payment status
- [ ] Update status: `confirmed` → `checked_in` → `checked_out`
- [ ] Status update triggers email to guest (booking status update email)
- [ ] Cannot access or modify bookings for unassigned hotels

---

## SECTION 5 — Super Admin

> Full system access. Tests here supplement hotel_admin tests above.

### 5.1 Admin Dashboard (`/admin`)

- [ ] Dashboard loads with accurate stats: total hotels, bookings, revenue, users
- [ ] Recent activity feed shows latest bookings across all hotels
- [ ] Revenue figure matches sum of confirmed/paid bookings

### 5.2 Hotel Management (all hotels)

- [ ] View all hotels across the system
- [ ] Create new hotel: name, slug, description, location, address, star rating, status, contact info
- [ ] Slug auto-generated from name; can be manually edited
- [ ] Edit any hotel (not limited to assigned ones)
- [ ] Delete hotel with confirmation (verify dependent data behaviour)
- [ ] New hotel appears on guest-facing `/hotels` page after status set to active

### 5.3 All Bookings (`/admin/bookings`)

- [ ] All hotel bookings listed (all hotels, all users)
- [ ] Search by: booking reference, guest name, guest email
- [ ] Filter by: status, date range, hotel
- [ ] View full booking detail: guest info, room, dates, payment status, payment ID
- [ ] Update any booking's status
- [ ] Status change emails fire correctly

### 5.4 Payments (`/admin/payments`)

- [ ] All payment transactions listed
- [ ] Filter by status: pending, paid, refunded, failed
- [ ] View payment detail: amount, Razorpay payment ID, payment method, timestamp
- [ ] Failed payments clearly identifiable
- [ ] Refunded payments show refund ID

### 5.5 Refunds (`/admin/refunds`)

- [ ] All refund transactions listed with status: pending_approval, processing, completed, failed
- [ ] Pending customer-initiated refund requests visible
- [ ] Admin approves and processes refund → calls Razorpay refund API
- [ ] Refund processed: booking `payment_status` updates to `refunded` or `partially_refunded`
- [ ] Cancellation email with refund amount and "5–7 business days" timeline sent to guest
- [ ] Admin can initiate refund directly from booking detail page
- [ ] Refund amount correctly calculated per policy:
  - >= 48h before check-in → 100% refund
  - < 48h before check-in → 0% refund
- [ ] Partial refund scenario (if supported) handled correctly

### 5.6 Blogs (`/admin/blogs`)

- [ ] Blog list shows all blogs with status column (draft / published / archived)
- [ ] **Create** new blog: title, body (Tiptap editor), cover image, meta_title, meta_description, tags
- [ ] Slug auto-generated from title; collision handled (appends suffix)
- [ ] Publish blog → visible on `/blog` listing immediately (or after revalidation)
- [ ] Archive blog → removed from public listing
- [ ] Tiptap editor works: bold, italic, headings, links, images, text color, alignment
- [ ] Upload inline blog image via Tiptap image extension
- [ ] Delete blog with confirmation
- [ ] Edit blog: existing content loads in editor correctly

### 5.7 User Management (`/admin/users`)

- [ ] All users listed: email, role, created date, hotel assignments
- [ ] Create new `hotel_admin` user: email, first name, last name, assign hotel_ids
- [ ] New hotel_admin receives invite / can log in
- [ ] Edit user: change role between `hotel_admin` and `super_admin`
- [ ] Edit user: update assigned hotel_ids
- [ ] Delete user with confirmation
- [ ] Deleted user can no longer log in
- [ ] Role changes take effect on next login (or immediately via session refresh)

### 5.8 Analytics (`/admin/analytics`)

- [ ] Analytics page loads without JS errors
- [ ] Revenue chart renders with real data
- [ ] Booking trend graph renders
- [ ] Date range selector changes data shown

### 5.9 Admin Settings (`/admin/settings`)

- [ ] Settings page loads
- [ ] Meal plan master settings editable (if available)
- [ ] Refund policy settings editable (if available)

---

## SECTION 6 — Boat Feature (when `boats: true`)

> Enable by setting `boats: true` in `lib/config/features.ts`. Re-test feature flag section after enabling.

### 6.1 Feature Flag Toggle

- [ ] After enabling: Boats tab appears in search widget
- [ ] After enabling: Boats section appears on homepage
- [ ] After enabling: `/boats` returns 200 (not 404)
- [ ] After enabling: `/boat-bookings/*` routes accessible
- [ ] After enabling: Admin sidebar shows **Boats** and **Boat Bookings**

### 6.2 Boat Search & Listing

- [ ] `/boats` page loads with filters
- [ ] Single date picker (`boatDate`) works in search widget boat tab
- [ ] Boat cards show: name, boat type, capacity, price, thumbnail
- [ ] Boat type filter works (motorboat, speedboat, houseboat, etc.)
- [ ] Price filter works
- [ ] Amenity filter works

### 6.3 Boat Detail & Booking Flow

- [ ] Boat detail page loads with trip types listed
- [ ] Selecting trip type shows available time slots for selected date
- [ ] `useAvailableSlots` correctly marks booked slots as unavailable
- [ ] Booking form creates boat booking (reference format: `BB-YYYYMMDD-XXXX`)
- [ ] Payment flow works identically to hotel payment
- [ ] Boat booking receipt email received

### 6.4 Boat Cancellation

- [ ] Boat cancellation respects `free_cancellation_hours` per trip type (not fixed 48h)
- [ ] Refund eligibility calculated against `free_cancellation_hours`

### 6.5 Boat Admin (super_admin)

- [ ] Create / edit / delete boats
- [ ] Manage trip types: name, pricing model (per_person / per_boat), duration, free_cancellation_hours
- [ ] Manage time slots per trip type
- [ ] Upload boat images and trip type images
- [ ] View all boat bookings
- [ ] Update boat booking status
- [ ] Process boat booking refunds

---

## SECTION 7 — Edge Cases & Security

### 7.1 Authorization Boundaries

- [ ] Regular user cannot access `/admin/*` — redirected or 403
- [ ] hotel_admin cannot read/write another hotel's data via direct URL
- [ ] User A cannot view User B's booking by guessing reference (API ownership check)
- [ ] User cannot pay for another user's booking (server-side user verification)
- [ ] User cannot submit review for another user's booking

### 7.2 Payment Security

- [ ] Payment amount is fetched from DB — changing amount in client request has no effect
- [ ] Tampered Razorpay `razorpay_signature` rejected with 400 by `/api/payment/verify`
- [ ] Replaying a previously used `razorpay_payment_id` rejected (idempotency check)
- [ ] Razorpay webhook with incorrect `RAZORPAY_WEBHOOK_SECRET` rejected with 400
- [ ] Double-clicking Pay Now does not create duplicate payment orders
- [ ] Network failure mid-payment: booking status remains `processing`; re-paying works

### 7.3 Image Upload Validation

- [ ] Non-image file (`.pdf`, `.txt`, `.exe`) upload rejected with clear error
- [ ] Image over 5MB rejected with clear error
- [ ] Valid JPEG / PNG / WebP under 5MB uploads successfully
- [ ] Uploaded image path stored in `storage_path` column for clean deletion

### 7.4 Form & Input Validation

- [ ] All required booking fields validated before submission
- [ ] HTML or script tags in review text are not executed (XSS check)
- [ ] Special characters in hotel search (e.g. `<`, `>`, `"`, `'`) do not break results
- [ ] SQL injection attempts in search inputs handled gracefully (no DB errors exposed)

### 7.5 Booking Reference Collision

- [ ] Generating multiple bookings rapidly does not produce duplicate references
- [ ] `generateBookingReference()` collision-safe loop retries on duplicate

### 7.6 Feature Flag — Direct URL Enforcement

- [ ] `/boats` → 404 when `boats: false`
- [ ] `/boat-bookings/BB-123` → 404 when `boats: false`
- [ ] `/api/boats/featured` → 404 when `boats: false`
- [ ] `/admin/boats` → 404 when `boats: false`

---

## SECTION 8 — Email Notifications

Verify each trigger fires and email content is correct:

| Trigger | Action | Expected Email | Recipient |
|---------|--------|---------------|-----------|
| Payment verified | Complete Razorpay payment | Payment receipt with booking ref, amount, hotel, dates | Guest |
| Customer cancels | Click Cancel on booking | Refund request confirmation, "pending admin review" | Guest |
| Admin processes refund | Admin approves refund | Cancellation + refund amount + "5–7 business days" | Guest |
| Admin updates status | checked_in / checked_out | Status update notification | Guest |
| Password reset | Submit forgot password | Reset link email | User |

- [ ] All emails render correctly in Gmail, Outlook, Apple Mail (check inline CSS)
- [ ] Sender address shows as configured `EMAIL_FROM` env var
- [ ] Booking reference in email matches booking reference in app
- [ ] Email delivered within 2–3 minutes of trigger

---

## SECTION 9 — UI / UX & Responsiveness

### 9.1 Responsive Layout

- [ ] Homepage: mobile (375px), tablet (768px), desktop (1280px+)
- [ ] Search widget collapses cleanly on mobile
- [ ] Hotel / boat cards stack to single column on mobile
- [ ] Booking form is fully usable on mobile (no overflow, all fields accessible)
- [ ] Admin panel usable on tablet; sidebar collapses on mobile

### 9.2 Loading & Error States

- [ ] Skeleton loaders display during TanStack Query data fetch
- [ ] Empty state with helpful message shown when hotel search returns 0 results
- [ ] Empty state shown on Bookings page when user has no bookings
- [ ] Error state shown if API call fails (network error, 500)
- [ ] 404 page shown for invalid routes (custom or Next.js default)

### 9.3 Navigation & UX

- [ ] Mobile menu opens and closes correctly
- [ ] User dropdown shows correct full name after login
- [ ] Active nav links highlighted
- [ ] Locale switcher changes language without losing current page context
- [ ] Back navigation from booking detail returns to bookings list
- [ ] Breadcrumbs or back buttons present on detail pages

---

## SECTION 10 — Regression Checklist

Run after any significant code change:

- [ ] Homepage loads without console errors
- [ ] Hotel search returns results
- [ ] New user can sign up, log in, and reach dashboard
- [ ] Full booking flow completes end-to-end (test card payment)
- [ ] Admin can view all bookings from admin panel
- [ ] Feature flags enforce correctly: boats → 404
- [ ] i18n routes load: `/en`, `/es`, `/fr`
- [ ] `pnpm build` completes without TypeScript or lint errors
- [ ] No browser console errors on homepage, hotel listing, and booking confirmation pages

---

## Coverage Summary

| Section | Area | Test Cases |
|---------|------|-----------|
| 1 | Public / Guest | 28 |
| 2 | Authentication | 26 |
| 3 | Regular User | 42 |
| 4 | Hotel Admin | 28 |
| 5 | Super Admin | 34 |
| 6 | Boat Feature | 18 |
| 7 | Edge Cases & Security | 22 |
| 8 | Email Notifications | 10 |
| 9 | UI / UX | 14 |
| 10 | Regression | 10 |
| **Total** | | **~232** |

---

## Known Gaps / Out of Scope for v1

- Load / performance testing (concurrent users, DB connection pooling)
- Accessibility (WCAG 2.1 AA compliance — screen readers, keyboard navigation)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Real Razorpay production payment end-to-end (use test mode only)
- Rate limiting on `/api/payment/*` endpoints
- Supabase RLS policy unit testing (verify each table policy in Supabase Studio)
- Wishlist persistence across sessions (currently client-side only)
- Settings page full functionality (depends on implementation)
