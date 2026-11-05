-- =====================================================
-- Hotel Booking System - Supabase Database Schema
-- =====================================================
-- Description: Complete database schema for a hotel booking application
-- Similar to Booking.com functionality
-- Database: PostgreSQL (Supabase)
-- Created: 2025-12-06
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table
-- CREATE TABLE users (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     email VARCHAR(255) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     first_name VARCHAR(100) NOT NULL,
--     last_name VARCHAR(100) NOT NULL,
--     phone VARCHAR(20),
--     date_of_birth DATE,
--     nationality VARCHAR(3), -- ISO 3166-1 alpha-3 country code
--     profile_image TEXT,
--     user_type VARCHAR(20) DEFAULT 'guest' CHECK (user_type IN ('guest', 'hotel_manager', 'admin')),
--     email_verified BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Hotels table
CREATE TABLE hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
    property_type VARCHAR(50) DEFAULT 'hotel' CHECK (property_type IN ('hotel', 'apartment', 'resort', 'villa', 'guesthouse', 'hostel', 'motel', 'homestay')),
    chain_brand VARCHAR(100), -- e.g., "Olive by Embassy"
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_rating DECIMAL(3, 1) CHECK (location_rating BETWEEN 0 AND 10), -- e.g., 9.4
    phone VARCHAR(20),
    email VARCHAR(255),
    website TEXT,
    check_in_from_time TIME, -- e.g., '13:00'
    check_in_to_time TIME, -- e.g., '18:00'
    check_out_time TIME, -- e.g., '11:00'
    advance_notice_required BOOLEAN DEFAULT FALSE,
    minimum_age_check_in INTEGER DEFAULT 18,
    cancellation_policy_text TEXT,
    child_policy_text TEXT,
    extra_bed_policy_text TEXT,
    pet_policy_text TEXT,
    smoking_allowed BOOLEAN DEFAULT FALSE,
    parking_available BOOLEAN DEFAULT FALSE,
    parking_type VARCHAR(20) CHECK (parking_type IN ('on-site', 'off-site', 'none')),
    parking_free BOOLEAN DEFAULT FALSE,
    is_genius_discount_available BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotel images
CREATE TABLE hotel_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotel property highlights
CREATE TABLE hotel_property_highlights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    highlight_type VARCHAR(50) CHECK (highlight_type IN ('perfect_for_stay', 'loyal_customers', 'top_location', 'great_value', 'excellent_service')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Languages
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(5) NOT NULL UNIQUE, -- ISO 639-1 code (e.g., 'en', 'hi')
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotel languages (spoken at property)
CREATE TABLE hotel_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, language_id)
);

-- =====================================================
-- AMENITIES & FACILITIES
-- =====================================================

-- Amenity categories
CREATE TABLE amenity_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Amenities
CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES amenity_categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotel amenities (property-level)
CREATE TABLE hotel_amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    is_free BOOLEAN DEFAULT TRUE,
    additional_charge DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, amenity_id)
);

-- =====================================================
-- ROOMS & ROOM TYPES
-- =====================================================

-- Room types
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    size_sqm INTEGER, -- Room size in square meters
    max_occupancy INTEGER NOT NULL,
    max_adults INTEGER NOT NULL,
    max_children INTEGER DEFAULT 0,
    bed_configuration VARCHAR(255), -- e.g., "1 queen bed", "2 single beds"
    base_price DECIMAL(10, 2) NOT NULL,
    num_available_rooms INTEGER DEFAULT 0,
    free_cancellation_until DATE,
    prepayment_required BOOLEAN DEFAULT FALSE,
    credit_card_required BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room type images
CREATE TABLE room_type_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room type amenities (room-level amenities)
CREATE TABLE room_type_amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_type_id, amenity_id)
);

-- Individual rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor INTEGER,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'cleaning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, room_number)
);

-- Room availability tracking
CREATE TABLE room_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, date)
);

-- =====================================================
-- PRICING & POLICIES
-- =====================================================

