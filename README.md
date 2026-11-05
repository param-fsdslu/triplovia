# Triplovia  

A full-featured travel booking platform for hotels and boats, built with Next.js 15 App Router, Supabase, and Razorpay payments. Supports multi-language (i18n), admin management, and real-time availability.

Deployment - v15

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, shadcn/ui (New York) |
| Icons | Lucide React |
| Server State | TanStack Query v5 |
| Client State | Zustand v5 |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password) via @supabase/ssr |
| Payments | Razorpay (orders, verification, webhooks, refunds) |
| Email | Resend + React Email |
| i18n | next-intl (en, es, fr) |
| Forms | React Hook Form + Zod |
| Rich Text | Tiptap |
| Dates | date-fns + react-day-picker |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create `.env.local` with the required environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_RAZORPAY_KEY_ID=
   RAZORPAY_KEY_SECRET=
   RAZORPAY_WEBHOOK_SECRET=
   RESEND_API_KEY=
   EMAIL_FROM="Triplovia <noreply@triplovia.com>"
   NEXT_PUBLIC_APP_URL=
   NEXT_PUBLIC_SITE_URL=
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```

### Commands

```bash
pnpm dev       # Start dev server (Turbopack)
pnpm build     # Production build
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

Add shadcn/ui components:
```bash
pnpm dlx shadcn@latest add <component>
```

## Project Structure

