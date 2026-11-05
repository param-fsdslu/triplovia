-- =====================================================
-- Fix Hotels Public Access - Remove auth.users dependency
-- =====================================================
-- Description: Update RLS policies to allow public access without
-- attempting to join auth.users table which causes permission errors
-- Created: 2025-01-15
-- =====================================================

-- Drop the existing public view policy that might cause issues
DROP POLICY IF EXISTS "hotels_public_view" ON hotels;

-- Create a simpler public view policy that doesn't involve joins
CREATE POLICY "hotels_public_view" ON hotels
    FOR SELECT
    TO anon, authenticated
    USING (status = 'active');

-- Also update the reviews policy to prevent similar issues
-- Drop existing review policies if they exist
DROP POLICY IF EXISTS "reviews_public_view" ON reviews;

-- Create new review policy for public access
CREATE POLICY "reviews_public_view" ON reviews
    FOR SELECT
    TO anon, authenticated
    USING (status = 'approved');

-- Update room_types public policy
DROP POLICY IF EXISTS "room_types_public_view" ON room_types;

CREATE POLICY "room_types_public_view" ON room_types
    FOR SELECT
    TO anon, authenticated
    USING (
        status = 'available'
        AND EXISTS (
            SELECT 1 FROM hotels
            WHERE hotels.id = room_types.hotel_id
            AND hotels.status = 'active'
        )
    );

-- Grant SELECT permissions to anon users for public tables
GRANT SELECT ON hotels TO anon;
GRANT SELECT ON hotel_images TO anon;
GRANT SELECT ON room_types TO anon;
GRANT SELECT ON room_type_images TO anon;
GRANT SELECT ON reviews TO anon;
GRANT SELECT ON hotel_amenities TO anon;
GRANT SELECT ON amenities TO anon;
GRANT SELECT ON amenity_categories TO anon;
GRANT SELECT ON hotel_nearby_attractions TO anon;
GRANT SELECT ON nearby_attractions TO anon;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
