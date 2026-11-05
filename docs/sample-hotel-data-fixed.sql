-- =====================================================
-- Sample Data for Hotel Booking System (FIXED)
-- =====================================================
-- Run this in Supabase SQL Editor after deploying the schema
-- =====================================================

-- Insert sample amenity categories
INSERT INTO amenity_categories (name, icon, display_order) VALUES
    ('Room Features', 'bed', 1),
    ('Bathroom', 'bath', 2),
    ('Technology', 'wifi', 3),
    ('Food & Drink', 'utensils', 4),
    ('Services', 'concierge', 5),
    ('Wellness', 'spa', 6)
ON CONFLICT DO NOTHING;

-- Insert sample amenities
INSERT INTO amenities (category_id, name, icon, display_order)
SELECT
    ac.id,
    amenity.name,
    amenity.icon,
    amenity.display_order
FROM amenity_categories ac
CROSS JOIN LATERAL (
    VALUES
        ('Room Features', 'Air Conditioning', 'snowflake', 1),
        ('Room Features', 'Balcony', 'door-open', 2),
        ('Room Features', 'City View', 'building', 3),
        ('Room Features', 'Sea View', 'waves', 4),
        ('Bathroom', 'Private Bathroom', 'bath', 1),
        ('Bathroom', 'Hot Water', 'droplet', 2),
        ('Bathroom', 'Toiletries', 'spray-can', 3),
        ('Bathroom', 'Bathtub', 'bath', 4),
        ('Technology', 'Free WiFi', 'wifi', 1),
        ('Technology', 'Flat-screen TV', 'tv', 2),
        ('Technology', 'Cable Channels', 'tv-2', 3),
        ('Food & Drink', 'Restaurant', 'utensils', 1),
        ('Food & Drink', 'Room Service', 'concierge-bell', 2),
        ('Food & Drink', 'Bar', 'wine', 3),
        ('Food & Drink', 'Complimentary Breakfast', 'coffee', 4),
        ('Services', '24-hour Front Desk', 'clock', 1),
        ('Services', 'Concierge', 'concierge', 2),
        ('Services', 'Laundry Service', 'shirt', 3),
        ('Services', 'Airport Shuttle', 'plane', 4),
        ('Wellness', 'Swimming Pool', 'waves', 1),
        ('Wellness', 'Fitness Center', 'dumbbell', 2),
        ('Wellness', 'Spa', 'spa', 3)
) AS amenity(category, name, icon, display_order)
WHERE ac.name = amenity.category
ON CONFLICT DO NOTHING;

