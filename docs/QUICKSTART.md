# 🚀 Quick Start - Hotel Booking System

**Get your hotel booking platform running in 30 minutes!**

---

## ✅ Pre-Setup Checklist

You already have:
- [x] Next.js 15 project
- [x] Supabase account & credentials
- [x] All dependencies installed
- [x] Database schema designed
- [x] TypeScript types created
- [x] Service layer implemented

---

## 🎯 3-Step Setup (30 minutes)

### Step 1: Deploy Database Schema (15 min)

**1.1 Open Supabase Dashboard**
```
https://supabase.com/dashboard/project/bpueyipztjdghxyjcqgd
```

**1.2 Navigate to SQL Editor**
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

**1.3 Copy & Run Schema**
- Open file: `docs/database-schema.sql`
- Copy entire contents
- Paste into SQL Editor
- Click **Run** (or press Ctrl+Enter)

**1.4 Verify Creation**
- Go to "Table Editor"
- You should see 35+ tables:
  - ✅ users
  - ✅ hotels
  - ✅ room_types
  - ✅ rooms
  - ✅ bookings
  - ✅ payments
  - ✅ reviews
  - ... and 28 more

**Expected output:** "Success. No rows returned"

---

### Step 2: Generate Database Types (5 min)

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Generate types
npx supabase gen types typescript \
  --project-id bpueyipztjdghxyjcqgd \
  > lib/types/database.types.ts
```

**Option B: Manual Copy**

1. Go to Supabase Dashboard → Settings → API
2. Scroll to "Project API keys"
3. Find "Generate Types" section
4. Copy the TypeScript types
5. Create file: `lib/types/database.types.ts`
6. Paste the types

**Verify:** File `lib/types/database.types.ts` should exist with types like:
```typescript
export type Database = {
  public: {
    Tables: {
      hotels: { ... }
      bookings: { ... }
      // etc.
    }
  }
}
```

---

### Step 3: Add Sample Data (10 min)

**3.1 Go to SQL Editor Again**

**3.2 Run Sample Data Script**

Copy and run this SQL:

```sql
-- Insert sample languages
INSERT INTO languages (code, name) VALUES
    ('en', 'English'),
    ('hi', 'Hindi'),
    ('kn', 'Kannada')
ON CONFLICT (code) DO NOTHING;

-- Insert sample amenity categories
INSERT INTO amenity_categories (name, display_order) VALUES
    ('Room Features', 1),
    ('Bathroom', 2),
    ('Technology', 3),
    ('Services', 4)
ON CONFLICT DO NOTHING;

-- Insert sample amenities
INSERT INTO amenities (name, icon) VALUES
    ('Free WiFi', 'wifi'),
    ('Air Conditioning', 'snowflake'),
    ('Private Bathroom', 'bath'),
    ('Flat-screen TV', 'tv'),
    ('24-hour Front Desk', 'clock')
ON CONFLICT DO NOTHING;

-- Insert sample payment methods
INSERT INTO payment_methods (name, code) VALUES
    ('Visa', 'visa'),
    ('Mastercard', 'mastercard'),
    ('UPI', 'upi'),
    ('Credit Card', 'credit_card')
ON CONFLICT (code) DO NOTHING;

-- Insert a sample hotel
INSERT INTO hotels (
    name,
    slug,
    city,
    state,
    country,
    address_line_1,
    status,
    star_rating,
    property_type,
    description,
    phone,
    email
) VALUES (
    'Sample Beach Resort',
    'sample-beach-resort-goa',
    'Goa',
    'Goa',
    'India',
    'Calangute Beach Road',
    'active',
    4,
    'resort',
    'Beautiful beach resort with amazing sea views and modern amenities. Perfect for a relaxing vacation.',
    '+91-832-1234567',
    'info@samplebeachresort.com'
) RETURNING id;

-- Note the hotel ID returned, use it below (replace 'HOTEL_ID_HERE')

-- Insert sample room type (replace HOTEL_ID_HERE with actual ID from above)
INSERT INTO room_types (
    hotel_id,
    name,
    description,
    size_sqm,
    max_occupancy,
    max_adults,
    max_children,
    bed_configuration,
    base_price,
    num_available_rooms,
    status
) VALUES (
    'HOTEL_ID_HERE',  -- Replace with actual hotel ID
    'Deluxe Sea View Room',
    'Spacious room with stunning sea views, king-size bed, and modern amenities',
    35,
    3,
    2,
    1,
    '1 king bed',
    5500.00,
    10,
    'available'
);
```

**3.3 Verify Data**
- Go to Table Editor
- Click on "hotels" table
- You should see 1 hotel entry
- Check "room_types" for room entry

---

## ✅ Verify Setup

### Test 1: Check Environment Variables

Ensure `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://bpueyipztjdghxyjcqgd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Test 2: Run Development Server