-- Dynamic pricing rules
CREATE TABLE price_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER,
    day_of_week INTEGER, -- 0-6 for Sun-Sat, NULL for all days
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cancellation policies
CREATE TABLE cancellation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    policy_name VARCHAR(255) NOT NULL,
    free_cancellation_hours INTEGER, -- Hours before check-in
    cancellation_charge_percentage DECIMAL(5, 2),
    no_show_charge_percentage DECIMAL(5, 2),
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Taxes and fees
CREATE TABLE taxes_and_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    tax_name VARCHAR(100) NOT NULL,
    tax_type VARCHAR(20) CHECK (tax_type IN ('percentage', 'fixed')),
    tax_value DECIMAL(10, 2) NOT NULL,
    is_included_in_price BOOLEAN DEFAULT FALSE,
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child policies
CREATE TABLE child_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    children_allowed BOOLEAN DEFAULT TRUE,
    age_charged_as_adult INTEGER, -- Age from which children are charged as adults
    extra_bed_available BOOLEAN DEFAULT FALSE,
    crib_available BOOLEAN DEFAULT FALSE,
    extra_bed_charge DECIMAL(10, 2),
    crib_charge DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BOOKINGS & PAYMENTS
-- =====================================================

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., "BK-2025-001234"
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL, -- Assigned at check-in
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_adults INTEGER NOT NULL,
    num_children INTEGER DEFAULT 0,
    children_ages INTEGER[], -- Array of children ages
    num_rooms INTEGER DEFAULT 1,
    total_nights INTEGER NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    tax_percentage DECIMAL(5, 2),
    service_charge DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
    special_requests TEXT,
    cancellation_deadline TIMESTAMP WITH TIME ZONE,
    prepayment_required BOOLEAN DEFAULT FALSE,
    credit_card_required BOOLEAN DEFAULT TRUE,
    booking_source VARCHAR(20) DEFAULT 'web' CHECK (booking_source IN ('web', 'mobile', 'api', 'phone')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Booking guests (multiple guests per booking)
CREATE TABLE booking_guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'visa', 'mastercard', 'amex'
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotel accepted payment methods
CREATE TABLE hotel_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    is_accepted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, payment_method_id)
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    payment_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    payment_gateway VARCHAR(50), -- e.g., 'stripe', 'razorpay', 'paypal'
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'partially_refunded')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROMOTIONS & OFFERS
-- =====================================================

-- Promotions
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE, -- NULL for global promotions
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_booking_amount DECIMAL(10, 2),
    max_discount DECIMAL(10, 2),
    valid_from DATE,
    valid_to DATE,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking promotions (track which promotion was used)
CREATE TABLE booking_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
    discount_applied DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Special offers
CREATE TABLE special_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    badge_text VARCHAR(100), -- e.g., "Genius discount", "Free cancellation"
    badge_color VARCHAR(20),
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REVIEWS & RATINGS
-- =====================================================

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255),
    reviewer_country VARCHAR(100),
    reviewer_avatar_url TEXT,
    overall_rating DECIMAL(3, 1) CHECK (overall_rating BETWEEN 0 AND 10), -- e.g., 9.1
    staff_rating DECIMAL(3, 1) CHECK (staff_rating BETWEEN 0 AND 10),
    facilities_rating DECIMAL(3, 1) CHECK (facilities_rating BETWEEN 0 AND 10),
    cleanliness_rating DECIMAL(3, 1) CHECK (cleanliness_rating BETWEEN 0 AND 10),
    comfort_rating DECIMAL(3, 1) CHECK (comfort_rating BETWEEN 0 AND 10),
    value_rating DECIMAL(3, 1) CHECK (value_rating BETWEEN 0 AND 10),
    location_rating DECIMAL(3, 1) CHECK (location_rating BETWEEN 0 AND 10),
    free_wifi_rating DECIMAL(3, 1) CHECK (free_wifi_rating BETWEEN 0 AND 10),
    title VARCHAR(255),
    comment TEXT,
    stayed_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id) -- One review per booking
);

-- Review responses (hotel replies to reviews)
CREATE TABLE review_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id) -- One response per review
);

-- =====================================================
-- LOCATION & NEARBY ATTRACTIONS
-- =====================================================

-- Nearby attractions
CREATE TABLE nearby_attractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('restaurant', 'attraction', 'natural_beauty', 'public_transit', 'airport', 'shopping', 'entertainment')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotel nearby attractions (with distances)
CREATE TABLE hotel_nearby_attractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    attraction_id UUID NOT NULL REFERENCES nearby_attractions(id) ON DELETE CASCADE,
    distance_meters INTEGER,
    distance_text VARCHAR(50), -- e.g., "1.4 km", "550 m"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, attraction_id)
);

-- =====================================================
-- FAQs & ADDITIONAL FEATURES
-- =====================================================

