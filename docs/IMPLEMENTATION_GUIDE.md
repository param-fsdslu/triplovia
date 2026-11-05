# Implementation Guide - Hotel Booking System

**Project:** Honnavar Travels
**Stack:** Next.js 15, TypeScript, Supabase, TanStack Query, Shadcn UI
**Started:** 2025-12-08

---

## Quick Start

### 1. Set Up Supabase Database

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/bpueyipztjdghxyjcqgd
2. Navigate to **SQL Editor**
3. Copy the entire contents of `docs/database-schema.sql`
4. Paste and click **Run**
5. Verify all tables are created in **Table Editor**

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref bpueyipztjdghxyjcqgd

# Apply migrations
supabase db push
```

### 2. Generate TypeScript Types

After creating the database schema, generate TypeScript types:

```bash
# Generate types from your Supabase database
npx supabase gen types typescript --project-id bpueyipztjdghxyjcqgd > lib/types/database.types.ts
```

Or use the Supabase Dashboard:
1. Go to **Settings** > **API** > **API Docs**
2. Find **Generate Types** section
3. Copy the TypeScript types
4. Save to `lib/types/database.types.ts`

### 3. Install Additional Dependencies

```bash
# If not already installed
pnpm install @supabase/ssr @supabase/supabase-js @tanstack/react-query
pnpm install -D @types/node
```

### 4. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
honnavar-travels/
├── app/
│   ├── [locale]/              # Internationalized routes
│   │   ├── (auth)/            # Authentication routes
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (guest)/           # Guest-facing routes
│   │   │   ├── page.tsx       # Home/Search page
│   │   │   ├── hotels/
│   │   │   │   ├── [slug]/    # Hotel details
│   │   │   │   └── search/    # Search results
│   │   │   ├── booking/
│   │   │   │   └── [id]/      # Booking flow
│   │   │   ├── my-bookings/   # User bookings
│   │   │   └── profile/       # User profile
│   │   ├── (hotel-manager)/   # Hotel manager routes
│   │   │   ├── dashboard/
│   │   │   ├── hotels/
│   │   │   ├── bookings/
│   │   │   ├── reviews/
│   │   │   └── settings/
│   │   └── (admin)/           # Admin routes
│   │       ├── dashboard/
│   │       ├── users/
│   │       ├── hotels/
│   │       └── analytics/
│   ├── api/                   # API routes
│   │   ├── auth/
│   │   ├── hotels/
│   │   ├── bookings/
│   │   └── webhooks/
│   ├── globals.css
│   └── favicon.ico
├── components/
│   ├── ui/                    # Shadcn UI components
│   ├── auth/                  # Authentication components
│   ├── hotel/                 # Hotel-related components
│   │   ├── hotel-card.tsx
│   │   ├── hotel-search.tsx
│   │   ├── hotel-filters.tsx
│   │   ├── room-card.tsx
│   │   └── amenity-list.tsx
│   ├── booking/               # Booking components
│   │   ├── booking-form.tsx
│   │   ├── payment-form.tsx
│   │   └── booking-summary.tsx
│   ├── review/                # Review components
│   │   ├── review-card.tsx
│   │   ├── review-form.tsx
│   │   └── rating-display.tsx
│   ├── layout/                # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── sidebar.tsx
│   └── shared/                # Shared components
│       ├── map.tsx
│       ├── date-picker.tsx
│       └── image-gallery.tsx
├── lib/
│   ├── supabase/              # Supabase clients
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Middleware client
│   ├── types/                 # TypeScript types
│   │   ├── database.types.ts  # Generated from Supabase
│   │   └── index.ts           # Custom types
│   ├── services/              # Business logic
│   │   ├── hotel.service.ts
│   │   ├── booking.service.ts
│   │   ├── auth.service.ts
│   │   ├── review.service.ts
│   │   └── payment.service.ts
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-hotels.ts
│   │   ├── use-bookings.ts
│   │   ├── use-auth.ts
│   │   └── use-supabase-query.ts
│   ├── actions/               # Server actions
│   │   ├── auth.ts
│   │   ├── hotel.ts
│   │   └── booking.ts
│   ├── validators/            # Zod schemas
│   │   ├── auth.schema.ts
│   │   ├── hotel.schema.ts
│   │   └── booking.schema.ts
│   ├── utils/                 # Utility functions
│   │   ├── date.ts
│   │   ├── price.ts
│   │   └── format.ts
│   └── constants/             # Constants
│       ├── routes.ts
│       └── config.ts
├── docs/                      # Documentation
│   ├── database-schema.sql
│   ├── DATABASE_DOCUMENTATION.md
│   ├── FEATURE_LIST.md
│   └── IMPLEMENTATION_GUIDE.md
├── messages/                  # i18n messages
│   ├── en.json
│   └── hi.json
├── public/                    # Static assets
│   ├── images/
│   └── icons/
├── .env.local                 # Environment variables
├── middleware.ts              # Next.js middleware
├── next.config.ts
└── package.json
```

---

## Implementation Phases

### Phase 1: MVP (Weeks 1-8) - Current Focus

#### Week 1-2: Foundation & Authentication
- [x] Database schema created
- [x] Supabase setup
- [ ] TypeScript types generated
- [ ] Authentication UI (Login, Register)
- [ ] User profile management
- [ ] Protected routes

