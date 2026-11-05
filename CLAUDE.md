# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build (Turbopack)
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test:db      # Tests for the Firestore data layer (lib/db, incl. the read cache) against an in-memory store
```

Create an admin (or give an existing account admin access) in Firebase: `npm run admin:create -- you@example.com [--role=hotel_admin --hotels=id,id] [--name="First Last"]`; asks for the password in the terminal (`scripts/create-admin.ts`), then sign in at `/console-b69ece1a1dc2/login`

Copy Supabase data into Firebase (one-time, re-runnable): `node --env-file=.env scripts/migrate-supabase-to-firebase.mjs [--dry-run] [--only=tables,users,storage]`

Add shadcn/ui components: `pnpm dlx shadcn@latest add <component>`

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 15.5.7 |
| Language | TypeScript | 5.x |
| React | React | 19.1.0 |
| Styling | Tailwind CSS 4 (PostCSS) | 4.x |
| UI Library | shadcn/ui (New York style) | — |
| Icons | Phosphor Icons, solid (`components/icons.tsx`) | 2.1.10 |
| State (server) | TanStack Query | 5.90.12 |
| State (client) | Zustand | 5.0.11 |
| Database | Firebase Firestore (server-only, via firebase-admin) | 14.5.0 |
| Auth | Firebase Authentication (email/password, Google, phone OTP; session cookies) | firebase-admin 14.5.0 / firebase (browser, auth only) 12.19.0 |
| Storage | Firebase Storage | via firebase-admin |
| Payments | Razorpay | 2.9.4 |
| Email | Resend + React Email | 6.6.0 |
| i18n | next-intl | 4.5.5 |
| Forms | React Hook Form + Zod | 7.68.0 / 4.1.13 |
| Rich Text | Tiptap | 3.15.3 |
| Dates | date-fns + react-day-picker | 4.1.0 / 9.11.3 |

## Architecture Overview

**Honnavar Travels** — a travel booking platform (hotels + boats) built with Next.js 15 App Router, TypeScript, Firebase (Firestore, Auth, Storage), and Razorpay payments. The app moved from Supabase to Firebase; `schema.sql` and `supabase/` are kept only as a reference for the old Postgres schema.

### Project Structure

```
app/
├── [locale]/(guest)/         # Public: hotels/, boats/, blog/
├── [locale]/auth/            # Auth: login, signup, forgot-password, reset-password, callback
├── [locale]/(account)/       # Protected guest area: profile/, bookings/, wishlist/ (dashboard/ only redirects to bookings/)
│                             #   layout.tsx = site Navbar + account/AccountSidebar + Footer
├── [locale]/boat-bookings/   # Protected: boat bookings
├── [locale]/payment/         # Payment success page
├── console-b69ece1a1dc2/     # Admin panel (no locale prefix); URL = ADMIN_PATH (lib/config/admin-path.ts)
│   ├── analytics/, blogs/, boats/, boat-bookings/
│   ├── bookings/, hotels/, payments/, refunds/
│   ├── rooms/, settings/
│   ├── users/ (website users: guests with an account), vendors/ (panel accounts: super/hotel admins)
└── api/                      # API routes (no locale prefix)
    ├── blogs/, boats/, boat-bookings/, bookings/, hotels/
    └── payment/ (create-order, verify, refund, webhook)

components/
├── ui/           # shadcn/ui primitives (button, card, dialog, popover, tabs, etc.)
├── admin/        # Admin: HotelForm, BoatForm, BookingsTable, BoatsTable, ImagesManager, etc.
├── booking/      # BookingForm, BoatBookingForm, BookingConfirmation, BoatBookingConfirmation
├── search/       # SearchWidget, HotelSearchBox, HotelFilters, BoatFilters, HotelCard, BoatCard, results
├── hotel/        # HotelDetailsClient
├── boat/         # Boat detail components
├── reviews/      # ReviewDialog, BoatReviewDialog
├── payment/      # RazorpayButton
└── auth/         # Login, signup, password reset forms

