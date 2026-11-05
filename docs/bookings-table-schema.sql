-- =====================================================
-- Bookings Table for Hotel Reservation System
-- =====================================================
-- This table stores all hotel room bookings
-- Run this in Supabase SQL Editor
-- =====================================================
-- NOTE: This replaces the bookings table from hotel-database-schema.sql
-- to work with Supabase Auth instead of a custom users table
-- =====================================================

-- First, drop the old bookings table if it exists (and related tables)
DROP TABLE IF EXISTS public.booking_promotions CASCADE;
DROP TABLE IF EXISTS public.booking_guests CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;

-- First, create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create bookings table (compatible with Supabase Auth)
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Information (uses Supabase Auth, can be NULL for guest bookings)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_first_name VARCHAR(100) NOT NULL,
    guest_last_name VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,

    -- Hotel and Room Information
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,

    -- Booking Details
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_nights INTEGER,
    num_adults INTEGER NOT NULL CHECK (num_adults >= 1),
    num_children INTEGER DEFAULT 0 CHECK (num_children >= 0),
    num_rooms INTEGER DEFAULT 1 CHECK (num_rooms >= 1),

    -- Pricing
    price_per_night DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    service_fee DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,

    -- Payment Information
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    payment_transaction_id VARCHAR(255),

    -- Booking Status
    booking_status VARCHAR(20) DEFAULT 'confirmed' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,

    -- Special Requests
    special_requests TEXT,

    -- Cancellation
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT valid_total CHECK (total_amount >= 0)
);

-- Create a trigger function to auto-calculate num_nights and subtotal
CREATE OR REPLACE FUNCTION public.calculate_booking_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate num_nights
    NEW.num_nights := NEW.check_out_date - NEW.check_in_date;

    -- Calculate subtotal
    NEW.subtotal := NEW.price_per_night * NEW.num_nights * NEW.num_rooms;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate amounts before insert/update
DROP TRIGGER IF EXISTS calculate_booking_amounts_trigger ON public.bookings;
CREATE TRIGGER calculate_booking_amounts_trigger
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_booking_amounts();

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;

-- Create policies for bookings table
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
    ON public.bookings
    FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can insert their own bookings (allow NULL user_id for guest bookings)
CREATE POLICY "Users can create own bookings"
    ON public.bookings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own bookings (for cancellations)
CREATE POLICY "Users can update own bookings"
    ON public.bookings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_hotel_id_idx ON public.bookings(hotel_id);
CREATE INDEX IF NOT EXISTS bookings_room_type_id_idx ON public.bookings(room_type_id);
CREATE INDEX IF NOT EXISTS bookings_check_in_date_idx ON public.bookings(check_in_date);
CREATE INDEX IF NOT EXISTS bookings_check_out_date_idx ON public.bookings(check_out_date);
CREATE INDEX IF NOT EXISTS bookings_booking_status_idx ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS bookings_booking_reference_idx ON public.bookings(booking_reference);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON public.bookings(created_at DESC);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate unique booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    reference TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate format: BK-YYYYMMDD-XXXX (e.g., BK-20250109-A7B2)
        reference := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                     UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

        -- Check if reference already exists
        SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_reference = reference) INTO exists;

        -- Exit loop if reference is unique
        EXIT WHEN NOT exists;
    END LOOP;

    RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;

-- =====================================================
-- Optional: Recreate related tables from original schema
-- =====================================================
-- If you want to add payments tracking, uncomment below:

/*
-- Payment methods table (if not already exists)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
    payment_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    payment_gateway VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'partially_refunded')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- Grant permissions
GRANT ALL ON public.payments TO authenticated;
GRANT SELECT ON public.payments TO anon;
*/

-- =====================================================
-- END OF SCHEMA
-- =====================================================
