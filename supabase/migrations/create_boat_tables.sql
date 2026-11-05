-- Boat Booking Feature: Database Schema
-- Parallel structure to hotel booking system

-- ============================================
-- Table 1: boats (parallel to hotels)
-- ============================================
CREATE TABLE IF NOT EXISTS boats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  boat_type TEXT NOT NULL DEFAULT 'motorboat'
    CHECK (boat_type IN ('motorboat', 'sailboat', 'speedboat', 'houseboat', 'kayak', 'ferry')),
  capacity INTEGER NOT NULL DEFAULT 10,
  owner_id UUID REFERENCES auth.users(id),
  address_line_1 TEXT,
  city TEXT NOT NULL DEFAULT 'Honnavar',
  state TEXT NOT NULL DEFAULT 'Karnataka',
  country TEXT NOT NULL DEFAULT 'India',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  departure_point TEXT,
  phone TEXT,
  email TEXT,
  cancellation_policy_text TEXT,
  safety_info_text TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boats_slug ON boats(slug);
CREATE INDEX IF NOT EXISTS idx_boats_status ON boats(status);
CREATE INDEX IF NOT EXISTS idx_boats_city ON boats(city);

-- ============================================
-- Table 2: trip_types (parallel to room_types)
-- ============================================
CREATE TABLE IF NOT EXISTS trip_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  max_passengers INTEGER NOT NULL DEFAULT 10,
  min_passengers INTEGER NOT NULL DEFAULT 1,
  pricing_model TEXT NOT NULL DEFAULT 'per_person'
    CHECK (pricing_model IN ('per_person', 'per_boat')),
  price_per_person DECIMAL(10,2),
  price_per_boat DECIMAL(10,2),
  child_price_per_person DECIMAL(10,2),
  max_trips_per_day INTEGER NOT NULL DEFAULT 3,
  includes_text TEXT,
  what_to_bring_text TEXT,
  free_cancellation_hours INTEGER DEFAULT 24,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'unavailable', 'seasonal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_types_boat_id ON trip_types(boat_id);
CREATE INDEX IF NOT EXISTS idx_trip_types_status ON trip_types(status);

-- ============================================
-- Table 3: trip_time_slots (boat-specific)
-- ============================================
CREATE TABLE IF NOT EXISTS trip_time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_type_id UUID NOT NULL REFERENCES trip_types(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_time_slots_trip_type_id ON trip_time_slots(trip_type_id);

-- ============================================
-- Table 4: boat_images (parallel to hotel_images)
-- ============================================
CREATE TABLE IF NOT EXISTS boat_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  alt_text TEXT DEFAULT '',
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boat_images_boat_id ON boat_images(boat_id);

-- ============================================
-- Table 5: trip_type_images (parallel to room_type_images)
-- ============================================
CREATE TABLE IF NOT EXISTS trip_type_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_type_id UUID NOT NULL REFERENCES trip_types(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  alt_text TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_type_images_trip_type_id ON trip_type_images(trip_type_id);

-- ============================================
-- Table 6: boat_amenities (parallel to hotel_amenities)
-- Reuses existing amenities table
-- ============================================
CREATE TABLE IF NOT EXISTS boat_amenities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES amenities(id),
  is_free BOOLEAN DEFAULT TRUE,
  additional_charge DECIMAL(10,2),
  UNIQUE(boat_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_boat_amenities_boat_id ON boat_amenities(boat_id);

-- ============================================
-- Table 7: boat_bookings (separate from hotel bookings)
-- ============================================
CREATE TABLE IF NOT EXISTS boat_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_reference TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  boat_id UUID NOT NULL REFERENCES boats(id),
  trip_type_id UUID NOT NULL REFERENCES trip_types(id),
  time_slot_id UUID NOT NULL REFERENCES trip_time_slots(id),
  trip_date DATE NOT NULL,
  num_adults INTEGER NOT NULL DEFAULT 1,
  num_children INTEGER NOT NULL DEFAULT 0,
  -- Guest info
  guest_first_name TEXT NOT NULL,
  guest_last_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  -- Pricing
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('per_person', 'per_boat')),
  price_per_person DECIMAL(10,2),
  price_per_boat DECIMAL(10,2),
  child_price_per_person DECIMAL(10,2),
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 12,
  service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  -- Status
  booking_status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  payment_transaction_id TEXT,
  -- Extras
  special_requests TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  booking_source TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boat_bookings_reference ON boat_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_boat_bookings_user_id ON boat_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_boat_bookings_boat_id ON boat_bookings(boat_id);
CREATE INDEX IF NOT EXISTS idx_boat_bookings_trip_date ON boat_bookings(trip_date);
CREATE INDEX IF NOT EXISTS idx_boat_bookings_status ON boat_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_boat_bookings_trip_slot ON boat_bookings(trip_type_id, time_slot_id, trip_date);

-- ============================================
-- Table 8: boat_reviews (parallel to reviews)
-- ============================================
CREATE TABLE IF NOT EXISTS boat_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID NOT NULL REFERENCES boats(id),
  boat_booking_id UUID NOT NULL REFERENCES boat_bookings(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  overall_rating DECIMAL(3,1) NOT NULL CHECK (overall_rating >= 0 AND overall_rating <= 10),
  safety_rating DECIMAL(3,1),
  crew_rating DECIMAL(3,1),
  experience_rating DECIMAL(3,1),
  value_rating DECIMAL(3,1),
  title TEXT,
  comment TEXT,
  trip_date DATE,
  is_verified BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boat_reviews_boat_id ON boat_reviews(boat_id);
CREATE INDEX IF NOT EXISTS idx_boat_reviews_booking_id ON boat_reviews(boat_booking_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_type_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for active boats and related data
CREATE POLICY "Public can read active boats" ON boats FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage boats" ON boats FOR ALL USING (
  auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'hotel_admin')
);

CREATE POLICY "Public can read trip types" ON trip_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage trip types" ON trip_types FOR ALL USING (
  auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'hotel_admin')
);

CREATE POLICY "Public can read trip time slots" ON trip_time_slots FOR SELECT USING (true);
CREATE POLICY "Admins can manage trip time slots" ON trip_time_slots FOR ALL USING (
  auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'hotel_admin')
);

CREATE POLICY "Public can read boat images" ON boat_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage boat images" ON boat_images FOR ALL USING (
  auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'hotel_admin')
);

CREATE POLICY "Public can read trip type images" ON trip_type_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage trip type images" ON trip_type_images FOR ALL USING (
  auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'hotel_admin')
);

CREATE POLICY "Public can read boat amenities" ON boat_amenities FOR SELECT USING (true);
CREATE POLICY "Admins can manage boat amenities" ON boat_amenities FOR ALL USING (
  auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'hotel_admin')
);

CREATE POLICY "Users can read own boat bookings" ON boat_bookings FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can insert boat bookings" ON boat_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage boat bookings" ON boat_bookings FOR ALL USING (
  auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'hotel_admin')
);

CREATE POLICY "Public can read approved boat reviews" ON boat_reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can insert boat reviews" ON boat_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage boat reviews" ON boat_reviews FOR ALL USING (
  auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'hotel_admin')
);