-- Insert sample payment methods
INSERT INTO payment_methods (name, code, is_active) VALUES
    ('Visa', 'visa', true),
    ('Mastercard', 'mastercard', true),
    ('American Express', 'amex', true),
    ('Maestro', 'maestro', true),
    ('UPI', 'upi', true),
    ('Debit Card', 'debit_card', true),
    ('Credit Card', 'credit_card', true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample languages
INSERT INTO languages (code, name, is_active) VALUES
    ('en', 'English', true),
    ('hi', 'Hindi', true),
    ('kn', 'Kannada', true),
    ('ta', 'Tamil', true),
    ('te', 'Telugu', true),
    ('mr', 'Marathi', true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample hotels
INSERT INTO hotels (
    name, slug, description, star_rating, property_type, chain_brand,
    address_line_1, city, state, country, postal_code,
    latitude, longitude, location_rating,
    phone, email, website,
    check_in_from_time, check_in_to_time, check_out_time,
    status
) VALUES
(
    'The Royal Palace Hotel',
    'royal-palace-hotel-bangalore',
    'Experience luxury at its finest in the heart of Bangalore. Our 5-star property offers world-class amenities, spacious rooms, and exceptional service. Located near major business districts and shopping areas.',
    5,
    'hotel',
    'Royal Hotels & Resorts',
    'MG Road, Opposite Cubbon Park',
    'Bangalore',
    'Karnataka',
    'India',
    '560001',
    12.9716, 77.5946,
    9.4,
    '+91-80-12345678',
    'info@royalpalace.com',
    'https://royalpalace.com',
    '14:00', '23:00', '11:00',
    'active'
),
(
    'Beach Breeze Resort',
    'beach-breeze-resort-goa',
    'Stunning beachfront resort in North Goa. Wake up to the sound of waves and enjoy breathtaking sunsets. Perfect for families and couples seeking a peaceful getaway.',
    4,
    'resort',
    NULL,
    'Calangute Beach Road',
    'Goa',
    'Goa',
    'India',
    '403516',
    15.5437, 73.7568,
    9.2,
    '+91-832-2345678',
    'info@beachbreeze.com',
    'https://beachbreeze.com',
    '13:00', '22:00', '11:00',
    'active'
),
(
    'Mountain View Retreat',
    'mountain-view-retreat-manali',
    'Cozy mountain retreat nestled in the Himalayas. Enjoy panoramic views, adventure activities, and warm hospitality. Ideal for nature lovers and adventure enthusiasts.',
    3,
    'hotel',
    NULL,
    'Old Manali Road, Near Mall Road',
    'Manali',
    'Himachal Pradesh',
    'India',
    '175131',
    32.2396, 77.1887,
    9.0,
    '+91-1902-234567',
    'info@mountainview.com',
    'https://mountainview.com',
    '12:00', '20:00', '10:00',
    'active'
),
(
    'Urban Comfort Suites',
    'urban-comfort-suites-mumbai',
    'Modern business hotel in the heart of Mumbai. Convenient location near airport and business district. Perfect for business travelers and short stays.',
    4,
    'hotel',
    'Urban Comfort Chain',
    'Andheri East, Near Metro Station',
    'Mumbai',
    'Maharashtra',
    'India',
    '400069',
    19.1136, 72.8697,
    8.8,
    '+91-22-12345678',
    'info@urbancomfort.com',
    'https://urbancomfort.com',
    '14:00', '23:59', '12:00',
    'active'
),
(
    'Heritage Palace',
    'heritage-palace-jaipur',
    'Step back in time at this beautifully restored heritage property. Experience royal Rajasthani hospitality with modern comforts. Rich in history and culture.',
    5,
    'hotel',
    NULL,
    'Amer Road, Near City Palace',
    'Jaipur',
    'Rajasthan',
    'India',
    '302001',
    26.9124, 75.7873,
    9.5,
    '+91-141-2345678',
    'info@heritagepalace.com',
    'https://heritagepalace.com',
    '13:00', '22:00', '11:00',
    'active'
);

-- Get hotel IDs and insert related data
DO $$
DECLARE
    royal_id UUID;
    beach_id UUID;
    mountain_id UUID;
    urban_id UUID;
    heritage_id UUID;
    amenity_wifi UUID;
    amenity_pool UUID;
    amenity_restaurant UUID;
    amenity_gym UUID;
BEGIN
    -- Get hotel IDs
    SELECT id INTO royal_id FROM hotels WHERE slug = 'royal-palace-hotel-bangalore';
    SELECT id INTO beach_id FROM hotels WHERE slug = 'beach-breeze-resort-goa';
    SELECT id INTO mountain_id FROM hotels WHERE slug = 'mountain-view-retreat-manali';
    SELECT id INTO urban_id FROM hotels WHERE slug = 'urban-comfort-suites-mumbai';
    SELECT id INTO heritage_id FROM hotels WHERE slug = 'heritage-palace-jaipur';

    -- Get amenity IDs
    SELECT id INTO amenity_wifi FROM amenities WHERE name = 'Free WiFi' LIMIT 1;
    SELECT id INTO amenity_pool FROM amenities WHERE name = 'Swimming Pool' LIMIT 1;
    SELECT id INTO amenity_restaurant FROM amenities WHERE name = 'Restaurant' LIMIT 1;
    SELECT id INTO amenity_gym FROM amenities WHERE name = 'Fitness Center' LIMIT 1;

    -- Royal Palace Hotel
    INSERT INTO hotel_amenities (hotel_id, amenity_id, is_free) VALUES
        (royal_id, amenity_wifi, true),
        (royal_id, amenity_pool, true),
        (royal_id, amenity_restaurant, true),
        (royal_id, amenity_gym, true);

    INSERT INTO hotel_images (hotel_id, image_url, alt_text, is_primary, display_order) VALUES
        (royal_id, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800', 'Royal Palace Hotel Exterior', true, 1),
        (royal_id, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'Luxury Lobby', false, 2),
        (royal_id, 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', 'Swimming Pool', false, 3);

    INSERT INTO room_types (hotel_id, name, description, size_sqm, max_occupancy, max_adults, max_children, bed_configuration, base_price, num_available_rooms, status) VALUES
        (royal_id, 'Deluxe Room', 'Spacious room with city view', 30, 2, 2, 1, '1 King Bed', 4500, 15, 'available'),
        (royal_id, 'Executive Suite', 'Luxurious suite with separate living area', 50, 3, 2, 1, '1 King Bed + Sofa Bed', 8500, 8, 'available'),
        (royal_id, 'Presidential Suite', 'Ultimate luxury with panoramic views', 80, 4, 2, 2, '2 King Beds', 15000, 3, 'available');

    -- Beach Breeze Resort
    INSERT INTO hotel_amenities (hotel_id, amenity_id, is_free) VALUES
        (beach_id, amenity_wifi, true),
        (beach_id, amenity_pool, true),
        (beach_id, amenity_restaurant, true);

    INSERT INTO hotel_images (hotel_id, image_url, alt_text, is_primary, display_order) VALUES
        (beach_id, 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800', 'Beach Resort View', true, 1),
        (beach_id, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', 'Beach Front', false, 2);

    INSERT INTO room_types (hotel_id, name, description, size_sqm, max_occupancy, max_adults, max_children, bed_configuration, base_price, num_available_rooms, status) VALUES
        (beach_id, 'Sea View Room', 'Room with stunning sea views', 28, 2, 2, 1, '1 Queen Bed', 3500, 20, 'available'),
        (beach_id, 'Beach Villa', 'Private villa steps from the beach', 60, 4, 2, 2, '2 Queen Beds', 7500, 10, 'available');

    -- Mountain View Retreat
    INSERT INTO hotel_amenities (hotel_id, amenity_id, is_free) VALUES
        (mountain_id, amenity_wifi, true),
        (mountain_id, amenity_restaurant, true);

    INSERT INTO hotel_images (hotel_id, image_url, alt_text, is_primary, display_order) VALUES
        (mountain_id, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', 'Mountain Resort', true, 1),
        (mountain_id, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'Cozy Interior', false, 2);

    INSERT INTO room_types (hotel_id, name, description, size_sqm, max_occupancy, max_adults, max_children, bed_configuration, base_price, num_available_rooms, status) VALUES
        (mountain_id, 'Standard Room', 'Comfortable room with mountain view', 25, 2, 2, 0, '1 Double Bed', 2500, 12, 'available'),
        (mountain_id, 'Family Suite', 'Spacious suite for families', 45, 4, 2, 2, '1 King + 2 Single Beds', 4500, 6, 'available');

    -- Urban Comfort Suites
    INSERT INTO hotel_amenities (hotel_id, amenity_id, is_free) VALUES
        (urban_id, amenity_wifi, true),
        (urban_id, amenity_gym, true);

    INSERT INTO hotel_images (hotel_id, image_url, alt_text, is_primary, display_order) VALUES
        (urban_id, 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800', 'Modern Hotel', true, 1);

    INSERT INTO room_types (hotel_id, name, description, size_sqm, max_occupancy, max_adults, max_children, bed_configuration, base_price, num_available_rooms, status) VALUES
        (urban_id, 'Business Room', 'Modern room for business travelers', 22, 2, 2, 0, '1 Queen Bed', 3000, 25, 'available');

    -- Heritage Palace
    INSERT INTO hotel_amenities (hotel_id, amenity_id, is_free) VALUES
        (heritage_id, amenity_wifi, true),
        (heritage_id, amenity_pool, true),
        (heritage_id, amenity_restaurant, true);

    INSERT INTO hotel_images (hotel_id, image_url, alt_text, is_primary, display_order) VALUES
        (heritage_id, 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800', 'Heritage Palace', true, 1),
        (heritage_id, 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', 'Royal Architecture', false, 2);

    INSERT INTO room_types (hotel_id, name, description, size_sqm, max_occupancy, max_adults, max_children, bed_configuration, base_price, num_available_rooms, status) VALUES
        (heritage_id, 'Heritage Room', 'Beautifully decorated heritage room', 32, 2, 2, 1, '1 King Bed', 5500, 10, 'available'),
        (heritage_id, 'Royal Suite', 'Experience royal luxury', 65, 3, 2, 1, '1 King Bed + Sitting Area', 12000, 5, 'available');

    -- Add hotel languages
    INSERT INTO hotel_languages (hotel_id, language_id)
    SELECT royal_id, id FROM languages WHERE code IN ('en', 'hi', 'kn');

    INSERT INTO hotel_languages (hotel_id, language_id)
    SELECT beach_id, id FROM languages WHERE code IN ('en', 'hi');

    -- Add payment methods
    INSERT INTO hotel_payment_methods (hotel_id, payment_method_id, is_accepted)
    SELECT royal_id, id, true FROM payment_methods WHERE code IN ('visa', 'mastercard', 'upi');

END $$;

-- Success message
SELECT 'Sample data inserted successfully! 🎉' as message;
SELECT COUNT(*) as total_hotels FROM hotels WHERE status = 'active';
SELECT COUNT(*) as total_room_types FROM room_types WHERE status = 'available';
SELECT COUNT(*) as total_amenities FROM amenities;


-- =====================================================
-- Add Room Images to Existing Room Types
-- =====================================================
-- Run this in Supabase SQL Editor to add multiple images to room types
-- =====================================================

DO $$
DECLARE
    -- Room type IDs
    deluxe_room_id UUID;
    exec_suite_id UUID;
    pres_suite_id UUID;
    sea_view_id UUID;
    beach_villa_id UUID;
    standard_room_id UUID;
    family_suite_id UUID;
    business_room_id UUID;
    heritage_room_id UUID;
    royal_suite_id UUID;
BEGIN
    -- Get Royal Palace room IDs
    SELECT id INTO deluxe_room_id FROM room_types WHERE name = 'Deluxe Room' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'royal-palace-hotel-bangalore');
    SELECT id INTO exec_suite_id FROM room_types WHERE name = 'Executive Suite' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'royal-palace-hotel-bangalore');
    SELECT id INTO pres_suite_id FROM room_types WHERE name = 'Presidential Suite' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'royal-palace-hotel-bangalore');

    -- Get Beach Breeze room IDs
    SELECT id INTO sea_view_id FROM room_types WHERE name = 'Sea View Room' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'beach-breeze-resort-goa');
    SELECT id INTO beach_villa_id FROM room_types WHERE name = 'Beach Villa' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'beach-breeze-resort-goa');

    -- Get Mountain View room IDs
    SELECT id INTO standard_room_id FROM room_types WHERE name = 'Standard Room' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'mountain-view-retreat-manali');
    SELECT id INTO family_suite_id FROM room_types WHERE name = 'Family Suite' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'mountain-view-retreat-manali');

    -- Get Urban Comfort room IDs
    SELECT id INTO business_room_id FROM room_types WHERE name = 'Business Room' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'urban-comfort-suites-mumbai');

    -- Get Heritage Palace room IDs
    SELECT id INTO heritage_room_id FROM room_types WHERE name = 'Heritage Room' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'heritage-palace-jaipur');
    SELECT id INTO royal_suite_id FROM room_types WHERE name = 'Royal Suite' AND hotel_id IN (SELECT id FROM hotels WHERE slug = 'heritage-palace-jaipur');

    -- Royal Palace - Deluxe Room
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (deluxe_room_id, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800', 'Deluxe Room - King Bed', 1),
        (deluxe_room_id, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', 'Deluxe Room - Bathroom', 2),
        (deluxe_room_id, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', 'Deluxe Room - City View', 3),
        (deluxe_room_id, 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800', 'Deluxe Room - Seating Area', 4);

    -- Royal Palace - Executive Suite
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (exec_suite_id, 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', 'Executive Suite - Living Room', 1),
        (exec_suite_id, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'Executive Suite - Bedroom', 2),
        (exec_suite_id, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', 'Executive Suite - Premium Bathroom', 3),
        (exec_suite_id, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800', 'Executive Suite - Work Desk', 4);

    -- Royal Palace - Presidential Suite
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (pres_suite_id, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', 'Presidential Suite - Master Bedroom', 1),
        (pres_suite_id, 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800', 'Presidential Suite - Living Area', 2),
        (pres_suite_id, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', 'Presidential Suite - Luxury Bathroom', 3),
        (pres_suite_id, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 'Presidential Suite - Dining Area', 4),
        (pres_suite_id, 'https://images.unsplash.com/photo-1559599746-37d7e3213c21?w=800', 'Presidential Suite - Balcony View', 5);

    -- Beach Breeze - Sea View Room
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (sea_view_id, 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', 'Sea View Room - Ocean View', 1),
        (sea_view_id, 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800', 'Sea View Room - Queen Bed', 2),
        (sea_view_id, 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800', 'Sea View Room - Balcony', 3);

    -- Beach Breeze - Beach Villa
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (beach_villa_id, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800', 'Beach Villa - Exterior', 1),
        (beach_villa_id, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800', 'Beach Villa - Master Bedroom', 2),
        (beach_villa_id, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', 'Beach Villa - Living Area', 3),
        (beach_villa_id, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', 'Beach Villa - Bathroom', 4),
        (beach_villa_id, 'https://images.unsplash.com/photo-1559599746-37d7e3213c21?w=800', 'Beach Villa - Private Beach Access', 5);

    -- Mountain View - Standard Room
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (standard_room_id, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'Standard Room - Cozy Interior', 1),
        (standard_room_id, 'https://images.unsplash.com/photo-1578898886596-d3f45e86d74f?w=800', 'Standard Room - Mountain View', 2),
        (standard_room_id, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', 'Standard Room - Bathroom', 3);

    -- Mountain View - Family Suite
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (family_suite_id, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', 'Family Suite - Spacious Layout', 1),
        (family_suite_id, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800', 'Family Suite - Master Bedroom', 2),
        (family_suite_id, 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800', 'Family Suite - Kids Area', 3),
        (family_suite_id, 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800', 'Family Suite - Living Room', 4);

    -- Urban Comfort - Business Room
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (business_room_id, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800', 'Business Room - Work Desk', 1),
        (business_room_id, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'Business Room - Modern Interior', 2),
        (business_room_id, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', 'Business Room - Premium Bathroom', 3);

    -- Heritage Palace - Heritage Room
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (heritage_room_id, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', 'Heritage Room - Traditional Decor', 1),
        (heritage_room_id, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', 'Heritage Room - Royal Bed', 2),
        (heritage_room_id, 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800', 'Heritage Room - Sitting Area', 3),
        (heritage_room_id, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', 'Heritage Room - Luxury Bathroom', 4);

    -- Heritage Palace - Royal Suite
    INSERT INTO room_type_images (room_type_id, image_url, alt_text, display_order) VALUES
        (royal_suite_id, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', 'Royal Suite - Grand Bedroom', 1),
        (royal_suite_id, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800', 'Royal Suite - Opulent Living Room', 2),
        (royal_suite_id, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', 'Royal Suite - Dining Area', 3),
        (royal_suite_id, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', 'Royal Suite - Marble Bathroom', 4),
        (royal_suite_id, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 'Royal Suite - Private Terrace', 5);

END $$;

-- Verify the images were added
SELECT
    h.name as hotel_name,
    rt.name as room_type,
    COUNT(ri.id) as image_count
FROM hotels h
JOIN room_types rt ON rt.hotel_id = h.id
LEFT JOIN room_type_images ri ON ri.room_type_id = rt.id
WHERE h.status = 'active'
GROUP BY h.name, rt.name
ORDER BY h.name, rt.name;

SELECT 'Room images added successfully! 🎉' as message;