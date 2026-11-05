# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build (Turbopack)
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test:db      # Tests for the Firestore data layer (lib/db) against an in-memory store
```

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
| Icons | Lucide React | 0.554.0 |
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
├── [locale]/dashboard/       # Protected: user dashboard
├── [locale]/bookings/        # Protected: hotel bookings
├── [locale]/boat-bookings/   # Protected: boat bookings
├── [locale]/profile/         # Protected: user profile
├── [locale]/payment/         # Payment success page
├── console-b69ece1a1dc2/     # Admin panel (no locale prefix); URL = ADMIN_PATH (lib/config/admin-path.ts)
│   ├── analytics/, blogs/, boats/, boat-bookings/
│   ├── bookings/, hotels/, payments/, refunds/
│   ├── rooms/, settings/, users/
└── api/                      # API routes (no locale prefix)
    ├── blogs/, boats/, boat-bookings/, bookings/, hotels/
    └── payment/ (create-order, verify, refund, webhook)

components/
├── ui/           # shadcn/ui primitives (button, card, dialog, popover, tabs, etc.)
├── admin/        # Admin: HotelForm, BoatForm, BookingsTable, BoatsTable, ImagesManager, etc.
├── booking/      # BookingForm, BoatBookingForm, BookingConfirmation, BoatBookingConfirmation
├── search/       # SearchWidget, HotelSearchForm, HotelFilters, BoatFilters, HotelCard, BoatCard, results
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

Middleware runs on the edge, where firebase-admin can't run, so it only checks cookie presence. Pages verify sessions: protected pages redirect to login when invalid; `auth/login` and `auth/signup` pages redirect signed-in users to the dashboard. Import only `lib/firebase/auth/constants.ts` from middleware.
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
| `useFeaturedHotels(limit)` | `use-hotels.ts` | Homepage featured (10min stale) |
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

### Zustand v5 (Client State) — Providerless

| Store | File | Persisted | Purpose |
|-------|------|-----------|---------|
| `useSearchStore` | `use-search-store.ts` | No | Search form: location, checkIn, checkOut, adults, children, rooms, boatDate, activeTab, isGuestOpen |
| `useBookingStore` | `use-booking-store.ts` | Yes (`ht-booking-guest`, v1) | Guest contact pre-fill (firstName, lastName, email, phone) |
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
| `users.ts` | Admin user management (super_admin): list/create/update/delete admin users |
| `profile.ts` | `updateProfile`, `deleteAccount` |
| `session.ts` | `getCurrentUser`, `getProfile`, `updateProfileFields`, `getFilterAmenities` (for client components) |
| `uploads.ts` | `uploadUserImage(folder, formData)` — profile/review photos (validated, stored under the user's id) |

**Return pattern:** `{ success: boolean, error?: string, data?: T }`

## Services (`lib/services/`)

| File | Purpose |
|------|---------|
| `email.service.ts` | Resend API: `sendBookingConfirmation`, `sendBookingCancellation`, `sendPaymentReceipt`, `sendBookingStatusUpdate`, `sendEmailVerification`, `sendPasswordReset` (HTML templates with inline CSS) |
| `booking.service.ts` | Hotel booking: calculate totals (tax, service charge), insert booking + guests, `assignRoom`, `processCheckout` |
| `boat-booking.service.ts` | Boat booking logic (parallel structure to hotel) |
| `hotel.service.ts` | Hotel search, retrieval, availability |
| `boat.service.ts` | `searchBoats`, `getBoatBySlug`, `checkAvailability`, `getAvailableSlots`, `getFeaturedBoats` |

## Payment Flow (Razorpay)

Config: `lib/razorpay/config.ts` — server-side instance + client-side key constant

1. **Create Order** (`POST /api/payment/create-order`) — amount from database (NEVER from client), creates Razorpay order (amount in paise), sets booking to `payment_status: 'processing'`
2. **Client Modal** — `components/payment/RazorpayButton.tsx` opens Razorpay Checkout
3. **Verify** (`POST /api/payment/verify`) — HMAC SHA256 signature verification (`order_id|payment_id` + secret), amount cross-check via Razorpay API, idempotency check on `payment_gateway_payment_id` (also a unique key in the data layer), updates booking to `confirmed`/`paid`, creates payment record, sends receipt email
4. **Webhook** (`POST /api/payment/webhook`) — handles async events (payment.authorized, payment.failed), uses `RAZORPAY_WEBHOOK_SECRET`
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
- If name, email or mobile is missing after that, `CompleteProfileForm` asks once and `completeProfile` fills only empty fields. An email typed there is a contact address in `_auth_users`/`profiles` only, never set on the Firebase account (so nobody can claim someone else's address).
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

### Hotel Tables
`hotels`, `hotel_images`, `hotel_panoramas`, `hotel_amenities`, `room_types`, `room_type_images`, `room_type_amenities`, `rooms`, `bookings`

### Boat Tables
`boats`, `boat_images`, `boat_amenities`, `trip_types`, `trip_type_images`, `trip_time_slots`, `boat_bookings`

### Common Tables
`amenities`, `amenity_categories`, `reviews`, `review_responses`, `boat_reviews`, `payments`, `refund_transactions`, `blogs`, `blog_images`, `profiles`

### Internal Collections
`_auth_users` (auth metadata per Firebase user), `_unique` (unique-key sentinels)

### Demo data
`npm run seed:demo` adds "Demo Stay Honnavar (Test Hotel)" (fixed ids, re-runnable); `npm run seed:demo -- --remove` deletes it. It is active and bookable — remove before going live.

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
- Admin: hotel page Images tab → `admin/HotelPanoramasManager`. `preparePanorama` (`lib/utils/panorama.ts`) checks the photo is 2:1 and re-encodes it in the browser as a JPEG ≤ 4096 px wide that fits the 3 MB server action limit; `uploadHotelPanorama` / `deleteHotelPanorama` (`lib/actions/admin/hotel-panoramas.ts`)
- Viewer: `media/PanoramaViewer` (plain WebGL, no library): drag/swipe to look, pinch / ctrl+scroll / buttons to zoom, arrow keys, full screen; turns slowly until touched (not with reduced motion), draws only while visible. Overlays: the hotel name + panorama title (top-left, `hotelName` prop) and "360 Pano | Powered by" + the Luminexa logo (`public/brand/luminexa-logo.webp`) on the bottom edge at the right, under the buttons. WebGL needs a same-origin image, so pages pass `panoramaViewerSrc(url)` (the next/image optimizer URL)
- Hotel page: `hotel/PanoramaTour` in a `#tour` section with a "360° View" tab in the sticky nav, only when the hotel has panoramas

