# Honnavar Travels - Hotel Booking System

**Full-stack hotel booking application** similar to Booking.com

**Stack:** Next.js 15 | TypeScript | Supabase | TanStack Query | Shadcn UI | Tailwind CSS

---

## 🚀 Quick Start

### 1. Deploy Database (15 min)

```bash
# Go to Supabase Dashboard
https://supabase.com/dashboard/project/bpueyipztjdghxyjcqgd

# Navigate to SQL Editor
# Copy contents from: docs/database-schema.sql
# Paste and Run
```

### 2. Generate Types (5 min)

```bash
npx supabase gen types typescript --project-id bpueyipztjdghxyjcqgd > lib/types/database.types.ts
```

### 3. Run Development Server

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
honnavar-travels/
├── docs/                          # 📚 Documentation
│   ├── database-schema.sql        # Complete DB schema (35+ tables)
│   ├── DATABASE_DOCUMENTATION.md  # Full database reference
│   ├── FEATURE_LIST.md           # 100+ features by priority
│   ├── IMPLEMENTATION_GUIDE.md   # Step-by-step guide
│   └── SETUP_COMPLETE.md         # Next steps guide
│
├── lib/
│   ├── types/                     # 💎 TypeScript Types
│   │   └── index.ts              # 40+ interfaces (Hotel, Booking, etc.)
│   │
│   ├── services/                  # 🔧 Business Logic
│   │   ├── hotel.service.ts      # Hotel search, details, availability
│   │   └── booking.service.ts    # Booking CRUD, payments, cancellation
│   │
│   ├── supabase/                  # Already set up ✅
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   │
│   ├── hooks/                     # To be created
│   ├── actions/                   # Server actions (auth.ts exists)
│   └── validators/                # To be created
│
├── components/                    # To be created
│   ├── hotel/
│   ├── booking/
│   ├── auth/
│   └── ui/                        # Shadcn components
│
└── app/[locale]/                  # Routes to be created
    ├── (auth)/                    # Login, Register
    ├── (guest)/                   # Hotel search, details, bookings
    ├── (hotel-manager)/           # Hotel management
    └── (admin)/                   # Admin dashboard
```

---

## 📊 What's Been Created

### ✅ Database Schema
- **35+ tables** with complete hotel booking functionality
- **UUIDs** for all primary keys
- **Indexes** for performance
- **Triggers** for auto-updates
- **RLS-ready** for security

**Key Tables:**
- `users`, `hotels`, `room_types`, `rooms`
- `bookings`, `payments`, `reviews`
- `amenities`, `promotions`, `faqs`
- And 25+ more...

### ✅ TypeScript Types (`lib/types/index.ts`)
- `Hotel`, `HotelWithDetails`, `HotelSearchParams`
- `Booking`, `BookingWithDetails`, `CreateBookingDto`
- `RoomType`, `Payment`, `Review`, `User`
- `ApiResponse`, `PaginatedResponse`
- 40+ total interfaces

### ✅ Service Layer

**HotelService** (`lib/services/hotel.service.ts`)
```typescript
- searchHotels(params)           // Search with filters
- getHotelById(id)               // Get full details
- getHotelBySlug(slug)           // Get by URL slug
- getRoomTypes(hotelId)          // Get available rooms
- checkAvailability(roomTypeId)  // Check availability
- getFeaturedHotels()            // Get featured
- getPopularDestinations()       // Get popular cities
```

**BookingService** (`lib/services/booking.service.ts`)
```typescript
- createBooking(userId, data)    // Create new booking
- getBookingById(id)             // Get booking details
- getUserBookings(userId)        // Get user's bookings
- cancelBooking(id)              // Cancel booking
- updateBookingStatus(id)        // Update status
- assignRoom(bookingId, roomId)  // Check-in
- processCheckout(bookingId)     // Check-out
```

### ✅ Documentation
- **DATABASE_DOCUMENTATION.md** - Complete DB reference with queries
- **FEATURE_LIST.md** - 100+ features organized by phase
- **IMPLEMENTATION_GUIDE.md** - Development workflow
- **SETUP_COMPLETE.md** - Immediate next steps

---

## 🎯 Implementation Phases

### Phase 1: MVP (Weeks 1-8) ⭐ START HERE

| Week | Feature | Status |
|------|---------|--------|
| 1-2 | **Authentication** | ⏳ Next |
| | - Login/Register pages | To Do |
| | - Password reset | To Do |
| | - Protected routes | To Do |
| 3-4 | **Hotel Search** | To Do |
| | - Home page with search | To Do |
| | - Filter & sort | To Do |
| | - Hotel listing | To Do |
| 5-6 | **Hotel Details & Booking** | To Do |
| | - Hotel details page | To Do |
| | - Room selection | To Do |
| | - Booking form | To Do |
| 7-8 | **Payment & Confirmation** | To Do |
| | - Payment integration | To Do |
| | - Booking history | To Do |
| | - Email notifications | To Do |

### Phase 2: Core Features (Weeks 9-16)
- Reviews & ratings system
- Wishlist functionality
- Dynamic pricing
- Hotel manager dashboard

### Phase 3: Enhanced (Weeks 17-24)
- Multi-language support
- Mobile app (React Native)
- Advanced analytics

---

## 🛠️ Next Steps

### Step 1: Deploy Database ⏰ 15 min

1. Open Supabase: https://supabase.com/dashboard/project/bpueyipztjdghxyjcqgd
2. Go to **SQL Editor**
3. Copy `docs/database-schema.sql`
4. Run the script
5. Verify in **Table Editor** (35+ tables)

### Step 2: Generate Types ⏰ 5 min

```bash
npx supabase gen types typescript --project-id bpueyipztjdghxyjcqgd > lib/types/database.types.ts
```

### Step 3: Add Sample Data ⏰ 10 min

```sql
-- Run in Supabase SQL Editor
INSERT INTO hotels (name, slug, city, country, address_line_1, state, status, star_rating, property_type)
VALUES (
  'Sample Hotel Bangalore',
  'sample-hotel-bangalore',
  'Bangalore',
  'India',
  'MG Road',
  'Karnataka',
  'active',
  4,
  'hotel'
);
```

### Step 4: Build Authentication ⏰ 2-3 days

Create these files:
```bash
app/[locale]/(auth)/login/page.tsx
app/[locale]/(auth)/register/page.tsx
components/auth/login-form.tsx
components/auth/register-form.tsx
lib/validators/auth.schema.ts
```

Use existing `lib/actions/auth.ts` and `lib/hooks/use-supabase-query.ts`

---

## 📖 Key Documentation Files

| File | Purpose |
|------|---------|
| [DATABASE_DOCUMENTATION.md](docs/DATABASE_DOCUMENTATION.md) | Complete database reference, common queries |
| [FEATURE_LIST.md](docs/FEATURE_LIST.md) | All 100+ features organized by priority |
| [IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md) | Development workflow & best practices |
| [SETUP_COMPLETE.md](docs/SETUP_COMPLETE.md) | Detailed next steps with code examples |
| [database-schema.sql](docs/database-schema.sql) | Ready-to-deploy SQL schema |

---

## 🔥 Features Overview

### Guest Features (21 sets)
- ✅ User registration & authentication
- ✅ Hotel search with advanced filters
- ✅ Hotel details with photos & reviews
- ✅ Room selection & booking
- ✅ Multiple payment methods
- ✅ Booking management & cancellation
- ✅ Review & rating system
- ✅ Wishlist & favorites
- ✅ Multi-language support

### Hotel Manager Features (9 sets)
- ✅ Property management
- ✅ Room & inventory management
- ✅ Dynamic pricing
- ✅ Booking dashboard
- ✅ Revenue reports
- ✅ Review responses
- ✅ Promotional campaigns

### Admin Features (4 sets)
- ✅ User & hotel verification
- ✅ Content moderation
- ✅ Platform analytics
- ✅ System configuration

---

## 💡 Code Examples

### Search Hotels
```typescript
import { useQuery } from '@tanstack/react-query';
import { HotelService } from '@/lib/services/hotel.service';