```bash
pnpm dev
```

Should start without errors at http://localhost:3000

### Test 3: Test Database Connection

Create test file: `app/api/test-db/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('hotels')
      .select('id, name, city')
      .limit(5);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      hotels: data,
      message: '✅ Database connected successfully!'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

Visit: http://localhost:3000/api/test-db

**Expected response:**
```json
{
  "success": true,
  "hotels": [
    {
      "id": "...",
      "name": "Sample Beach Resort",
      "city": "Goa"
    }
  ],
  "message": "✅ Database connected successfully!"
}
```

---

## 🎉 Setup Complete!

If all tests pass, you're ready to start building features!

---

## 🚀 What to Build Next?

### Week 1-2: Authentication ⏰ Estimated: 2-3 days

**Files to create:**

1. **Login Page**
```bash
app/[locale]/(auth)/login/page.tsx
components/auth/login-form.tsx
```

2. **Register Page**
```bash
app/[locale]/(auth)/register/page.tsx
components/auth/register-form.tsx
```

3. **Validators**
```bash
lib/validators/auth.schema.ts
```

**Implementation Example:**

```typescript
// lib/validators/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
});
```

```typescript
// components/auth/login-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validators/auth.schema';

export function LoginForm() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: any) {
    // Use existing lib/actions/auth.ts
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Your form fields */}
    </form>
  );
}
```

---

### Week 3-4: Hotel Search ⏰ Estimated: 3-4 days

**Files to create:**

```bash
app/[locale]/(guest)/page.tsx              # Home page
app/[locale]/(guest)/hotels/search/page.tsx # Search results
components/hotel/hotel-search.tsx           # Search form
components/hotel/hotel-card.tsx             # Hotel card
components/hotel/hotel-filters.tsx          # Filters
lib/hooks/use-hotels.ts                     # React Query hooks
```

**Implementation Example:**

```typescript
// lib/hooks/use-hotels.ts
import { useQuery } from '@tanstack/react-query';
import { HotelService } from '@/lib/services/hotel.service';

export function useHotels(params: HotelSearchParams) {
  return useQuery({
    queryKey: ['hotels', params],
    queryFn: () => HotelService.searchHotels(params),
  });
}
```

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| [README_IMPLEMENTATION.md](README_IMPLEMENTATION.md) | Complete overview |
| [SETUP_COMPLETE.md](docs/SETUP_COMPLETE.md) | Detailed next steps |
| [IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md) | Development guide |
| [DATABASE_DOCUMENTATION.md](docs/DATABASE_DOCUMENTATION.md) | Database reference |
| [FEATURE_LIST.md](docs/FEATURE_LIST.md) | All features |

---

## 🆘 Troubleshooting

### Error: "relation 'hotels' does not exist"
**Solution:** Database schema not deployed. Go back to Step 1.

### Error: "Type 'Database' not found"
**Solution:** Database types not generated. Go back to Step 2.

### Error: "Invalid API key"
**Solution:** Check `.env.local` has correct Supabase credentials.

### Error: TypeScript errors
**Solution:** Run `pnpm install` and restart VS Code.

---

## ✅ Final Checklist

- [ ] Database schema deployed (35+ tables)
- [ ] TypeScript types generated
- [ ] Sample data added
- [ ] Development server running
- [ ] Test API endpoint works
- [ ] `.env.local` configured

**All checked?** 🎉 **You're ready to build!**

---

## 🎯 Recommended Build Order

1. ✅ **Week 1-2:** Authentication (Login, Register, Profile)
2. ✅ **Week 3-4:** Hotel Search (Home, Search, Listing)
3. ✅ **Week 5-6:** Hotel Details (Details page, Room selection)
4. ✅ **Week 7-8:** Booking Flow (Booking, Payment, Confirmation)

---

## 💡 Pro Tips

1. **Use TanStack Query** for all data fetching (already set up)
2. **Follow the service layer pattern** (already created)
3. **Use Zod** for all form validation
4. **Leverage Shadcn UI** components
5. **Check TANSTACK_QUERY_GUIDE.md** for best practices

---

**Need help?** Check the docs folder or review the service implementations!

**Happy building! 🚀**