### Hotel location fields
The hotel form (`admin/HotelForm`, new + edit) picks State → District → City/Town from dropdowns (`admin/LocationFields`) when the country is India; other countries get plain text boxes. Data: `lib/data/india-locations.json` (36 states/UTs, 784 districts, 7,094 sub-districts = taluk/tehsil/mandal), loaded on demand via `loadIndiaLocations()` (`lib/utils/india-locations.ts`). Source: the Local Government Directory via https://ramseraph.github.io/opendata/lgd/ (snapshot 2026-10-27); rebuild with `scripts/build-india-locations.mjs` (instructions in the file). City offers "Other (type the place)" for spots that aren’t a sub-district (Gokarna, Murudeshwar). `hotels.district` is new: older hotels get it filled from their city when editing. Hotel search matches the stored city text, so `PREFERRED_NAMES` in the build script keeps common spellings (`Honavar` → `Honnavar`).

### Next.js Image Config (`next.config.ts`)
Remote patterns: `images.unsplash.com`, `**.b-cdn.net` (Bunny pull zone; a custom `BUNNY_CDN_URL` domain is added too), `firebasestorage.googleapis.com/v0/b/**`, legacy `*.supabase.co/storage/v1/object/public/**` (remove after the storage migration)

## Page Layout

- Homepage (`app/[locale]/page.tsx`): `Hero` (photo + Deep Teal gradient, `SearchWidget` card overlapping its bottom edge; its hotel tab is `search/HotelSearchBox`: destination, check-in/out with nights, guests picker, price per night → `minPrice`/`maxPrice`, stay-type chips → `propertyType`; dates default to tonight → tomorrow) → `home/TrustBar` → `FeaturedHotels` (full-photo `home/FeaturedStayCard`s, plus `ExploreStaysCard` filling a 2-of-3 last row) → `PackagesSection` → `FeaturedBlogs` → `home/ListPropertyCta` → `Footer`
- **Page width**: wrap page content in `page-container` (utility in `app/globals.css`): centred, content max 1200px like MakeMyTrip, side gutters 16px → 24px (sm) → 32px (lg) → 40px (xl). Don't use `container` (its width jumps per breakpoint). Narrow pages (profile, bookings) use `mx-auto max-w-* px-4 sm:px-6 lg:px-8`.
- Admin panel UI: `admin/AdminShell` (from `(panel)/layout.tsx`) = `admin/AdminNav` sidebar (light, nav in groups Overview / Operations / Finance / Content / System, role- and feature-filtered; a section stays highlighted on its sub-pages; slides in on phones) + sticky top bar naming the current section + content at full width beside the sidebar (24px gutters, stops at 1680px). Panel-only looks for shared tables / cards / tabs are set as scoped classes on the content wrapper (`CONTENT_STYLES`), so `components/ui` stays as the public site uses it. Every admin page starts with `admin/AdminPageHeader` (title, description, `backHref` / `backLabel`, `actions`); figures use `admin/StatCard` (compact: tinted icon left, figures right; `tone`, `toneValue`); statuses use `admin/StatusPill` (solid fill, white text) everywhere a booking or payment status shows (dashboard, hotel + boat bookings tables and booking pages); one colour per status lives in `admin/status-colors.ts`, shared with the calendar: confirmed / paid = brand green (`primary`), pending / processing / refund requested = amber, checked in = blue, checked out / completed / refunded = grey, cancelled / failed = red. The dashboard renders `admin/DashboardView`: four key figures, then (hotel admins only) `admin/BookingCalendar`, then Recent Bookings as a table beside a Bookings panel (today / pending / confirmed). The calendar is a month (Monday first) of day tiles with gaps, stays as bars from check-in through the last night, coloured by status from `status-colors.ts` (solid fill, white text, darker left edge; cancelled struck through), each linking to its booking: guest name in bold, then room type ×rooms · check-in time (`hotels.check_in_from_time`) · dates; a bar of 2+ days also shows nights · guests and "Out <date> · <check_out_time>" at its right end (or › when it carries on into the next week); each week only gets the bar rows it uses; and a hover card with the whole stay (room, guests, check-in/out date + time, nights, status, ref); up to 3 rows a week, then "+N more" with the day list; hotel filter when the admin has several hotels; Show cancelled; months load on demand via `getBookingCalendar` (`lib/actions/admin/bookings.ts`, scoped to the admin hotels)
- Section headings use `components/layout/SectionHeader` (gold eyebrow, Manrope title, optional description and right-aligned action) — reuse it for new sections
- Sections alternate ivory (`bg-background`) and white bands (`bg-card border-y border-border`); cards are white with a hairline `border-border` and a soft teal-tinted shadow on hover
- Navbar is 64px (72px from `sm`); fixed-header offsets use `pt-16 sm:pt-[72px]` and sticky bars `top-16 sm:top-[72px]`
- Marketing copy about cancellations must use `FREE_CANCELLATION_HOURS` and mention the gateway fee (refunds are not "free")

