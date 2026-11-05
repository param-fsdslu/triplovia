-- =====================================================
-- Fix: Hotel Admin Cannot Manage Hotel-Related Data
-- =====================================================
-- This adds RLS policies for hotel_amenities, hotel_images,
-- room_types, and other hotel-related tables
-- =====================================================

-- =====================================================
-- HOTEL_AMENITIES policies
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE hotel_amenities ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
DROP POLICY IF EXISTS hotel_amenities_super_admin_all ON hotel_amenities;
CREATE POLICY hotel_amenities_super_admin_all ON hotel_amenities
  FOR ALL
  USING (public.is_super_admin());

-- Hotel admin can manage amenities for their hotels
DROP POLICY IF EXISTS hotel_amenities_admin_own ON hotel_amenities;
CREATE POLICY hotel_amenities_admin_own ON hotel_amenities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = hotel_amenities.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = hotel_amenities.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

-- Public can view amenities for active hotels
DROP POLICY IF EXISTS hotel_amenities_public_view ON hotel_amenities;
CREATE POLICY hotel_amenities_public_view ON hotel_amenities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = hotel_amenities.hotel_id
      AND hotels.status = 'active'
    )
  );

-- =====================================================
-- HOTEL_IMAGES policies
-- =====================================================

ALTER TABLE hotel_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hotel_images_super_admin_all ON hotel_images;
CREATE POLICY hotel_images_super_admin_all ON hotel_images
  FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS hotel_images_admin_own ON hotel_images;
CREATE POLICY hotel_images_admin_own ON hotel_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = hotel_images.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = hotel_images.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

DROP POLICY IF EXISTS hotel_images_public_view ON hotel_images;
CREATE POLICY hotel_images_public_view ON hotel_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = hotel_images.hotel_id
      AND hotels.status = 'active'
    )
  );

-- =====================================================
-- ROOM_TYPES policies (already exists, update to add WITH CHECK)
-- =====================================================

DROP POLICY IF EXISTS room_types_admin_own ON room_types;
CREATE POLICY room_types_admin_own ON room_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = room_types.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = room_types.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

-- =====================================================
-- ROOM_TYPE_AMENITIES policies
-- =====================================================

ALTER TABLE room_type_amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_type_amenities_super_admin_all ON room_type_amenities;
CREATE POLICY room_type_amenities_super_admin_all ON room_type_amenities
  FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS room_type_amenities_admin_own ON room_type_amenities;
CREATE POLICY room_type_amenities_admin_own ON room_type_amenities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      JOIN hotels ON hotels.id = room_types.hotel_id
      WHERE room_types.id = room_type_amenities.room_type_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_types
      JOIN hotels ON hotels.id = room_types.hotel_id
      WHERE room_types.id = room_type_amenities.room_type_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

DROP POLICY IF EXISTS room_type_amenities_public_view ON room_type_amenities;
CREATE POLICY room_type_amenities_public_view ON room_type_amenities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      JOIN hotels ON hotels.id = room_types.hotel_id
      WHERE room_types.id = room_type_amenities.room_type_id
      AND hotels.status = 'active'
      AND room_types.status = 'available'
    )
  );

-- =====================================================
-- ROOM_TYPE_IMAGES policies
-- =====================================================

ALTER TABLE room_type_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_type_images_super_admin_all ON room_type_images;
CREATE POLICY room_type_images_super_admin_all ON room_type_images
  FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS room_type_images_admin_own ON room_type_images;
CREATE POLICY room_type_images_admin_own ON room_type_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      JOIN hotels ON hotels.id = room_types.hotel_id
      WHERE room_types.id = room_type_images.room_type_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_types
      JOIN hotels ON hotels.id = room_types.hotel_id
      WHERE room_types.id = room_type_images.room_type_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

DROP POLICY IF EXISTS room_type_images_public_view ON room_type_images;
CREATE POLICY room_type_images_public_view ON room_type_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      JOIN hotels ON hotels.id = room_types.hotel_id
      WHERE room_types.id = room_type_images.room_type_id
      AND hotels.status = 'active'
      AND room_types.status = 'available'
    )
  );

-- =====================================================
-- ROOMS policies (update to add WITH CHECK)
-- =====================================================

DROP POLICY IF EXISTS rooms_admin_own ON rooms;
CREATE POLICY rooms_admin_own ON rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = rooms.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = rooms.hotel_id
      AND hotels.owner_id = auth.uid()
    )
    AND public.is_hotel_admin()
  );

-- =====================================================
-- Verification
-- =====================================================
-- After running this, hotel_admin users should be able to:
-- 1. Add/remove amenities to their hotels
-- 2. Add/remove images to their hotels
-- 3. Create/edit/delete room types for their hotels
-- 4. Add/remove amenities to room types
-- 5. Add/remove images to room types
-- 6. Manage rooms for their hotels
-- =====================================================