```
app/
├── [locale]/                     # i18n-prefixed routes (en, es, fr)
│   ├── (guest)/                  # Public pages
│   │   ├── about/                #   About page
│   │   ├── boats/                #   Boat listings & detail
│   │   ├── hotels/               #   Hotel listings & detail
│   │   ├── reviews/              #   User reviews
│   │   ├── privacy/              #   Privacy policy
│   │   ├── terms/                #   Terms & conditions
│   │   └── refund-policy/        #   Cancellation & refund policy
│   ├── auth/                     # Auth: login, signup, forgot/reset password
│   ├── blog/                     # Blog listing & detail ([slug])
│   ├── dashboard/                # Protected: user dashboard
│   ├── bookings/                 # Protected: hotel bookings
│   ├── boat-bookings/            # Protected: boat bookings
│   ├── profile/                  # Protected: user profile
│   ├── payment/                  # Payment success
│   └── settings/                 # User settings
│
├── console-b69ece1a1dc2/         # Admin panel (no locale prefix); URL = ADMIN_PATH (lib/config/admin-path.ts)
│   ├── analytics/                #   Dashboard analytics
│   ├── blogs/                    #   Blog management (Tiptap editor)
│   ├── boats/                    #   Boat CRUD
│   ├── boat-bookings/            #   Boat booking management
│   ├── bookings/                 #   Hotel booking management
│   │   └── [reference]/          #   Booking detail (meal plans, payments)
│   ├── hotels/                   #   Hotel CRUD
│   ├── payments/                 #   Payment records
│   ├── refunds/                  #   Refund management
│   ├── settings/                 #   Admin settings
│   └── users/                    #   User management
│
├── api/                          # API routes (no locale prefix)
│   ├── blogs/                    #   Blog API
│   ├── boats/                    #   Boat search, availability, featured
│   ├── boat-bookings/            #   Boat booking creation
│   ├── bookings/                 #   Hotel booking creation
│   ├── hotels/                   #   Hotel search, featured, by slug
│   └── payment/                  #   create-order, verify, refund, webhook
│
components/
├── ui/                           # shadcn/ui primitives (button, card, dialog, etc.)
├── admin/                        # Admin tables & forms (Hotels, Boats, Bookings, Blogs, Users, Refunds)
├── auth/                         # Login, signup, password reset forms
├── booking/                      # BookingForm, BoatBookingForm, confirmations
├── search/                       # SearchWidget, filters, hotel/boat cards, results
├── hotel/                        # Hotel detail components
├── boat/                         # Boat detail components
├── reviews/                      # Review dialogs (hotel & boat)
├── payment/                      # RazorpayButton
├── listing/                      # ListPropertyDialog
├── packages/                     # PackagesSection, PackageEnquiryDialog
├── navigation/                   # UserNav
├── profile/                      # Profile components
├── wishlist/                     # Wishlist components
├── Hero.tsx                      # Homepage hero with search widget
├── Featured.tsx                  # Featured hotels/boats sections
├── FeaturedBlogs.tsx             # Featured blog posts
├── FeaturedHotels.tsx            # Featured hotels section
├── Services.tsx                  # Services overview
├── Navbar.tsx                    # Main navigation bar
└── Footer.tsx                    # Site footer with company details

lib/
├── actions/                      # Server actions ('use server')
│   ├── admin/                    #   Hotel admin CRUD (barrel: index.ts)
│   │   ├── _helpers.ts           #     Shared admin helpers
│   │   ├── hotels.ts             #     Hotel CRUD
│   │   ├── hotel-images.ts       #     Hotel image management
│   │   ├── hotel-amenities.ts    #     Hotel amenity management
│   │   ├── room-types.ts         #     Room type CRUD
│   │   ├── room-type-images.ts   #     Room type images
│   │   ├── room-type-amenities.ts#     Room type amenities
│   │   ├── bookings.ts           #     Booking queries with search/filter
│   │   ├── payments.ts           #     Payment records
│   │   ├── meal-plans.ts         #     Meal plan management
│   │   ├── inventory.ts          #     Room inventory
│   │   ├── permissions.ts        #     Admin permissions
│   │   └── stats.ts              #     Dashboard statistics
│   ├── auth.ts                   #   Sign in/up/out, password reset
│   ├── bookings.ts               #   Hotel booking actions
│   ├── boat-bookings.ts          #   Boat booking actions
│   ├── boat-admin.ts             #   Boat admin CRUD
│   ├── blogs.ts                  #   Blog CRUD
│   ├── reviews.ts                #   Hotel review actions
│   ├── boat-reviews.ts           #   Boat review actions
│   ├── users.ts                  #   User management
│   ├── wishlists.ts              #   Wishlist actions
│   └── profile.ts                #   Profile management
│
├── services/                     # Business logic layer
│   ├── booking.service.ts        #   Hotel booking: totals, tax, room assignment
│   ├── boat-booking.service.ts   #   Boat booking logic
│   ├── hotel.service.ts          #   Hotel search, availability
│   ├── boat.service.ts           #   Boat search, availability, slots
│   └── email.service.ts          #   Transactional emails via Resend
│
├── hooks/                        # TanStack Query hooks (client data fetching)
│   ├── use-hotels.ts             #   useHotels, useFeaturedHotels, useHotelBySlug
│   ├── use-boats.ts              #   useFeaturedBoats, useBoatBySlug, useAvailableSlots
│   ├── use-supabase-query.ts     #   useUser, useSession, useProfile
│   ├── use-wishlist.ts           #   Wishlist queries
│   └── useRazorpay.ts            #   Razorpay script loader
│
├── stores/                       # Zustand stores (providerless, no wrapper needed)
│   ├── use-search-store.ts       #   Search form state (shared across widgets)
│   ├── use-booking-store.ts      #   Guest contact pre-fill (persisted to localStorage)
│   └── use-ui-store.ts           #   UI toggles (mobile menu)
│
├── supabase/                     # Supabase client setup
│   ├── server.ts                 #   Server-side client (createClient)
│   ├── client.ts                 #   Browser-side client
│   ├── middleware.ts              #   Session refresh middleware
│   └── profiles.ts               #   Profile helpers
│
├── razorpay/
│   └── config.ts                 #   Razorpay instance, keys, currency
│
├── providers/
│   └── query-provider.tsx        #   TanStack Query provider
│
├── config/
│   └── features.ts               #   Feature flags (hotels, boats, blogs, cabs, bikes)
│
├── types/                        # Domain-split TypeScript types (barrel: index.ts)
│   ├── common.ts                 #   Shared types & enums
│   ├── hotel.ts                  #   Hotel domain types
│   ├── boat.ts                   #   Boat domain types
│   ├── auth.ts                   #   Auth types
│   └── database.types.ts         #   Supabase generated types
│
├── utils/                        # Utilities
│   ├── admin.ts                  #   Admin guards (requireAdmin, requireHotelAccess)
│   ├── roles.ts                  #   Role definitions (super_admin, hotel_admin)
│   ├── storage.ts                #   Image upload/delete helpers
│   ├── export.ts                 #   CSV & PDF export utilities
│   ├── logger.ts                 #   Structured logging
│   ├── image-compression.ts      #   Client-side image compression
│   ├── amenityIcons.tsx          #   Amenity icon mapping
│   ├── hotelAdminPermissions.ts  #   Hotel admin permission helpers
│   └── with-api-logging.ts       #   API route logging wrapper
│
└── utils.ts                      # cn() (clsx + tailwind-merge), formatCurrency(), isValidPhone()

i18n/
├── routing.ts                    # Locale config: en, es, fr (default: en)
└── request.ts                    # next-intl request config

messages/
├── en.json                       # English translations
├── es.json                       # Spanish translations
└── fr.json                       # French translations

supabase/
├── config.toml                   # Supabase local config
├── migrations/                   # Database migrations
├── scripts/                      # Database scripts
├── supabase.database.types.ts    # Generated database types
└── table_policies.json           # RLS policy definitions

middleware.ts                     # Route middleware (auth, i18n, feature flags)
```