## Search Components Pattern

Both `SearchWidget` (homepage) and `HotelSearchForm` (hotels page) share state via `useSearchStore` (Zustand):
- Same 4-3-3-2 column grid layout: Location → Date Range → Guests → Search button
- Date range: `Calendar mode="range"`, `numberOfMonths={2}`, past dates disabled
- Guest selector: Popover with GuestCounter (+/- buttons) for Adults, Children, Rooms
- Hover style on outline buttons: `hover:bg-muted/50 hover:text-foreground`
- Hover style on inputs: `hover:border-primary/50`
- `hydrateFromParams()` syncs URL search params → store on hotels page mount
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

## Conventions

- **Path alias**: `@/*` → project root
- **Currency**: INR formatted via `formatCurrency()` in `lib/utils.ts` (Intl.NumberFormat en-IN)
- **CSS**: Tailwind CSS 4 with `cn()` (clsx + tailwind-merge). Theme tokens in `app/globals.css` — use token classes, never hex values in components:
  - Brand Teal `#107F78` → `primary` (hover `#096861` → `hover:bg-primary-hover`), Deep Teal `#073F3D` → `secondary`, Champagne Gold `#D8AA68` → `gold`
  - Warm Ivory `#F8F6F0` → `background`, White → `card`, Soft Mint `#E8F3EF` → `mint` / `muted` / `accent` (shadcn hover surfaces), Border `#E2E9E5` → `border`
  - Dark Slate `#243A38` → `foreground`, Muted Gray `#647874` → `muted-foreground`
- **Fonts** (`lib/fonts.ts`, variables on `<html>`): Manrope 600/700/800 for headings, titles and hotel names (`h1`–`h6` automatically, or `font-heading`); Inter 400/500/600 for everything else (`font-sans`, the default)
- **UI Components**: shadcn/ui (New York style) in `components/ui/`
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
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
```

Firebase console setup: enable the Email/Password sign-in provider, create the Firestore database and Storage bucket, and deploy `firestore.rules` / `storage.rules` (`firebase deploy --only firestore:rules,storage`).

## Hosting (Netlify)

- `netlify.toml` — build `npm run build`, Next.js runtime applied automatically
- Scheduled job: `netlify/functions/cancel-stale-bookings.mjs` calls `/api/cron/cancel-stale-bookings` every 15 min with `CRON_SECRET` (`vercel.json` holds the equivalent Vercel cron)
- Server code runs in AWS Lambda, which caps all environment variables at 4KB combined: prefer `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` over the full service-account JSON, and don't add the Supabase variables there

## Security Practices

- Payment amount always fetched from database, never trusted from client
- Razorpay HMAC SHA256 signature verification + amount cross-check via API
- Idempotency: checks `payment_gateway_payment_id` to prevent double processing
- Firestore and Storage closed to browsers (rules deny client access); row access for user-scoped queries enforced by `lib/db/policies.ts`
- Session cookies are httpOnly, verified with revocation checks; roles come from server-written `_auth_users.user_metadata`
- Server-side admin guards (`requireAdmin`, `requireHotelAccess`)
- Image upload validation (type, size, sanitized storage paths)
- Booking ownership verification (users can only access own bookings/reviews)