lib/
├── actions/      # Server actions ('use server')
│   ├── admin/    # Hotel admin CRUD (barrel: admin/index.ts)
│   │   ├── _helpers.ts, stats.ts, hotels.ts, hotel-images.ts, hotel-panoramas.ts, hotel-amenities.ts
│   │   ├── room-types.ts, room-type-images.ts, room-type-amenities.ts
│   │   ├── bookings.ts, payments.ts, meal-plans.ts
│   ├── auth.ts, bookings.ts, blogs.ts, reviews.ts, users.ts
│   ├── boat-admin.ts, boat-bookings.ts, boat-reviews.ts
│   ├── session.ts (current user/profile for client components), uploads.ts (user image uploads)
├── services/     # Business logic
│   ├── email.service.ts, booking.service.ts, hotel.service.ts
│   ├── boat.service.ts, boat-booking.service.ts
│   ├── booking-notifications.service.ts, whatsapp.service.ts (booking confirmed → email + WhatsApp)
├── hooks/        # TanStack Query hooks
│   ├── use-hotels.ts, use-boats.ts, use-auth-query.ts, use-wishlist.ts, useRazorpay.ts
├── stores/       # Zustand stores (providerless, no wrapper needed)
│   ├── use-search-store.ts, use-booking-store.ts, use-ui-store.ts
├── db/           # Firestore data layer: server.ts (createClient/createAdminClient), query builder,
│                 #   schema.ts (tables), policies.ts (row access), hooks.ts (triggers), __tests__/
├── firebase/     # admin.ts (SDK init), storage.ts, auth/ (session, users, identity REST, emails)
├── razorpay/     # config.ts (instance, key, currency, script URL)
├── providers/    # query-provider.tsx (TanStack Query)
├── config/       # features.ts (feature flags)
├── utils/        # admin.ts, roles.ts, storage.ts
├── types/        # Domain-split types (barrel: types/index.ts)
│   ├── common.ts, hotel.ts, boat.ts, auth.ts
└── utils.ts      # cn(), formatCurrency()
```

## Routing & Middleware

### Middleware (`middleware.ts`)

Processing order:
1. **Feature flag blocking** — `isRouteBlocked()` returns 404 for disabled features
2. **API early return** — `/api/*` routes skip everything below (only feature blocking applies)
3. **Admin route handling** — `ADMIN_PATH` (`/console-b69ece1a1dc2`, from `lib/config/admin-path.ts`) skips i18n; `layout.tsx` there is the bare root (html, fonts, noindex), `(panel)/layout.tsx` checks session and role (else → `ADMIN_PATH/login`), and `login/` is the panel's own sign-in page (`signInAdmin`: email + password, role checked before the session starts; `signOutAdmin` returns there). The hashed path keeps the panel off common-path scans (`/admin` is a plain 404): to change it, rename the route folder and the constant together, and never import it from client code that public pages load
4. **Protected route guards** — `/dashboard`, `/profile`, `/settings` → redirect to login if there is no `__session` cookie
5. **next-intl routing** — locale detection and prefixing (en/es/fr)

Middleware runs on the edge, where firebase-admin can't run, so it only checks cookie presence. Pages verify sessions: protected pages redirect to login when invalid; `auth/login` and `auth/signup` pages redirect signed-in users to My Bookings (`/bookings`, also the default post-sign-in target in `safeRedirect`). Import only `lib/firebase/auth/constants.ts` from middleware.
Matcher: `['/', '/(en|es|fr)/:path*', '/api/:path*', '/((?!_next|_vercel|.*\\..*).*))']`

## Feature Flags (`lib/config/features.ts`)

Simple config file to toggle entire feature modules on/off for all users (guest, admin, super_admin):

```typescript
export const FEATURES: Record<FeatureName, boolean> = {
  hotels: true,
  boats: false,   // Set to true to enable
  blogs: true,
  cabs: false,    // Not yet implemented
  bikes: false,   // Not yet implemented
}
```

When a feature is disabled:
- Hidden from: guest navbar, admin sidebar, search widget tabs, homepage sections, footer links
- Hero subtitle dynamically lists only enabled services
- Direct URL access returns 404 via middleware (covers guest, admin, and API routes)
- Route-to-feature mapping: `hotels` → `/hotels`, `/bookings`; `boats` → `/boats`, `/boat-bookings`; `blogs` → `/blog`, `/blogs`

Integration points: `Navbar.tsx`, `AdminNav.tsx`, `SearchWidget.tsx`, `Hero.tsx`, `app/[locale]/page.tsx`, `middleware.ts`

## State Management

### TanStack Query v5 (Server State)

Provider: `lib/providers/query-provider.tsx`
Config: 5min staleTime, 10min gcTime, 2 retries, exponential backoff, refetchOnWindowFocus in prod only

| Hook | File | Purpose |
|------|------|---------|
| `useHotels(params)` | `use-hotels.ts` | Search hotels with filters |
| `useFeaturedHotels(limit, city)` | `use-hotels.ts` | Homepage featured: the stays a super admin featured in `city` (the search box's destination; `GET /api/hotels/featured?city=`, matches city or district), at most `FEATURED_STAYS_LIMIT` (6, `lib/config/featured.ts`); the best-rated active stays while none anywhere is featured (10min stale) |
| `useSimilarHotels(hotelId, limit)` | `use-hotels.ts` | Hotel page "Similar stays": other active stays in the same city only (`GET /api/hotels/similar` → `HotelService.getSimilarHotels`; same property type first), 10min stale |
| `useHotelBySlug(slug)` | `use-hotels.ts` | Hotel detail page |
| `useFeaturedBoats(limit)` | `use-boats.ts` | Homepage featured (10min stale) |
| `useBoatBySlug(slug)` | `use-boats.ts` | Boat detail page |
| `useAvailableSlots(tripTypeId, date)` | `use-boats.ts` | Boat time slot availability (2min stale) |
| `useUser()` | `use-auth-query.ts` | Current user `{ id, email, user_metadata }` (via `getCurrentUser` action) |
| `useSession()` | `use-auth-query.ts` | `{ user }` while signed in (tokens are httpOnly, never in the browser) |
| `useProfile(userId)` | `use-auth-query.ts` | User profile (2min stale) |
| `useUpdateProfile()` | `use-auth-query.ts` | Profile update mutation (editable fields only) |
| `useWishlist()` / `useToggleWishlist()` | `use-wishlist.ts` | Wishlisted hotel ids, optimistic toggle |
| `useRazorpay()` | `useRazorpay.ts` | Loads Razorpay checkout script |
| `useRazorpayCheckout()` | `useRazorpayCheckout.ts` | `startPayment(...)`: create order → open Razorpay → verify; `stage` for button states |

### Zustand v5 (Client State) — Providerless

| Store | File | Persisted | Purpose |
|-------|------|-----------|---------|
| `useSearchStore` | `use-search-store.ts` | No | Search form: location, checkIn, checkOut, adults, children, `childAges` (one 1–11 per child, null until picked; `setChildren` keeps it as long as `children`; URL `ages=2,6` via `parseChildAges` / `childAgesParam` in `lib/utils/occupancy.ts`), rooms, boatDate, activeTab, isGuestOpen (also opens the hotel page's `StayGuestsPicker`) |
| `useBookingStore` | `use-booking-store.ts` | Yes (`ht-booking-guest`, v1) | Guest contact pre-fill (firstName, lastName, email, phone) |
| `useCartStore` | `use-cart-store.ts` | Yes (`ht-booking-cart`, v1) | The stay picked last (one hotel: rooms with qty + nightly price, dates, guests, pets), kept by the review page; `hotel/FloatingCartBar` shows it site-wide and the hotel page takes its dates/guests back when the search box has none. Helpers: `cartCheckoutHref`, `applyCartStay` (cart's stay → search store), `leaveEmptyCart`, `useCartHydration()` |
| `useUIStore` | `use-ui-store.ts` | No | mobileMenuOpen toggle; login popup (`openAuth({ intent, redirectTo, notice })`, `closeAuth`); `authVersion` (bumped after sign-in so Navbar etc. re-read the user) |

**Key patterns:**
- `useShallow` from `zustand/react/shallow` for grouped selectors (prevents unnecessary re-renders)
- State/Actions type separation (e.g. `SearchStateData` + `SearchActions` = `SearchState`)
- `useBookingHydration()` hook — returns `true` only after `persist.onFinishHydration`, gates `useEffect` that syncs localStorage → component state
- `hydrateFromParams()` on `useSearchStore` — bridges URL search params into the store on results page mount
- Auth props (userName/userEmail) take priority over persisted store values

### State Boundaries

- **Server state** → TanStack Query (hotels, boats, user, profile)
- **Client state** → Zustand (search form, booking guest details, UI toggles)
- **Auth state** → httpOnly session cookie on the server; client components read it through server actions (`lib/actions/session.ts`). Browsers never talk to Firestore/Firebase Auth directly.
- **Filter state** → URL search params (source of truth on results pages)

## Server Actions (`lib/actions/`)

| File | Key Functions |
|------|--------------|
| `auth.ts` | `signIn`, `signUp`, `signInWithProvider` (Google/phone ID token), `completeProfile`, `signOut`, `signInAdmin` / `signOutAdmin` (admin sign-in page), `resetPasswordRequest`, `updatePassword` |
| `bookings.ts` | `createBooking`, `getBookingByReference`, `getUserBookings`, `cancelBooking` |
| `admin.ts` | `getAdminStats`, `getAllBookings`, `getAllHotels`, `createHotel`, `updateHotel`, `deleteHotel`, CRUD for room types, amenities, images, payments |
| `blogs.ts` | `getAllBlogs` (via RPC `get_blogs_with_author`), `createBlog`, `updateBlog`, `deleteBlog`, `uploadBlogImage`, `getBlogStats` |
| `reviews.ts` | `submitReview` (converts 1-5 stars → 0-10 scale), `getReviewByBookingId` |
| `boat-admin.ts` | Parallel to `admin.ts` for boats: CRUD boats, trip types, time slots, amenities, images |
| `boat-bookings.ts` | `createBoatBooking`, `getBoatBookingByReference`, `cancelBoatBooking` |
| `boat-reviews.ts` | `submitBoatReview`, `getBoatReviewByBookingId` |
| `users.ts` | Vendors page (super_admin): list/create/update/delete panel accounts (super_admin / hotel_admin) |
| `website-users.ts` | `getWebsiteUsers()` for the admin Users page (super_admin): every non-admin account from `_auth_users` merged with Firebase Authentication (accounts whose Google/SMS sign-in never reached the site show as "Sign-in not finished"), with sign-in methods, last sign-in and booking counts by `bookings.user_id`. A row click opens `ADMIN_PATH/users/[id]` (`getWebsiteUserDetails`: profile, sign-in methods, bookings, payments + refunds, wishlist, saved rooms, reviews; the admin booking page links back via "View user profile"). Row actions (`admin/WebsiteUserActions`, used by `admin/WebsiteUsersTable` in the `admin/VendorsTable` list style and on the profile page): View profile, View bookings (`ADMIN_PATH/bookings?userId=`), email / WhatsApp, `setWebsiteUserDisabled` (Firebase `disabled` + revoked sessions), `deleteWebsiteUser` (same clean-up as `deleteAccount`; bookings kept, unlinked). Both refuse panel accounts |
| `profile.ts` | `updateProfile`, `deleteAccount` |
| `session.ts` | `getCurrentUser`, `getProfile`, `updateProfileFields`, `getFilterAmenities` (for client components) |
| `uploads.ts` | `uploadUserImage(folder, formData)` — profile/review photos (validated, stored under the user's id) |
| `saved-stays.ts` | `getSavedStay`, `saveStay`, `removeSavedStay`, `getSavedStays` — rooms a signed-in guest picked but hasn't paid for (one per hotel) |

**Return pattern:** `{ success: boolean, error?: string, data?: T }`

## Services (`lib/services/`)

| File | Purpose |
|------|---------|
| `email.service.ts` | Resend API: `sendBookingConfirmation`, `sendBookingConfirmed` (paid hotel stay, invoice PDFs attached; HTML from `bookingConfirmedEmail`), `sendBookingCancellation`, `sendPaymentReceipt` (boats), `sendHotelOwnerBookingAlert`, `sendBookingStatusUpdate`, `sendEmailVerification`, `sendPasswordReset` (HTML templates with inline CSS) |
| `booking-notifications.service.ts` | `notifyBookingConfirmed(bookingId)`: once per payment (claim `booking-confirmed_<first booking id>` via `claimOnce`, `lib/db/claims.ts`; stamps `bookings.confirmation_sent_at`), sends guest email + invoices, guest WhatsApp (only if `whatsapp_opt_in`), hotel WhatsApp to `hotels.phone`, hotel email. Facts formatted once by `buildBookingSummary` (`lib/utils/booking-summary.ts`). Best effort per channel, one `notify` log line |
| `whatsapp.service.ts` | `sendWhatsAppTemplate('guestBooking' \| 'hotelBooking', e164, variables)`: Twilio Messages REST with a Content SID; returns sent/skipped/failed, never throws; skipped until the `TWILIO_*` env is set. Template texts and setup: `docs/WHATSAPP_TEMPLATES.md` |
| `booking.service.ts` | Hotel booking: calculate totals (tax, service charge), insert booking + guests, `assignRoom`, `processCheckout` |
| `boat-booking.service.ts` | Boat booking logic (parallel structure to hotel) |
| `hotel.service.ts` | Hotel search, retrieval, availability |
| `boat.service.ts` | `searchBoats`, `getBoatBySlug`, `checkAvailability`, `getAvailableSlots`, `getFeaturedBoats` |

## Payment Flow (Razorpay)

Config: `lib/razorpay/config.ts` — server-side instance + client-side key constant

Who may pay: the signed-in owner, or for a guest checkout the browser that made it (`findPayableBookings` in `lib/services/guest-checkout.service.ts`; create-order, verify and failed all use it).

1. **Create Order** (`POST /api/payment/create-order`) — amount from database (NEVER from client), creates Razorpay order (amount in paise), sets booking to `payment_status: 'processing'`
2. **Client Modal** — `lib/hooks/useRazorpayCheckout.ts` opens Razorpay Checkout. Closing the window reports how it went: `onDismiss` (cancelled) or `onFailed` (an attempt failed inside it; Razorpay keeps the window open for a retry, so it's reported on close). The review forms show `payment/PaymentStatusNotice` ("Payment cancelled" / "Payment failed", rooms held `STALE_BOOKING_MINUTES` from `lib/config/booking-hold.ts`) above "Try again · Pay ₹X", and `payment/PaymentProgressOverlay` (full-screen loader) while creating the booking, opening the gateway and verifying. No "booking created" note (by request). The hotel review forms call it right after creating the booking, so Proceed to payment is one click (`payment/PayButton` retries); `payment/RazorpayButton` wraps it for the boat form
3. **Verify** (`POST /api/payment/verify`) — HMAC SHA256 signature verification (`order_id|payment_id` + secret), amount cross-check via Razorpay API, idempotency check on `payment_gateway_payment_id` (also a unique key in the data layer), updates booking to `confirmed`/`paid`, creates payment record, then (after the response) `notifyBookingConfirmed` for hotels or the receipt email for boats
4. **Webhook** (`POST /api/payment/webhook`) — handles async events (payment.authorized, payment.failed), uses `RAZORPAY_WEBHOOK_SECRET`; also calls `notifyBookingConfirmed`, which sends only if verify hasn't
5. **Refund** (`POST /api/payment/refund`) — 48-hour free cancellation policy, calculates refund by hours until check-in/trip, creates `refund_transactions` record, sends cancellation email
   - `GET /api/payment/refund?bookingId=xxx&bookingType=hotel|boat` returns eligibility info

## Authentication & Authorization

### Auth Flow (`lib/actions/auth.ts`, `lib/firebase/auth/`)
- Email/password via Firebase Authentication. `signIn` checks the password with the Identity Toolkit REST API, then stores an httpOnly Firebase **session cookie** (`__session`, 14 days). Unconfirmed emails can't sign in.
- `signUp` creates the Firebase user, stores `first_name`, `last_name`, `full_name`, `phone` (required, E.164 via `lib/utils/phone.ts`) in `user_metadata`, and emails a confirmation link (Resend) to `/[locale]/auth/callback?mode=verifyEmail`, which verifies and signs the user in
- Password reset: `resetPasswordRequest` emails `/auth/callback?mode=resetPassword`, which stores the code in an httpOnly cookie and forwards to `/auth/reset-password`; `updatePassword` consumes it and revokes old sessions
- `signOut` clears the cookie and revokes all of the user's sessions
- `db.auth.getUser()` returns a Supabase-compatible user (`id`, `email`, `user_metadata`, `created_at`, `last_sign_in_at`, `email_confirmed_at`). Firebase Auth holds credentials; the `_auth_users` collection holds metadata (role, hotel_ids, names). Only server code writes it.
- Creating/updating a user upserts the `profiles` row (email, role, hotel_ids; new accounts also seed names, phone, profile_image)
- **Login UI** is one panel, `components/auth/AuthPanel.tsx`: mobile number first (flag + country code box, `PhoneNumberInput`), CONTINUE → 6-digit SMS code, then round Google / Email buttons; email login/sign-up steps live in `EmailAuthSteps.tsx`. It is shown in a popup (`AuthDialog`, mounted by `Navbar`, opened with `useUIStore().openAuth(...)` — Navbar Sign In/Register and the hotel page Reserve button use it) and on `/auth/login` + `/auth/signup` (`AuthPageCard`, for deep links and redirects like `?redirect=/bookings`; the admin panel has its own sign-in page). Side slides come from `lib/config/auth-promos.ts` (`AuthPromo`).
- **Google + mobile OTP**: the browser SDK (`lib/firebase/client.ts`, in-memory persistence) runs `signInWithPopup` or `signInWithPhoneNumber` (invisible reCAPTCHA, `use-phone-auth.ts`), then `signInWithProvider(idToken)` verifies the token (only `google.com`/`phone`, signed in < 5 min ago), adopts the account via `upsertFederatedUser`, and sets the same session cookie. New users are created on the fly.
- If name or mobile is missing after that, `CompleteProfileForm` asks once and `completeProfile` fills only empty fields; email is asked alongside but optional (`optional: ['email']`), so guests can book with just a mobile number. An email typed there is a contact address in `_auth_users`/`profiles` only, never set on the Firebase account (so nobody can claim someone else's address).
- **Guest checkout**: booking needs no sign-in. Without a session the review page takes name + mobile number; the booking has no `user_id`, stores `guest_phone` in E.164 and `guest_access_hash` (SHA-256 of a random token in the httpOnly `ht_guest_booking` cookie, so only that browser can pay or see the success page), and the rooms go to `saved_stays` under `guest_phone`. A phone (SMS code) sign-in calls `claimGuestRecords`, which moves that number's guest bookings and saved rooms onto the account (they then show in My Bookings).
- Phone-only and email accounts with the same person stay separate accounts (no automatic linking). Redirect targets go through `safeRedirect` (same-site paths only).

### Admin Roles (`lib/utils/roles.ts`)

| Role | Access |
|------|--------|
| `super_admin` (or legacy `admin`) | All hotels/boats, all bookings, analytics, user management, blog |
| `hotel_admin` | Specific hotels only (stored in `user_metadata.hotel_ids[]`) |

Guards in `lib/utils/admin.ts`: `requireAdmin()`, `requireSuperAdmin()`, `requireHotelAccess(hotelId)`, `getAdminHotelAccess()` → returns `{ userId, role, hotelIds }` (null hotelIds = access all)

## Data Layer (`lib/db/`, Firestore)

Server code queries Firestore through a PostgREST-style builder that kept the Supabase call style, so business logic didn't change in the migration:

```ts
const db = await createClient()     // as the signed-in user; row policies apply
const admin = createAdminClient()   // service role; bypasses policies (server-only)
const { data, error } = await db.from('bookings').select('*, hotel:hotels(name)').eq('user_id', id).single()
```

- `schema.ts` defines column types (writes are cast like Postgres: numeric strings → numbers, dates → `YYYY-MM-DD`, timestamps → ISO), defaults, unique keys, foreign keys and nesting. **Add new columns/tables to `schema.ts`.**
- **Layout (`layout.ts`)**: the primary key is the document id; tables with a `parent` in `schema.ts` are subcollections named after the table, e.g. `hotels/{id}/room_types/{id}/room_type_images/{id}`, `hotels/{id}/hotel_images`, `hotels/{id}/reviews/{id}/review_responses`, `bookings/{id}/booking_meal_plans`, `boats/{id}/trip_types/{id}/trip_time_slots`. Top-level: hotels, bookings, payments, refund_transactions, profiles, wishlists, amenities, blogs, etc. Lookups without the parent id use collection-group queries (indexes in `firestore.indexes.json`, applied with `node --env-file=.env scripts/deploy-firestore-indexes.mjs` or `firebase deploy --only firestore:indexes`; without them the layer scans the group). A nested row can't move to another parent. NULL columns aren't stored.
- Supported: `select` with embedded relations (`alias:table!fk_or_column!inner(...)`, nested), `eq/neq/gt/gte/lt/lte/like/ilike/is/in/contains/not/or/filter/match`, `order` (incl. `referencedTable`), `limit/range`, `single/maybeSingle`, `count: 'exact'`/`head`, `insert/update/upsert/delete` with `.select()` returning, `rpc('get_blogs_with_author')`
- Postgres behaviors kept: column defaults, unique constraints (sentinel docs in `_unique`, error `23505`), `PGRST116` for `.single()`, ON DELETE CASCADE/SET NULL/RESTRICT (`23503`), atomic conditional updates (transactions), trigger replacements in `hooks.ts` (updated_at, booking num_nights/subtotal, profiles.full_name, payment audit log)
- `policies.ts` replaces RLS for `createClient()` queries. Firestore/Storage rules (`firestore.rules`, `storage.rules`) deny all direct client access; Storage image folders are public-read.
- Only equality filters go to Firestore (no composite indexes needed); other filters, sorting and paging run in memory. Fine at the current data volume (hundreds of rows); add pushdown + indexes if a collection grows large.
- **Catalogue read cache** (`lib/db/cached-store.ts`, wrapped around the store by `getStore()`): Firestore is in **nam5 (US)**, 0.4–1.5 s a round trip from India, and a hotel page needs five rounds of queries, so reads of the catalogue tables (`CACHED_COLLECTIONS`: hotels and their photos / 360°s / amenities / nearby places, room types and theirs, amenities, reviews, blogs, price rules, room blocks, meal plans) are cached per server process: fresh for 60 s, then served stale while one background read refreshes them (up to 1 h). Writes through the store (all of them run in `transaction()`) drop the written collections at once; another instance's write shows after its next refresh. Bookings, payments, users, saved stays etc. are never cached. Code that prices or creates a booking passes `fresh: true` (`createClient({ fresh: true })`, `createAdminClient({ fresh: true })`, `getStore({ fresh: true })`): the review page, `/api/bookings/multi`, `createBooking`. Tests: `lib/db/__tests__/cached-store.test.ts` (in `npm run test:db`). Session checks are cached 60 s (`lib/firebase/auth/session-cache.ts`)

### Hotel Tables
`hotels`, `hotel_images`, `hotel_panoramas`, `hotel_amenities`, `room_types`, `room_type_images`, `room_type_amenities`, `rooms`, `bookings`

### Boat Tables
`boats`, `boat_images`, `boat_amenities`, `trip_types`, `trip_type_images`, `trip_time_slots`, `boat_bookings`

### Common Tables
`amenities`, `amenity_categories`, `reviews`, `review_responses`, `boat_reviews`, `payments`, `refund_transactions`, `blogs`, `blog_images`, `profiles`, `saved_stays` (unpaid room picks: per `user_id` or guest `guest_phone`, per hotel; cleared when that hotel's booking is paid)

### Internal Collections
`_auth_users` (auth metadata per Firebase user), `_unique` (unique-key sentinels), `_counters` (invoice serial per financial year), `_invoice_numbers` / `_invoices` (create-only guards: a number is issued once, a booking numbered once), `_claims` (run-once claims from `claimOnce` in `lib/db/claims.ts`, e.g. one booking confirmation per payment), `activity_logs` (admin activity log, see Admin panel UI; written and read with firebase-admin directly, not the data layer)

### Invoices
- Every paid hotel booking gets `bookings.invoice_number` (`TRV/26-27/00001`: one consecutive series per Indian financial year, ≤ 16 chars) and `invoice_date`, from `assignInvoiceNumber` in `lib/db/invoice-numbers.ts` (one transaction: booking + counter + guards, retried on a lost race). Assigned in `api/payment/verify` and the webhook; bookings paid earlier get theirs on first download.
- `GET /api/bookings/[reference]/invoice` returns the tax invoice PDF (`lib/services/invoice-pdf.ts`, pdf-lib, built-in Helvetica: Latin text only, amounts in INR) for the owner, the hotel's admins, or the browser of a guest checkout, once `isInvoiceable` (paid, not cancelled). Lines/GST are rebuilt from the stored amounts by `invoiceBreakdown` (`lib/utils/invoice.ts`); CGST + SGST when the property is in the issuer's state, else IGST.
- Issuer details, prefix and SAC codes: `lib/config/invoice.ts`. Download buttons: `BookingsList` (My Bookings), `BookingConfirmation`, payment success page, admin booking page.

### Demo data
`npm run seed:demo` adds "Demo Stay Honnavar (Test Hotel)" (fixed ids, re-runnable); `npm run seed:demo -- --remove` deletes it. It is active and bookable — remove before going live.
`npm run seed:blogs` adds four published sample posts (two Honnavar, two Bhatkal; fixed ids, re-runnable) with stock photos uploaded to `blog-images/samples/` (Bunny, else Firebase Storage; Unsplash resized by URL, the Honnavar coast shot pre-sized in `scripts/assets/`, no image library); `-- --remove` deletes posts and photos. Replace the photos with real ones or remove the posts.

### Key Types (`lib/types/index.ts`)
- Status enums: `BookingStatus` (pending, confirmed, checked_in, checked_out, cancelled), `HotelStatus`, `PaymentStatus`, `ReviewStatus`, `BoatStatus`, `BoatBookingStatus`
- `PropertyType`: hotel, apartment, resort, villa, guesthouse, hostel, motel
- `BoatType`: motorboat, sailboat, speedboat, houseboat, kayak, ferry
- `PricingModel`: per_person, per_boat
- Booking reference format: `BK-YYYYMMDD-XXXX` (collision-safe generation loop)

## Internationalization

- Config: `i18n/routing.ts` — locales: `['en', 'es', 'fr']`, default: `'en'`
- Messages: `messages/{en,es,fr}.json`
- Navigation: `import { Link, useRouter, usePathname } from '@/i18n/routing'`
- Translations: `useTranslations('Namespace')` from `next-intl`

## Image & Storage

### Storage Folders (Bunny CDN, else Firebase Storage)
`hotel-images`, `room-images`, `boat-images`, `trip-images`, `blog-images`, `review-images`, `profile-images` — top-level folders (the former Supabase buckets). `db.storage.from(folder)` (`lib/firebase/storage.ts`) keeps the Supabase-style `upload/getPublicUrl/remove` API. With the `BUNNY_STORAGE_*` + `BUNNY_CDN_URL` env set (`lib/bunny/config.ts`), uploads go to the Bunny storage zone (`lib/bunny/storage.ts`) and URLs are `<BUNNY_CDN_URL>/<folder>/<path>`; `remove` deletes from Bunny and, best effort, Firebase (older uploads). Without them: Firebase Storage, `https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<folder>%2F<path>?alt=media`. Existing URLs are stored in full, so old Firebase images keep working.


### Helpers (`lib/utils/storage.ts`)
- `uploadImage(file, bucket, path)` — validates type (JPEG/PNG/WebP) & size (max 5MB), returns `{ url, path }`
- `deleteImage(bucket, path)` — removes from storage
- `extractStoragePath(url, bucket)` — parses storage path from public URL
- Path format: `${entityId}/${Date.now()}-${random}.${ext}`
- `storage_path` column on image tables for easier deletion

### 360° Panoramas
- `hotel_panoramas` (per hotel: `image_url`, `storage_path`, `title`, `display_order`), kept apart from `hotel_images` so 2:1 photos never land in galleries, cards or emails. Files go to `hotel-images/<hotelId>/360/`
- `room_type_panoramas` (per room type, same columns; subcollection of `room_types`), files in `room-images/<roomTypeId>/360/`; `uploadRoomTypePanorama` / `deleteRoomTypePanorama` (`lib/actions/admin/room-type-panoramas.ts`, check the admin manages the room's hotel)
- Admin: `admin/PanoramasManager` (`owner: { type: 'hotel' | 'room_type', id }`), on the hotel page Images tab and in a room type's View Details dialog ("360° Photos" tab, between Images and Amenities). `preparePanorama` (`lib/utils/panorama.ts`) checks the photo is 2:1 and re-encodes it in the browser as a JPEG ≤ 4096 px wide that fits the 3 MB server action limit; `uploadHotelPanorama` / `deleteHotelPanorama` (`lib/actions/admin/hotel-panoramas.ts`)
- Viewer: `media/PanoramaViewer` (plain WebGL, no library): drag/swipe to look, pinch / ctrl+scroll / + and − keys to zoom, arrow keys, full screen; turns slowly until touched (not with reduced motion), draws only while visible. Full screen uses the browser Fullscreen API; where that's missing, refused or unanswered after 700 ms (iPhone Safari, embedded browsers) it covers the window with `position: fixed`, offset by `viewportBox()` because a transformed ancestor (the centred dialogs) would otherwise box it in; an outer `aspect-video` box keeps its place in the page, and Esc leaves it without also closing the dialog. Overlays, all straight on the photo with drop shadows and no boxes (by request): a full-screen button top-right (the only button: no zoom, play/pause or compass), a "Drag to look around" hint (hidden on viewers narrower than 24rem, `@container` sizing), the hotel name large in the bottom-left (`hotelName` prop; the room name in a room's photos), and "Powered by" + the Luminexa logo (`public/brand/luminexa-logo.webp`) small at 60% opacity on the bottom edge at the right (no "360 Pano" text). The view title is only in the aria-label. Switching `src` reloads in place (no remount). WebGL needs a same-origin image, so pages pass `panoramaViewerSrc(url)` (the next/image optimizer URL)
- Hotel page: no separate 360° section or nav tab, by request: 360° photos live inside the photo viewers. `media/PhotoLightbox` plays items with `panorama: true` in `PanoramaViewer` (no zoom button for them; their thumbnails show "360°"; ← → typed inside the viewer look around instead of changing photo). The hotel `ImageGallery` adds every 360° photo of the hotel after its photos (`hotelPanoramaViews` in `lib/utils/panorama.ts`: the hotel's own, labelled by title or "Property", then each room's, "Room" or "Room · title") and a "360° View" button beside "View all photos" that opens the first one; the gallery shows even with no photos when there are 360°s. A room card's photo gets a small "360°" button (beside the photo counter) that opens that room's `RoomImageGallery` on its first 360° (the room's 360°s follow its photos there and in the expanded thumbnails)

### Hotel location fields
The hotel form (`admin/HotelForm`, new + edit) picks State → District → City/Town from dropdowns (`admin/LocationFields`) when the country is India; other countries get plain text boxes. Data: `lib/data/india-locations.json` (36 states/UTs, 784 districts, 7,094 sub-districts = taluk/tehsil/mandal), loaded on demand via `loadIndiaLocations()` (`lib/utils/india-locations.ts`). Source: the Local Government Directory via https://ramseraph.github.io/opendata/lgd/ (snapshot 2026-10-27); rebuild with `scripts/build-india-locations.mjs` (instructions in the file). City offers "Other (type the place)" for spots that aren’t a sub-district (Gokarna, Murudeshwar). `hotels.district` is new: older hotels get it filled from their city when editing. Hotel search matches the stored city text, so `PREFERRED_NAMES` in the build script keeps common spellings (`Honavar` → `Honnavar`).

### Nearby places & connectivity
`hotels.nearby_places` (JSON list of `{ type, name, distance_km }`, nearest first; types railway, bus, airport, beach, temple, hospital, market, attraction, other) is edited in the admin hotel form's "Nearby & Connectivity" section (type / name / km rows, Add place, up to `MAX_NEARBY_PLACES` = 12) and cleaned on save by `cleanNearbyPlaces` (`lib/utils/nearby-places.ts`, in `createHotel` / `updateHotel`). `hotel/NearbyPlaces` renders them with an icon per type (`Train`, `Bus`, `Plane`, `Waves`, `Temple`, `Hospital`, `Store`, `Camera`, `MapPin`) and `formatDistance` ("400 m", "2.5 km"): the 2 nearest under the city on `search/HotelCard` (search results and wishlist, `compact`: one line each, name in bold and the distance in bold teal, no chips or background, by request), all of them in a "Nearby & Connectivity" card under All Amenities on the hotel page (plain rows with hairlines, two columns from `sm`, no boxes, by request). Queries that feed HotelCard select `nearby_places` (`/hotels`, `getWishlistHotels`)

### Next.js Image Config (`next.config.ts`)
Remote patterns: `images.unsplash.com`, `**.b-cdn.net` (Bunny pull zone; a custom `BUNNY_CDN_URL` domain is added too), `firebasestorage.googleapis.com/v0/b/**`, legacy `*.supabase.co/storage/v1/object/public/**` (remove after the storage migration)

## Page Layout

- Homepage (`app/[locale]/page.tsx`): `Hero` (`home/HeroSlideshow`: crossfading marketing slides from `lib/config/hero-slides.ts`, each a photo + its own headline and text (no eyebrow, no button) that change together, under a neutral scrim with a left gradient behind the copy; all slides' copy shares one grid cell so the height never jumps; hovering the copy pauses it; the owner had the gold eyebrow restored and then removed again (2026-11-05): keep it out; `SearchWidget` card overlapping its bottom edge; its hotel tab is `search/HotelSearchBox`: destination, check-in/out with nights, guests picker (plus a "Travelling with pets?" checkbox → `pets=1`), price per night → `minPrice`/`maxPrice`, stay-type chips → `propertyType`; dates default to tonight → tomorrow) → `FeaturedHotels` (straight under the search box, by request; see below) → `home/TrustBar` (four points as one white strip of equal cells with hairline dividers, texts kept to two lines; then `home/PhoneBookingPromo`: deep-teal panel, "Book your coastal stay in a few taps" + three true points (mobile-number sign-in, UPI/cards/net banking, confirmed on payment), beside a photo of two Indian travellers laughing at a phone (Unsplash, portrait focal-point crop) with an HTML phone mockup of an illustrative confirmed booking and a "Secure UPI checkout" chip; no buttons) → `home/TripIdeas`. `FeaturedHotels`: up to 6 full-photo `home/FeaturedStayCard`s of the city picked in the search box only (`useSearchStore.pickedCity`, else `DEFAULT_DESTINATION`; hidden when that city has none; header link → `/hotels?location=<city>`): `hotels.is_featured`, which only super admins set with the Featured switch on the admin Hotels list (`setHotelFeatured`, at most `FEATURED_STAYS_LIMIT`; `createHotel` / `updateHotel` drop the field), best-rated active stays until any is featured; a featured stay's card has a gold "Featured" ribbon across its top-left corner like the rooms' "Best Value" (the type chip moves right of it), white location text and a neutral dark overlay (no teal, by request); two a row from `sm`, 5:4 on phones without the "View stay" line, 16:9 from `sm` (short, by request); plus `ExploreStaysCard` filling the last row's empty slot when the count is odd. `home/TripIdeas` (white band, bento of four photo cards: resorts (large), homestays (wide), villas, hotels, each linking to `/hotels?propertyType=…`) is followed by `FeaturedBlogs` → `home/ListPropertyCta` → `Footer`. The owner removed the gold eyebrow labels from the homepage section headers, hero and cards (and the `/hotels` header): don't add them back there
- Hotel page (`hotel/HotelDetailsClient`): the header is plain text, no pills or chips (by request): gold star icons + bold "3 Star Hotel" (stars + property type), the name, the address with a teal pin, then highlights from the hotel's own amenities as icon + name in a row (no hard-coded badges) and "+N more"; on the right the guest score, or bold "New on Triplovia"; hero = `hotel/ImageGallery` (grid adapts to the photo count, 1 photo on phones; photos open in `media/PhotoLightbox`, the full-screen viewer shared with `hotel/RoomImageGallery`: top bar, photo filling the rest, centred thumbnails, ← → keys, Esc via the dialog. A full-screen `DialogContent` needs `max-w-none sm:max-w-none`, since the shared dialog's `sm:max-w-lg` survives a plain `max-w-full`) beside `hotel/RoomAvailabilityCard` (full-photo room cards with price, capacity and availability; the availability (coloured dot) and "Up to N guests" sit on the photo as white text with a shadow, no pills, by request; Select scrolls to `#room-{id}` in `RoomComparison`; phones swipe them; header "Availability" with "N of M available" as plain bold text (no pill); at its top, as two rows of one bordered box, `hotel/StayDatesPicker`, a range calendar from today to `getMaxBookableDate()` that writes check-in + check-out to `useSearchStore` only once both are picked, so prices and availability reload once, then `hotel/StayGuestsPicker` (adults, children with their ages, rooms, pets → `useSearchStore`, using `search/GuestCounter` and `search/ChildAgeSelects` like the search box; open state is the store's `isGuestOpen`); the cards show each type's price for the group); a phone bottom bar with price + Select rooms hides over the rooms list. Booking is MakeMyTrip-style (by request, 2026-11-04): no cart and no room quantities on the hotel page. The group (adults, children, rooms) comes from the search box or `StayGuestsPicker`, and every room type works out how many of its rooms that group needs and their nightly price (`lib/utils/occupancy.ts`: `roomsForParty` = the fewest rooms that fit by `max_adults` / `max_children` / `max_occupancy`, never fewer than the rooms searched, with an error when fewer are left or there are more rooms than adults; `partyNightlyPrice` = rooms incl. taxes & fees + the extra-guest charges, as the review page charges them, with children's ages unknown so they count as 6–11). Extra guests (`calculateGuestCharges` in `lib/utils.ts`): every child aged 6–11 pays `room_types.child_price` a night (admin room form "Child Price, Ages 6–11"; empty/NULL = the extra-bed price, 0 = free) and children 1–5 are free, so picking ages changes the price; the room rate includes `standard_occupancy` × rooms adults, and each adult beyond them pays `room_types.extra_bed_price` a night. Bookings store the sum in `extra_bed_charge` (shown as "Extra bed / extra guest charge"). A room with `max_children` 0 (the default, often unset) still takes children in its adult places. Rooms list (`RoomComparison`, props `party` + `onSelectRoom(roomId, rooms)`): sorted by the group's price (types that don't fit last), each card shows "₹X / night · For N rooms · 2 adults · 1 child", the extra-bed charge when there is one, and "Select room" / "Select N rooms" (or "Not available" with the reason), which goes straight to the review page (`roomId=` for one room, `rooms=<id>:<N>` for more, plus `ages=`), or, when a child's age is missing, scrolls to `StayGuestsPicker` (`#stay-guests`) and opens it on "Select each child's age" instead; a plain "N room types" count (no badge), a "Compare" checkbox on each card's title row (up to 3), a mint compare bar once one is ticked (count, Clear, "Compare N rooms", enabled from 2), and a comparison dialog (`sm:max-w-5xl`, fixed-layout table with equal room columns, photo + name + Remove per column, rows left out when every picked room lacks the value, the group's price and a Select button per room); no "Filter view" mode. Room facts and the first 4 amenities are icon + text rows (no chips), "+N more" opens the card's details (All amenities, Room photos). On each card, "Best Value" is a gold ribbon with green (`text-primary`) text tight across the photo's top-left corner (a rotated band the photo clips, its centre on the corner's diagonal so the words sit centred; not the card's corner, by request) and "Only N left!" a red label at the top-right (photo count and 360° bottom-right), and More details + Select sit at the card's right: beside the price when the details column is ≥ 28rem (`@container`, `@md:`), else right-aligned under it. `hotel/FloatingCartBar` (mounted in `app/[locale]/layout.tsx`) pins `hotel/BookingCartBar` with the stay last opened on the review page (`useCartStore`) to the bottom of every other page: summary → the hotel's `#rooms` with that stay, Clear, Proceed to checkout. It is hidden on hotel pages, the review page and `/payment/*`; the paid hotel's stay is cleared on the success page (`booking/ClearPaidCart`). Links to `#rooms` scroll to the rooms list once the hotel loads Below the content: `hotel/SimilarStays` (white band, "Similar stays in <city>", up to 2 same-city stays as `FeaturedStayCard`s two to a row in a wider `aspect-[3/2]` shape, hidden when the city has no others) and the site `Footer`, rendered inside `HotelDetailsClient` with `className` bottom padding (`pb-20 lg:pb-0`) so the phones' Select rooms bar never covers it
- Booking review (`hotels/[slug]/book`, `booking/BookingForm` + `MultiRoomBookingForm`), MakeMyTrip-style: left = `booking/review/StaySummaryCard` (hotel photo/name/address, check-in → nights → check-out tiles that open date pickers, guests; the read-only room cards, pets and children's ages as children), guest details, meals, requests, cancellation notice; right (sticky) = `booking/review/PriceBreakupCard` (charge lines, folded taxes, total) with the pay step as children: errors, terms checkbox, Proceed to payment (`<Button form="booking-form">` submits the left form, creates the booking and opens Razorpay at once) → `PayButton` for retries. Mobile number first, email optional; open to guests without sign-in (guest checkout). A "Back to hotel" link (`booking/review/BackToHotelLink`) sits above the heading and returns to the hotel's rooms with the stay's dates and guests. Rooms and guests are not edited here (MakeMyTrip-style): each room type is a read-only `booking/review/ReviewRoomCard` (details, "N rooms · 3 adults · 1 child"), and "Back to hotel" is the way to change them. The page makes the rooms follow the guests: a single-room link whose guests need more rooms redirects to `rooms=<id>:<N>`, a one-type `rooms=` link gets its count raised to what `roomsForParty` needs, and both go back to the hotel's `#rooms` when that many aren't left. Guests are per room type (each room type is its own booking, so `bookings.num_adults` / `num_children` hold that room type's guests; group summaries, the success page and the hotel email add them up; older links with several types share the guests out with `splitGuests`). `/api/bookings/multi` (per-room `numAdults`/`numChildren`, extra-bed charge per room type on its own booking) and `createBooking` check occupancy again (`occupancyError`). Both forms keep `useCartStore` in step. Children's ages are not asked here (by request): they come from the guests picker as `ages=` and show read-only in `ReviewRoomCard` ("2 children (2, 6 yrs)"); one that never came is priced as 6–11, with a note to change it on the hotel page. The price breakup shows "Extra bed · N adults" and "Child charge · N children (6–11)" lines, and the ages go to `/api/bookings/multi` as `childrenAges` (in room order) for its child charges. Under the room cards, `booking/review/PetsOptIn` (pre-ticked from `pets=1`, shows `hotels.pet_policy_text` when ticked) sets `bookings.with_pets`, which shows as "with pets" in the guests line of the emails, WhatsApp, success page, booking page and admin booking page. No WhatsApp opt-in on the form (removed by request, 2026-11-04, as WhatsApp isn't being integrated): bookings save `whatsapp_opt_in` false, so `notifyBookingConfirmed` never messages the guest on WhatsApp. Optional GST details (`booking/review/GstDetailsFields`: GSTIN with check-digit validation, registered company name + address) are validated again on the server (`parseGstDetails` in `lib/utils.ts`), stored as `bookings.gst_number` / `gst_company_name` / `gst_company_address`, and shown on the admin booking page, the guest's booking page and the hotel-owner email. Don't repeat hotel/dates on the right
- Payment success (`payment/success/page.tsx` loads the booking and every booking paid in the same Razorpay order; `booking/BookingSuccess` renders it): minimal and centred, an animated check (pop, tick draw, ripple, dot burst; keyframes inline in the component, skipped for reduced motion) and staggered `motion-safe:animate-in` fade-ups, then one ticket card (hotel, dates, rooms, guests, booking ID, total paid), Download invoice / View booking, and the cancellation deadline. The price breakup is in the invoice PDF
- **Page width**: wrap page content in `page-container` (utility in `app/globals.css`): centred, content max 1200px like MakeMyTrip, side gutters 16px → 24px (sm) → 32px (lg) → 40px (xl). Don't use `container` (its width jumps per breakpoint). Account pages sit in `(account)/layout.tsx` (page-container + 248px sidebar), so they render only their content at the column's full width. The account menu (`account/account-links.ts`: Profile → My Bookings → Wishlist, icon + label, plus a `shortLabel` for phones) feeds `AccountSidebar` (a sidebar from `lg`; below that three equal underlined tabs, Profile / Bookings / Wishlist, no pills, by request) and the navbar account menu. The navbar names the signed-in user by `accountLabel` (`lib/utils/account-label.ts`): name first, else mobile number, else email (by request). My Bookings = `SavedStaysList` + `booking/BookingsList` (Upcoming / Past / Cancelled tabs; invoice, cancel, review as plain text links with an icon, no pills and no View button (the card itself opens the booking), by request 2026-11-05; cards switch layout by their own width with `@container`). My Profile (`profile/ProfileEditForm`, no "My Account" tag; Wishlist has no tag either): photo card, then cards for personal details (name, date of birth, gender, nationality, about), contact (email read-only, mobile, emergency contact), address (lines, city, state, PIN, country) and "ID for check-in" (passport / driving licence / Voter ID / Aadhaar), one sticky Save bar. Fields, checks and clean-up live in `lib/utils/profile-details.ts` (shared by the form and `updateProfile`, which saves only what it's given: a photo upload alone leaves the details alone); phones are stored in E.164 and Aadhaar only as `XXXX XXXX 1234` (never the full number). Nothing else uses these fields yet (not the booking form or hotel emails). The whole card is a link to the booking (an `absolute inset-0 z-[1]` Link; the card's buttons sit above it at `relative z-10`), with the status from `statusOf()` (booking + payment status) as bold coloured text with its icon above the hotel name (no pill), the room's photo else the hotel's, check-in / check-out / stay / guests as plain label-value pairs, and "Booking ID … · Booked …" beside the buttons. The tabs are underlined text tabs with plain counts, straight on the page (no card or pill track), and the page header has no "My Account" eyebrow (all by request, 2026-11-05). The booking page (`BookingConfirmation`) puts `booking/MapPattern` (faint contour rings in two corners and a soft light behind the title; no grid, route or pins, by request) over its status-coloured hero and shows check-in → nights → check-out as `DateHighlight` calendar tiles; sections have plain titles (no gold eyebrows), statuses are coloured text (`StatusText`), the room name is text, "Get directions" (under the address; not in the hero, by request) opens Google Maps directions (`directionsUrl` in `lib/utils/maps.ts`: the hotel's coordinates, else its address), the hero's buttons are Download invoice + My Bookings (no Print, by request), and a sidebar "Need help?" card offers call / WhatsApp / email to Triplovia (`CONTACT`) with the booking ID filled in (no hero button for it, by request); amounts use `formatRupees` (paise shown, never rounded to ₹0).
- Experiences & packages (group travel, wedding photo shoots, tourism packages, adventure sports) live in the footer's Explore list, not on the homepage: each `packages/PackageEnquiryButton` opens `PackageEnquiryDialog` (WhatsApp enquiry)
- Legal pages (`/terms`, `/privacy`, `/refund-policy`) all render `legal/LegalPage`: a teal header (title + one line), then in one `page-container` a 260px "On this page" list of numbered sections (sticky on desktop, a fold-out on phones) beside the sections as cards, an optional mint intro card, and one shared contact card (email, phone, address, GSTIN) at the end. Pages only pass `title`, `description`, `intro?` and `sections: { title, content }[]`; anchor ids come from the titles. The text is styled in the component (not `.prose`, whose 65ch cap left uneven gaps)
- Contact details (email, phone, WhatsApp, address, GSTIN) live in `lib/config/contact.ts` (`CONTACT`, `whatsappUrl()`), with `SOCIAL_LINKS` (Instagram, Facebook, YouTube: PLACEHOLDER handles until the owner gives the real profile links; an empty `url` hides one) shown by `layout/SocialLinks` (`tone` dark / light / plain) in the footer's brand column and the phone menu. `Footer` bottom line: © on the left, "Secure payments by Razorpay" + `payment/PaymentMarks` (small inline UPI / Visa / Mastercard / RuPay / Net banking marks on white tiles, no hotlinked logos) on the right, by request; older components still repeat them, point them there when touched. `/contact` (linked from the footer only, not the navbar): a deep-teal band with the headline, phone / WhatsApp / email as glass rows and the registered office on the left, and `contact/ContactForm` on the right (name, mobile, optional email, topic, optional booking reference, message → opens WhatsApp or a mailto with it filled in; nothing is stored or sent by the server); below, "Find answers faster" cards (My Bookings, refund policy, a teal partner card with `ListPropertyButton`), business information and a fraud notice. No map
- `/about` (server component, no contact section or form): a cover like the blog post page's (420/480/540px tall, not full screen, by request): the beach photo (`TRAVEL_PHOTO`, a palm-lined beach with boats, tagged Gokarna on Unsplash) under a neutral dark scrim (no teal, by request) with the headline, intro and Explore stays / List your property over it; then vision + mission cards, "How Triplovia works" (3 steps), values, policy link cards and a closing call to action; section headers have no gold eyebrows (by request). No statistics or history that the owner hasn't supplied
- Admin activity log (by request, 2026-11-05; super admins only): `admin/ActivityLogButton` in the AdminShell top bar (clock icon, red count of new entries made by others since this browser last opened it, kept in localStorage `ht-admin-activity-seen`; refreshes every minute while visible) opens a panel with All / Hotels / Vendors / Users / Blogs / Settings filters, "by <name> · 5 min ago", links to the item, "Show older activity". Data: `GET /api/panel/activity?limit=&before=` (403 unless super admin; a plain GET so polling doesn't trigger AdminToaster's loading box) → `listActivity` in `lib/services/activity-log.service.ts`. Writers call `logActivity({ entity, action, summary, entityId, label, href })` (never throws; written after the response with `after()`; actor = the session user's name, else phone, else email; entries older than 180 days pruned now and then). Logged today: hotels (create, update with `describeFields` of what changed, archive/delete, status, featured), vendors (create, update, delete in `lib/actions/users.ts`), website users (block / unblock / delete, and new sign-ups by email, Google or phone via `upsertFederatedUser`'s `onCreated`), blogs (create, edit, publish / draft / archive, delete) and settings (hotel admin permissions). Not logged yet: room types, photos, prices, inventory, bookings. Add a `logActivity` call when a new admin action should show there
- Admin panel UI: `admin/AdminToaster` (mounted by AdminShell, by request) gives every panel action feedback with nothing at the call sites: it wraps `window.fetch` and shows "Saving changes…" / "Loading…" (spinner) while a server action (`Next-Action` header) or page load (`RSC`, not prefetches) runs over 200 ms, "Changes saved" when an action that revalidated (`x-action-revalidated`) finishes without `"success":false` in its result (skipped when the screen showed its own success message), an error toast for a failed request, and turns the panel's `alert(…)` calls into toasts (red for error words, green for success words, else info). Own messages: `toast.success / error / info` from `lib/stores/use-toast-store.ts`, rendered by `components/ui/toaster.tsx`: toasts in the top-right corner, the busy state as a square loading box (spinner + label) in the centre (by request, 2026-11-05). `admin/AdminShell` (from `(panel)/layout.tsx`) = `admin/AdminNav` sidebar (light, nav in groups Overview / Operations / Finance / Content / System, role- and feature-filtered; a section stays highlighted on its sub-pages; slides in on phones) + sticky top bar naming the current section + content at full width beside the sidebar (24px gutters, stops at 1680px). Panel-only looks for shared tables / cards / tabs are set as scoped classes on the content wrapper (`CONTENT_STYLES`), so `components/ui` stays as the public site uses it. Every admin page starts with `admin/AdminPageHeader` (title, description, `backHref` / `backLabel`, `actions`); figures use `admin/StatCard` (compact: tinted icon left, figures right; `tone`, `toneValue`); statuses use `admin/StatusPill` (solid fill, white text) everywhere a booking or payment status shows (dashboard, hotel + boat bookings tables and booking pages); one colour per status lives in `admin/status-colors.ts`, shared with the calendar: confirmed / paid = brand green (`primary`), pending / processing / refund requested = amber, checked in = blue, checked out / completed / refunded = grey, cancelled / failed = red. The dashboard renders `admin/DashboardView`: four key figures, then (hotel admins only) `admin/BookingCalendar`, then Recent Bookings as a table beside a Bookings panel (today / pending / confirmed). The calendar is a month (Monday first) of day tiles with gaps, stays as bars from check-in through the last night, coloured by status from `status-colors.ts` (solid fill, white text, darker left edge; cancelled struck through), each linking to its booking: guest name in bold, then room type ×rooms · check-in time (`hotels.check_in_from_time`) · dates; a bar of 2+ days also shows nights · guests and "Out <date> · <check_out_time>" at its right end (or › when it carries on into the next week); each week only gets the bar rows it uses; and a hover card with the whole stay (room, guests, check-in/out date + time, nights, status, ref); up to 3 rows a week, then "+N more" with the day list; hotel filter when the admin has several hotels; Show cancelled; months load on demand via `getBookingCalendar` (`lib/actions/admin/bookings.ts`, scoped to the admin hotels)
- Section headings use `components/layout/SectionHeader` (gold eyebrow, Manrope title, optional description and right-aligned action) — reuse it for new sections
- Sections alternate ivory (`bg-background`) and white bands (`bg-card border-y border-border`); cards are white with a hairline `border-border` and a soft teal-tinted shadow on hover
- Phone menu (the `Navbar` sheet, by request 2026-11-05: minimal and white): logo + close bar, who's signed in (or Sign in / Register), then "Your account" (My Trips, Profile, Wishlist; signed out: My Trips opens sign-in) above "Explore" (the nav links plus Travel Blog, a `menuOnly` link not in the desktop bar), Sign out, and a small help row (call / WhatsApp / email + `SocialLinks tone="plain"`). Rows (`MenuRow`) are full-width with a plain icon and a teal left bar on the current page, not pills (exception to the pill rule)
- Search box on phones (by request): `HotelSearchBox` tiles drop their hint line (region, weekday, guest breakdown) below `sm` and use smaller values, the Search button is 44px, the phone hero is 460px tall so the box sits higher, and `/hotels` hides its "Find your perfect stay" heading on phones (`sr-only`)
- Navbar is 64px (72px from `sm`); fixed-header offsets use `pt-16 sm:pt-[72px]` and sticky bars `top-16 sm:top-[72px]`
- Marketing copy about cancellations must use `FREE_CANCELLATION_HOURS` and mention the gateway fee (refunds are not "free")

## Search Components Pattern

`search/HotelSearchBox` is the one hotel search: the homepage `SearchWidget` hotel tab and the `/hotels` header both use it; dates and guests live in `useSearchStore` (Zustand):
- Tiles: Destination → Check-in/out (with nights) → Rooms & Guests → Price per night, Search button, stay-type chips below
- Rooms & Guests popover, MakeMyTrip-style: "Who's travelling?" with an (i) button that opens the "Good to know" notes in a small popup (`search/GuestsGoodToKnow`; hidden otherwise, by request), Adults, Children, then "Age of children" as soon as there are children (`search/ChildAgeSelects`: "Child 1" beside a compact "Select" / "3 yrs" dropdown, two to a row, ages 1–11), Rooms, pets. Apply and Search wait until every age is picked (the missing ones turn red); Search puts them in the URL as `ages=2,6`
- Destination is `search/DestinationPicker`: type to filter ("b" → Bhatkal) the cities that have active stays, with counts, and stays by name (`GET /api/hotels/destinations` → `HotelService.getDestinationIndex`, `useDestinationIndex`); only cities are listed, never districts or states. Picking a stay opens its page; "Search “…”" searches the typed text. On /hotels, `location` matches city, district, state or hotel name (`hotelLocationFilter` in `lib/utils/india-locations.ts`; a district also matches older hotels by their city)
- The search starts at `DEFAULT_DESTINATION` (`lib/config/search.ts`, Honnavar), and `/hotels` with no `location` lists that city, so the results always match the search box (by request; every "/hotels" link lands there). The navbar's Hotels link (hotel icon, also on desktop) is `hotelsSearchHref(useSearchStore state)`: the search box's `pickedCity`, dates and guests
- `/hotels` renders `<HotelSearchBox compact keepFilters initial={params} />`: `compact` drops the price tile and chips (the sidebar `HotelFilters` cover them), `keepFilters` keeps star/amenity/sort params when searching again, `initial` pre-fills from the URL via `hydrateFromParams()` (price and stay type re-sync whenever the URL changes)
- Date range: `Calendar mode="range"`, two months from `md`, past dates disabled
- Results use `search/HotelCard` (`@container`): photo / details / rating + price column (192px) when the card is ≥ 42rem (`@2xl:`); 36–42rem (`@xl:`) photo left with the price as a row under the details; stacked when narrower (phones, wishlist grid; a short 16:7 photo on phones, name and city stacked left of the stars). The whole card is one link (the title link's `after:absolute after:inset-0`; heart, photo dots and arrows sit above at z-10; arrows only from `sm`); no "View stay" button, by request. Top-right (`RatingInfo`): gold star icons with the stars in bold words under them, with the property type ("3 Star Hotel", "4 Star Resort"), then the guest rating in bold text, or bold "New" when it has neither; no badges or pills there (by request). Under the details the price's small print sits left of the price on one row; in the wide column it stacks right-aligned. The small print (`PriceNote`) wraps only between its parts, and a one-night stay doesn't repeat the nightly price
- Results are priced for the searched group (`priceForGroup`, MakeMyTrip-style): `/hotels` works out each stay's `quote` = the cheapest room type that takes `adults` / `children` (with their `ages`: 6–11 pay the child rate, 1–5 are free) / `rooms` (`roomsForParty`, `partyNightlyPrice` in `lib/utils/occupancy.ts`, within the price filter when one is set), with rooms left and the dates' prices for all room types at once (`HotelService.getAvailableRoomsMap` with the admin client, `getEffectivePriceMap`). The card shows "3 rooms · 6 nights", the stay's total and the nightly price ("3 rooms" and the nightly price without dates); a stay with no room type for the group keeps its "Starting from" price with "Not available for your search". Price sorts use the group's nightly price, those stays last. The wishlist grid keeps the plain starting price
- Boat tab in SearchWidget uses separate `boatDate` (single date) state

## Review System

- **Hotel reviews** (`lib/actions/reviews.ts`): Converts 1-5 star input → 0-10 scale in DB. Categories: overall, staff, facilities, cleanliness, comfort, value, location, free_wifi
- **Boat reviews** (`lib/actions/boat-reviews.ts`): Categories: overall, safety, crew, experience, value
- One review per booking (enforced). User must own the booking. Booking must be completed + paid.
- Status: pending → approved (by admin)

## Blog System

- Tiptap editor with extensions: color, image, link, placeholder, text-align, text-style, underline
- Custom prose styles in `app/globals.css`
- Auto-generated slugs from title (with collision handling)
- Status: draft, published, archived. SEO: meta_title, meta_description. Tags as string array.
- `getAllBlogs` uses `rpc('get_blogs_with_author')` (`lib/db/rpc.ts`) to join with author email
- **City** (`blogs.city`, optional; empty = general post): set in the admin form's Location card (suggestions from `getBlogCityOptions`: hotel cities, then cities on posts; a typed name matching a suggestion takes its spelling). Names compare without case/extra spaces (`lib/utils/blog-city.ts`). Where it shows: `/blog` city chips + `?city=` filter (and the post page links there); `GET /api/blogs/featured?city=` (or `?general=1`: posts with no city); homepage `FeaturedBlogs` follows `useSearchStore.pickedCity` (the destination shown in `HotelSearchBox`, its default Honnavar included): that city's posts with an "Explore <city>" button to `/blog?city=`, else general posts (never another city's), else a "No stories about X yet" box; `/hotels?location=` renders `<FeaturedBlogs city=…>` under the results (only when that city has posts). A post with a city, and `/blog?city=`, show "Explore stays in <city>" (`blog/ExploreStaysButton`, to `/hotels?location=`) when `HotelService.staysInCity` finds active stays there
- **Cards**: posts show as `blog/BlogStoryCard` (photo as the card background, dark gradient, title, excerpt and Read story over it; no city pill, tags, date or view count, by request; teal gradient without a photo), two to a row on the homepage (`FeaturedBlogs`, up to 4; its header link "Explore <city>" / "View all stories" is a light bordered pill with a teal arrow circle) and on `/blog`
- **Post page** (`blog/[slug]`): full-width cover photo with the title over it and one line under it: city (link to `/blog?city=`) · date · reading time (no pill, tags or view count shown, by request; views are still counted); below, the article and a sticky 320px sidebar in one `page-container` (Explore stays panel, More from <city>, Journal link). The body uses `max-w-none!` because `.prose` in globals.css caps it at 65ch. A view is counted in the page only (`countView`), not in `generateMetadata`

## Conventions

- **Server logs**: in server code (`lib/actions`, `lib/db`, `lib/firebase`, `lib/services`, `lib/utils/admin.ts`) log with `serverLog.error / warn / info` (`lib/utils/server-log.ts`, writes to stdout/stderr), not `console.*`: in dev React replays server console calls in the browser and that replay crashed the admin panel ("frame.join is not a function"); it also keeps server details out of visitors' consoles. `lib/db` imports it relatively (`../utils/server-log`) for its tests

- **Path alias**: `@/*` → project root
- **Currency**: INR formatted via `formatCurrency()` in `lib/utils.ts` (Intl.NumberFormat en-IN)
- **CSS**: Tailwind CSS 4 with `cn()` (clsx + tailwind-merge). Theme tokens in `app/globals.css` — use token classes, never hex values in components:
  - Brand Teal `#107F78` → `primary` (hover `#096861` → `hover:bg-primary-hover`), Deep Teal `#073F3D` → `secondary`, Champagne Gold `#D8AA68` → `gold`
  - Warm Ivory `#F8F6F0` → `background`, White → `card`, Soft Mint `#E8F3EF` → `mint` / `muted` / `accent` (shadcn hover surfaces), Border `#E2E9E5` → `border`
  - Dark Slate `#243A38` → `foreground`, Muted Gray `#647874` → `muted-foreground`
- **Fonts** (`lib/fonts.ts`, variables on `<html>`): Manrope 600/700/800 for headings, titles and hotel names (`h1`–`h6` automatically, or `font-heading`); Inter 400/500/600 for everything else (`font-sans`, the default). Self-hosted with `next/font/local` from `app/fonts/` (variable woff2, latin + latin-ext): `next/font/google` broke Turbopack whenever Google answered with `/l/font?kit=…&skey=…` URLs. How the files were made is in `lib/fonts.ts`
- **UI Components**: shadcn/ui (New York style) in `components/ui/`
- **Radius**: every control is a pill (`rounded-full`): `Button` (all sizes; icon buttons are circles), `Input`, `SelectTrigger`, tabs, calendar days and range ends, select / dropdown items, chips, nav links, sidebar items and button-styled links. Don't add `rounded-lg`/`rounded-xl` to a control. Panels and surfaces keep soft corners: cards `rounded-2xl`, popover / dropdown / select panels `rounded-xl`, `Textarea` `rounded-2xl`; photo thumbnails, booking-calendar bars and checkboxes keep their own. Exception, by request: the hero search box (`search/HotelSearchBox`, `DestinationPicker` options) keeps its `rounded-xl` fields and Search button (its stay-type chips are pills). Second exception, by request (2026-11-04): the hotel page rooms list (`hotel/RoomComparison`: cards, buttons, badges, compare bar and comparison dialog), `hotel/BookingCartBar` and the phone "Select rooms" bar use small 6px corners (`rounded-md`), no pills
- **Icons**: solid everywhere. Import from `@/components/icons`, never `lucide-react`: it exports Phosphor icons (`@phosphor-icons/react/dist/ssr`, one file each, server- and client-safe) under the old Lucide names (`Mail`, `MapPin`, `Loader2`, `type LucideIcon`…), "fill" weight, or "bold" for pure line glyphs (X, Check, Plus, Minus, Menu, MoreVertical, Loader2, editor toolbar) whose fill versions sit in a filled square. Need a new icon: add it there with its Phosphor equivalent. Amenity icons come from `getAmenityIcon` (`lib/utils/amenityIcons.tsx`): keyword rules on the amenity's name ("Free WiFi", "24-Hour Front Desk", "Iron & Ironing Board"), most specific first, a check mark when none matches; add a rule there when a new amenity shows the check. shadcn `add` generates `lucide-react` imports: point them at `@/components/icons` (add the name if missing). `lucide-react` stays installed only for that
- **Forms**: React Hook Form + Zod schemas
- **Data fetching (server)**: `const db = await createClient()` (or `createAdminClient()`) from `lib/db/server.ts`
- **Data fetching (client)**: TanStack Query hooks hitting API routes or server actions — never Firestore directly
- **Revalidation**: `revalidatePath('/path')` after mutations
- **Server Actions body limit**: 3MB

## ESLint Rules

- `no-explicit-any`: off
- `no-unused-vars`: warn
- `no-unescaped-entities`: off
- `no-img-element`: warn

## Environment Variables

Required in `.env` (see `.env.example`):
```
NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT_KEY          # service-account JSON on one line (or FIREBASE_PROJECT_ID/_CLIENT_EMAIL/_PRIVATE_KEY)
NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RESEND_API_KEY
EMAIL_FROM="Honnavar Travels <noreply@honnavartravels.com>"
TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (or TWILIO_AUTH_TOKEN)   # optional: WhatsApp
TWILIO_WHATSAPP_FROM, TWILIO_WA_GUEST_BOOKING_SID, TWILIO_WA_HOTEL_BOOKING_SID      # see docs/WHATSAPP_TEMPLATES.md
BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, BUNNY_STORAGE_REGION, BUNNY_CDN_URL     # optional: images on Bunny CDN
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
```

Firebase console setup: enable the Email/Password sign-in provider, create the Firestore database and Storage bucket, and deploy `firestore.rules` / `storage.rules` (`firebase deploy --only firestore:rules,storage`).

## Hosting (Netlify)

- `netlify.toml` — build `npm run build`, Next.js runtime applied automatically
- Scheduled job: `netlify/functions/cancel-stale-bookings.mjs` calls `/api/cron/cancel-stale-bookings` every 15 min with `CRON_SECRET` (`vercel.json` holds the equivalent Vercel cron)
- Node 22 is pinned (`NODE_VERSION` in `netlify.toml`, `engines` in `package.json`): firebase-admin 14 needs it. Its auth module `require()`s `jose` through `jwks-rsa`; jose 6 is ESM-only and only loads on Node ≥ 22.12 / 20.19, so `overrides` / `pnpm.overrides` pin jose 5 (CommonJS) to load on any Node. A failure there breaks every route that imports `lib/db` with Next's bare 500 page
- `GET /api/health`: Node version, whether the server modules load and Firestore answers, and which required env vars are missing (names only); 503 until all pass. Check it after each deploy
- Both `package-lock.json` (local npm installs) and `pnpm-lock.yaml` are committed; keep them in step when changing dependencies
- Netlify installs with pnpm (it sees `pnpm-lock.yaml`), which only links declared packages, and `next build` type-checks every `.ts` file, `scripts/` included. So never import a package that isn't in `package.json`, even one that resolves locally through npm hoisting (e.g. `sharp`, only an optional dependency of next): the build fails with "Cannot find module"
- Keep the server functions in a US region (Netlify's default us-east-2 is fine): Firestore is in nam5, and every uncached query from India or Mumbai (Vercel's `bom1`, where the old www.triplovia.com runs) costs 0.4–1.5 s. Local `next dev` from India feels slow for the same reason, plus dev compiling
- Server code runs in AWS Lambda, which caps all environment variables at 4KB combined: prefer `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` over the full service-account JSON, and don't add the Supabase variables there

## Security Practices

- Payment amount always fetched from database, never trusted from client
- Razorpay HMAC SHA256 signature verification + amount cross-check via API
- Idempotency: checks `payment_gateway_payment_id` to prevent double processing
- Firestore and Storage closed to browsers (rules deny client access); row access for user-scoped queries enforced by `lib/db/policies.ts`
- Session cookies are httpOnly, verified with revocation checks; roles come from server-written `_auth_users.user_metadata`
- Server-side admin guards (`requireAdmin`, `requireHotelAccess`)
- Image upload validation (type, size, sanitized storage paths)
- Booking ownership verification (users can only access own bookings/reviews); guest checkouts are hidden from all row policies and reached only through the admin client after the browser's guest token is checked
- Booking creation counts availability and generates references with the admin client (row policies would hide other guests' bookings); the hotel page (`HotelService.getHotelBySlug`), search results and the review page count rooms left the same way (only counts leave the server)


### Activity log continuation (2026-11-05)
The clock now links to the super-admin-only `/activity` page (also in the System sidebar). `ActivityLogView` shows field-by-field Before / After tables for new hotel, blog, vendor and permission updates; unchanged saves are omitted. Vendor passwords are recorded only as Changed. Historical entries retain their summaries. Fixed the interrupted regex edits in the comparison helpers. Existing scope exclusions (room types, media, inventory, bookings) still apply.


### Hotel cancellation matrices (2026-11-05)
Edit Hotel now requires selecting Flexible / Moderate / Strict in a dropdown and previews only the selected matrix. Shared definitions: lib/config/hotel-cancellation-policy.ts; shared UI: components/hotel/CancellationPolicyMatrix.tsx. Flexible refunds 100% at >=24h; Moderate refunds 100% at >=72h, 50% at >=24h and <72h; Strict/no-show refunds 0. New matrix refunds have no gateway deduction (explicit user choice). Hotel cancellation_policy and generated cancellation_policy_text are saved server-side. All three creation paths (bookings action, multi-booking API, BookingService) read snapshotHotelPolicy and save cancellation_policy + cancellation_check_in_time on each booking. Missing snapshots retain legacy 48h/gateway terms; never use the current hotel policy to recalculate an old booking. Scheduled check-in for new policies uses Asia/Kolkata (+05:30). Refund GET and POST use calculateHotelRefund; customer refund approvals keep the amount calculated at request time. Super-admin RefundButton can record a vendor cancellation: mandatory full refund, no reduced override. Commission obligations appear as supplied text; commission collection/settlement is not automated by this feature. Test with npm run test:policy.


### Customer and vendor booking emails (2026-11-05)
Payment-success confirmation uses independent durable customer/vendor email deliveries (lib/db/booking-email-delivery.ts) with frozen payloads, leases and Resend idempotency. New Netlify booking-confirmations function runs every 5 minutes against a CRON_SECRET-protected recovery endpoint. See docs/BOOKING_CONFIRMATION_EMAILS.md for recipients, env, previews, retry limits and tests. _booking_confirmation_runs and _booking_emails are server-only internal collections. confirmation_sent_at is updated after successful available email sends. Pre-payment confirmation removed from BookingService. Webhook now sums/updates the whole hotel payment group and issues all invoice numbers.


### Phone verification and guest booking recovery (2026-11-05)
Email registration and completing a phone after Google/email sign-in now require an SMS proof token. phoneFromProof verifies fresh Firebase phone sign-in claims (the server separately verifies signature/revocation); typed contact numbers cannot claim bookings. Metadata verified_phone + phone_verified_at attest the number, checked against metadata.phone. Existing unverified numbers are prompted again. VerifiedPhoneInput provides send/verify/resend/edit with a 30-second cooldown; usePhoneAuth guards concurrent sends and reCAPTCHA cleanup. AuthPanel shares ResendOtpButton across login/signup. completeProfile attaches only unowned guest records after SMS proof, preserving the existing email/Google session. Email verification callback and later email logins also claim records for an already verified phone. Phone-only and email accounts are still separate identities; this does not merge accounts. My Bookings includes GuestBookingRecovery for already-signed-in users with an unverified number. BookingsList tolerates missing hotel/room joins and malformed dates; account/error.tsx provides retry and logs errors. The supplied console trace confirmed a null hotel_images access in BookingsList; it is fixed with null-safe rendering and authorized booking-property hydration. Test: npm run test:auth, npm run test:db; additional render/action fixture checks were run without live OTPs or production user writes.

The user then supplied the exact My Bookings exception: Cannot read properties of null (reading hotel_images). This confirms the null relation crash. After booking row policies authorize a read, hydrateBookingProperties reads only the referenced property display fields with the admin client to retain details for archived hotels/unavailable rooms. It is used by getUserBookings and getBookingByReference; public catalogue permissions are unchanged. BookingsList still has null fallbacks for genuinely missing records.

### Data preservation and storage diagnostics (2026-11-05)
The user withdrew the reset request: keep all existing Firebase accounts, bookings, payments, refunds, vendors and other data. No data was deleted. Local ENOENT manifest errors came from concurrent development and production processes sharing .next; next.config.ts now uses .next-dev for development and retains .next for production/Netlify. Run only one dev server per workspace.

The 360° upload failure is on triplovia.com. Read-only scripts/check-storage.mjs confirmed local Bunny zone access (200), while the configured Firebase bucket triploviia.firebasestorage.app does not exist (404). Production Bunny env/scope is not accessible here and must be checked in Netlify; see docs/storage-setup.md. Partial Bunny config now fails with missing variable names instead of silently falling back to Firebase; upload 404 errors explain that the bucket is missing. No live upload or production metadata changes were made during diagnosis.

Validation: final production build completed successfully after output separation and storage changes; npm run test:auth passed (2 tests), npm run test:db passed (17 tests earlier in the session). Storage config/routing fixture checks passed; local read-only Bunny/Firebase checks are documented above. No production deployment or live SMS test was performed.
