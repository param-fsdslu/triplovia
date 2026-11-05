-- =====================================================
-- Migration: Add Hotel Ownership for Role-Based Access Control
-- =====================================================
-- Description: Add owner_id to hotels table to support hotel_admin role
-- Created: 2025-01-15
-- =====================================================

-- Add owner_id column to hotels table
-- This links a hotel to its owner/manager (references auth.users via profiles)
ALTER TABLE hotels
ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for efficient queries
CREATE INDEX idx_hotels_owner_id ON hotels(owner_id);

-- Add comment for documentation
COMMENT ON COLUMN hotels.owner_id IS 'Reference to the user who owns/manages this hotel (hotel_admin role)';

-- =====================================================
-- Row Level Security (RLS) Policies for Hotel Access
-- =====================================================

-- Enable RLS on hotels table
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all hotels
CREATE POLICY hotels_super_admin_all ON hotels
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

-- Policy: Hotel admins can only view/edit their own hotels
CREATE POLICY hotels_admin_own ON hotels
    FOR ALL
    USING (
        owner_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
        )
    );

-- Policy: Public can view active hotels (for the booking site)
CREATE POLICY hotels_public_view ON hotels
    FOR SELECT
    USING (status = 'active');

-- =====================================================
-- RLS Policies for Related Tables
-- =====================================================

-- Room Types: Hotel admins can only manage room types for their hotels
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_types_super_admin_all ON room_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

CREATE POLICY room_types_admin_own ON room_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM hotels
            WHERE hotels.id = room_types.hotel_id
            AND hotels.owner_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
            )
        )
    );

CREATE POLICY room_types_public_view ON room_types
    FOR SELECT
    USING (
        status = 'available'
        AND EXISTS (
            SELECT 1 FROM hotels
            WHERE hotels.id = room_types.hotel_id
            AND hotels.status = 'active'
        )
    );

-- Rooms: Similar policies for individual rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY rooms_super_admin_all ON rooms
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

CREATE POLICY rooms_admin_own ON rooms
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM hotels
            WHERE hotels.id = rooms.hotel_id
            AND hotels.owner_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
            )
        )
    );

-- Bookings: Both super_admin and hotel_admin should see relevant bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookings_super_admin_all ON bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

CREATE POLICY bookings_admin_own_hotel ON bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hotels
            WHERE hotels.id = bookings.hotel_id
            AND hotels.owner_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
            )
        )
    );

CREATE POLICY bookings_user_own ON bookings
    FOR ALL
    USING (user_id = auth.uid());

-- Payments: Similar to bookings
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_super_admin_all ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

CREATE POLICY payments_admin_own_hotel ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings
            JOIN hotels ON hotels.id = bookings.hotel_id
            WHERE bookings.id = payments.booking_id
            AND hotels.owner_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
            )
        )
    );

CREATE POLICY payments_user_own ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.id = payments.booking_id
            AND bookings.user_id = auth.uid()
        )
    );

-- =====================================================
-- END OF MIGRATION
-- =====================================================
