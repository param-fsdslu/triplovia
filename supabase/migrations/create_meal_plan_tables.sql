-- ============================================
-- Meal Plans feature
-- ============================================

-- 1. meal_plans — per-hotel meal offerings
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  name TEXT NOT NULL,
  description TEXT,
  price_per_person NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. booking_meal_plans — snapshot of selected meal plans per booking
CREATE TABLE IF NOT EXISTS booking_meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id),
  meal_type TEXT NOT NULL,
  name TEXT NOT NULL,
  price_per_person NUMERIC(10,2) NOT NULL,
  num_guests INT NOT NULL,
  num_nights INT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add meal_plan_total to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meal_plan_total NUMERIC(10,2) DEFAULT 0;

-- 4. RLS policies
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_meal_plans ENABLE ROW LEVEL SECURITY;

-- meal_plans: public read for active plans, admin write
CREATE POLICY "Anyone can read active meal plans"
  ON meal_plans FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage meal plans"
  ON meal_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' IN ('super_admin', 'admin')
        OR (
          auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
          AND meal_plans.hotel_id::text = ANY(
            ARRAY(SELECT jsonb_array_elements_text(auth.users.raw_user_meta_data->'hotel_ids'))
          )
        )
      )
    )
  );

-- booking_meal_plans: users can read their own, admins can read all
CREATE POLICY "Users can read own booking meal plans"
  ON booking_meal_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_meal_plans.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all booking meal plans"
  ON booking_meal_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('super_admin', 'admin', 'hotel_admin')
    )
  );

CREATE POLICY "Service role can insert booking meal plans"
  ON booking_meal_plans FOR INSERT
  WITH CHECK (true);

-- 5. Indexes
CREATE INDEX idx_meal_plans_hotel_id ON meal_plans(hotel_id);
CREATE INDEX idx_meal_plans_status ON meal_plans(status);
CREATE INDEX idx_booking_meal_plans_booking_id ON booking_meal_plans(booking_id);