## Architecture

### Routing & Middleware

All requests pass through `middleware.ts` in this order:

1. **Feature flag check** - disabled features return 404
2. **API passthrough** - `/api/*` routes skip i18n/auth
3. **Admin routes** - `ADMIN_PATH` (`/console-b69ece1a1dc2`, `lib/config/admin-path.ts`) skips i18n; `/admin` is a 404
4. **Auth session refresh** - Supabase cookie refresh via `updateSession()`
5. **Protected route guards** - redirect unauthenticated users to login
6. **Auth route guards** - redirect authenticated users away from login/signup
7. **next-intl** - locale detection and URL prefixing

### State Management

| Layer | Tool | Purpose |
|-------|------|---------|
| Server state | TanStack Query v5 | Hotels, boats, user/profile data |
| Client state | Zustand v5 | Search form, booking guest details, UI toggles |
| Auth state | Supabase client | Session management (no store needed) |
| Filter state | URL search params | Source of truth on listing/results pages |

### Feature Flags

Toggle entire feature modules in `lib/config/features.ts`. Disabling a feature hides it from navigation, homepage, search, and blocks direct URL access via middleware.

```
hotels: true    boats: false    blogs: true    cabs: false    bikes: false
```

### Auth & Roles

| Role | Access |
|------|--------|
| `super_admin` | Everything: all hotels, boats, bookings, analytics, users, blog |
| `hotel_admin` | Specific hotels only (assigned via `user_metadata.hotel_ids[]`) |

### Payment Flow (Razorpay)

1. **Create Order** - server fetches amount from DB (never from client), creates Razorpay order
2. **Client Checkout** - `RazorpayButton` opens Razorpay modal
3. **Verify** - HMAC SHA256 signature verification + amount cross-check, idempotency on payment ID
4. **Webhook** - handles async events (authorized, failed)
5. **Refund** - 48-hour free cancellation, sliding refund based on hours until check-in

### Database (Supabase PostgreSQL)

- **Hotel tables**: hotels, hotel_images, hotel_amenities, room_types, room_type_images, room_type_amenities, rooms, bookings, booking_guests
- **Boat tables**: boats, boat_images, boat_amenities, trip_types, trip_type_images, trip_time_slots, boat_bookings
- **Common tables**: amenities, amenity_categories, reviews, boat_reviews, payments, refund_transactions, blogs, blog_images, profiles
- Row Level Security (RLS) enabled on all tables

### Email

Transactional emails sent via Resend with branded HTML templates:
- Booking confirmation & cancellation
- Payment receipt
- Booking status updates

### Styling

- Tailwind CSS 4 with OKLCH color space
- Brand colors: Primary `#075E63` (teal), Accent `#D99A32` (gold)
- `cn()` utility (clsx + tailwind-merge) for conditional classes
- shadcn/ui components in `components/ui/`

### Admin Features

- Full CRUD for hotels, boats, rooms, amenities, images
- Booking management with search (reference, name, email), filters (status, date, hotel)
- Blog editor with Tiptap rich text
- CSV & PDF export on all admin tables
- Analytics dashboard
- User & refund management