export function HotelSearch() {
  const { data, isLoading } = useQuery({
    queryKey: ['hotels', { city: 'Bangalore' }],
    queryFn: () => HotelService.searchHotels({
      city: 'Bangalore',
      adults: 2,
      children: 0,
      rooms: 1,
    }),
  });

  // Render results...
}
```

### Create Booking
```typescript
import { BookingService } from '@/lib/services/booking.service';

const booking = await BookingService.createBooking(userId, {
  hotel_id: hotelId,
  room_type_id: roomTypeId,
  check_in_date: '2025-12-15',
  check_out_date: '2025-12-17',
  num_adults: 2,
  num_children: 0,
  num_rooms: 1,
  guests: [
    { first_name: 'John', last_name: 'Doe', email: 'john@example.com', is_primary: true }
  ],
});
```

---

## 🎨 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Supabase)
- **State:** TanStack Query (React Query)
- **UI:** Shadcn UI + Tailwind CSS
- **Forms:** React Hook Form + Zod
- **i18n:** next-intl
- **Icons:** Lucide React

---

## 📦 Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

---

## 🔗 Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/bpueyipztjdghxyjcqgd
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **TanStack Query:** See `TANSTACK_QUERY_GUIDE.md`
- **Shadcn UI:** https://ui.shadcn.com

---

## 📊 Database Stats

- **Tables:** 35+
- **Indexes:** 15+
- **Triggers:** 10+
- **Views:** 1 (hotel_summary)
- **Sample Data:** Languages, Payment Methods, Amenity Categories

---

## ✅ Checklist

- [ ] Deploy database schema to Supabase
- [ ] Generate TypeScript types
- [ ] Add sample hotel data
- [ ] Build authentication pages
- [ ] Create home page with search
- [ ] Build hotel listing page
- [ ] Create hotel details page
- [ ] Implement booking flow
- [ ] Integrate payment gateway
- [ ] Set up email notifications

---

## 🚀 Ready to Start!

**Everything is prepared. Start with:**

1. Deploy the database schema (15 min)
2. Generate types (5 min)
3. Build authentication (2-3 days)

**Read** `docs/SETUP_COMPLETE.md` for detailed implementation steps.

---

**Happy Coding! 🎉**