#### Week 3-4: Hotel Search & Display
- [ ] Home page with search
- [ ] Hotel search functionality
- [ ] Search filters (location, dates, guests, price, amenities)
- [ ] Hotel listing page
- [ ] Hotel card component
- [ ] Pagination

#### Week 5-6: Hotel Details & Booking
- [ ] Hotel details page
- [ ] Image gallery
- [ ] Room type display
- [ ] Availability check
- [ ] Booking form
- [ ] Guest details form
- [ ] Price calculation

#### Week 7-8: Payment & Confirmation
- [ ] Payment integration (Razorpay/Stripe)
- [ ] Booking confirmation
- [ ] Email notifications
- [ ] Booking history
- [ ] Booking details view
- [ ] Cancellation flow

### Phase 2: Core Features (Weeks 9-16)
- Reviews and ratings
- Wishlist
- Advanced filters
- Dynamic pricing
- Hotel manager dashboard
- Property management

### Phase 3: Enhanced Features (Weeks 17-24)
- Multi-language support
- Social login
- Advanced analytics
- Mobile app (React Native)

---

## Development Workflow

### 1. Feature Development

For each feature:

1. **Create Types** (`lib/types/`)
2. **Create Service** (`lib/services/`)
3. **Create Server Actions** (`lib/actions/`)
4. **Create Hooks** (`lib/hooks/`)
5. **Create Components** (`components/`)
6. **Create Pages** (`app/[locale]/`)
7. **Add Translations** (`messages/`)
8. **Test**

### 2. Database Changes

```sql
-- Always use migrations for database changes
-- Create new migration file: migrations/YYYYMMDD_description.sql
ALTER TABLE hotels ADD COLUMN new_field VARCHAR(100);
```

### 3. Testing

```bash
# Run TypeScript checks
pnpm tsc --noEmit

# Run linting
pnpm lint

# Build for production
pnpm build
```

---

## Key Files to Create Next

### 1. Database Types

File: `lib/types/database.types.ts`

Generate from Supabase (see Step 2 above)

### 2. Custom Types

File: `lib/types/index.ts`

```typescript
export type UserRole = 'guest' | 'hotel_manager' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

// Search filters
export interface HotelSearchParams {
  location?: string;
  checkIn?: Date;
  checkOut?: Date;
  adults: number;
  children: number;
  rooms: number;
  minPrice?: number;
  maxPrice?: number;
  starRating?: number[];
  amenities?: string[];
}

// And more...
```

### 3. Hotel Service

File: `lib/services/hotel.service.ts`

```typescript
export class HotelService {
  async searchHotels(params: HotelSearchParams) { }
  async getHotelById(id: string) { }
  async getHotelBySlug(slug: string) { }
  async getRoomTypes(hotelId: string) { }
  async checkAvailability(roomTypeId: string, dates: DateRange) { }
}
```

### 4. Booking Service

File: `lib/services/booking.service.ts`

```typescript
export class BookingService {
  async createBooking(data: CreateBookingDto) { }
  async getBookingById(id: string) { }
  async getUserBookings(userId: string) { }
  async cancelBooking(bookingId: string) { }
  async processPayment(bookingId: string, paymentData: PaymentDto) { }
}
```

---

## Environment Variables

Ensure `.env.local` has:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bpueyipztjdghxyjcqgd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Payment Gateway (Razorpay)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret

# Email Service
RESEND_API_KEY=your-resend-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Schema Quick Reference

### Core Tables
- `users` - User accounts
- `hotels` - Hotel properties
- `room_types` - Room categories
- `rooms` - Physical rooms
- `bookings` - Reservations
- `payments` - Transactions
- `reviews` - Customer reviews

### Relationships
- Hotel → Room Types → Rooms
- User → Bookings → Payments
- Booking → Review

---

## Common Queries

### Search Hotels

```typescript
const { data: hotels } = await supabase
  .from('hotels')
  .select(`
    *,
    hotel_images(image_url, is_primary),
    room_types(id, name, base_price)
  `)
  .eq('city', 'Bangalore')
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

### Get Hotel Details

```typescript
const { data: hotel } = await supabase
  .from('hotels')
  .select(`
    *,
    hotel_images(*),
    room_types(*, room_type_images(*), room_type_amenities(amenities(*))),
    reviews(*, users(first_name, last_name)),
    hotel_amenities(amenities(*))
  `)
  .eq('slug', slug)
  .single();
```

### Create Booking

```typescript
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    user_id: userId,
    hotel_id: hotelId,
    room_type_id: roomTypeId,
    check_in_date: checkIn,
    check_out_date: checkOut,
    total_amount: totalAmount,
    // ... other fields
  })
  .select()
  .single();
```

---

## Troubleshooting

### Common Issues

**Issue:** TypeScript errors with Supabase types
**Solution:** Regenerate types from latest schema

**Issue:** RLS policies blocking queries
**Solution:** Check Row Level Security policies in Supabase dashboard

**Issue:** Authentication not working
**Solution:** Verify Supabase credentials and auth configuration

---

## Next Steps

1. ✅ Create database schema in Supabase
2. ⏳ Generate TypeScript types
3. ⏳ Create base services
4. ⏳ Build authentication flows
5. ⏳ Create hotel search page
6. ⏳ Build hotel details page
7. ⏳ Implement booking flow

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Shadcn UI](https://ui.shadcn.com/)
- [Project README](../README.md)
- [Database Documentation](./DATABASE_DOCUMENTATION.md)
- [Feature List](./FEATURE_LIST.md)

---

**Happy Coding! 🚀**