-- FAQs
CREATE TABLE faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE, -- NULL for global FAQs
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50) CHECK (category IN ('breakfast', 'parking', 'spa', 'swimming_pool', 'wifi', 'check_in_out', 'payment', 'general')),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wishlists (saved hotels)
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, hotel_id)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('booking_confirmation', 'reminder', 'promotion', 'review_request', 'cancellation')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);

-- Hotels indexes
CREATE INDEX idx_hotels_slug ON hotels(slug);
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_property_type ON hotels(property_type);
CREATE INDEX idx_hotels_location ON hotels(latitude, longitude);

-- Bookings indexes
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_hotel_id ON bookings(hotel_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);

-- Reviews indexes
CREATE INDEX idx_reviews_hotel_id ON reviews(hotel_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Room availability indexes
CREATE INDEX idx_room_availability_room_date ON room_availability(room_id, date);
CREATE INDEX idx_room_availability_status ON room_availability(status);

-- Price rules indexes
CREATE INDEX idx_price_rules_room_type ON price_rules(room_type_id);
CREATE INDEX idx_price_rules_dates ON price_rules(valid_from, valid_to);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_rules_updated_at BEFORE UPDATE ON price_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_policies_updated_at BEFORE UPDATE ON child_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Note: Enable RLS based on your security requirements
-- Example policies are commented below

-- Enable RLS on tables
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Example: Users can only view their own data
-- CREATE POLICY users_select_own ON users
--     FOR SELECT
--     USING (auth.uid() = id);

-- Example: Users can only view their own bookings
-- CREATE POLICY bookings_select_own ON bookings
--     FOR SELECT
--     USING (auth.uid() = user_id);

-- Example: Anyone can view approved reviews
-- CREATE POLICY reviews_select_approved ON reviews
--     FOR SELECT
--     USING (status = 'approved');

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Hotel summary with average ratings
CREATE OR REPLACE VIEW hotel_summary AS
SELECT
    h.id,
    h.name,
    h.slug,
    h.city,
    h.star_rating,
    h.property_type,
    h.location_rating,
    COUNT(DISTINCT r.id) as review_count,
    ROUND(AVG(r.overall_rating), 1) as avg_overall_rating,
    ROUND(AVG(r.staff_rating), 1) as avg_staff_rating,
    ROUND(AVG(r.facilities_rating), 1) as avg_facilities_rating,
    ROUND(AVG(r.cleanliness_rating), 1) as avg_cleanliness_rating,
    ROUND(AVG(r.comfort_rating), 1) as avg_comfort_rating,
    ROUND(AVG(r.value_rating), 1) as avg_value_rating,
    ROUND(AVG(r.location_rating), 1) as avg_location_rating_review,
    ROUND(AVG(r.free_wifi_rating), 1) as avg_wifi_rating,
    MIN(rt.base_price) as starting_price
FROM hotels h
LEFT JOIN reviews r ON h.id = r.hotel_id AND r.status = 'approved'
LEFT JOIN room_types rt ON h.id = rt.hotel_id AND rt.status = 'available'
WHERE h.status = 'active'
GROUP BY h.id, h.name, h.slug, h.city, h.star_rating, h.property_type, h.location_rating;

-- =====================================================
-- SAMPLE DATA INSERT (Optional - for testing)
-- =====================================================

-- Insert sample languages
INSERT INTO languages (code, name) VALUES
    ('en', 'English'),
    ('hi', 'Hindi'),
    ('kn', 'Kannada'),
    ('ta', 'Tamil'),
    ('te', 'Telugu');

-- Insert sample payment methods
INSERT INTO payment_methods (name, code) VALUES
    ('Visa', 'visa'),
    ('Mastercard', 'mastercard'),
    ('American Express', 'amex'),
    ('Maestro', 'maestro'),
    ('RuPay', 'rupay'),
    ('UPI', 'upi'),
    ('Net Banking', 'netbanking');

-- Insert amenity categories
INSERT INTO amenity_categories (name, display_order) VALUES
    ('Bathroom', 1),
    ('Media & Technology', 2),
    ('Food & Drink', 3),
    ('Reception Services', 4),
    ('Cleaning Services', 5),
    ('Safety & Security', 6),
    ('Wellness', 7),
    ('Miscellaneous', 8);

-- Note: You can add more sample data for amenities, hotels, etc.

-- =====================================================
-- END OF SCHEMA
-- =====================================================
