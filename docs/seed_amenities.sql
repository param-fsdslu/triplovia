-- =====================================================
-- Seed Amenities Only (No Sample Hotels)
-- =====================================================
-- Run this in Supabase SQL Editor to populate the
-- amenities table with a master list of amenities
-- =====================================================

-- Insert amenity categories
INSERT INTO amenity_categories (name, icon, display_order) VALUES
    ('Room Features', 'bed', 1),
    ('Bathroom', 'bath', 2),
    ('Technology', 'wifi', 3),
    ('Food & Drink', 'utensils', 4),
    ('Services', 'concierge', 5),
    ('Wellness', 'spa', 6)
ON CONFLICT DO NOTHING;

-- Insert amenities
INSERT INTO amenities (category_id, name, icon, display_order)
SELECT
    ac.id,
    amenity.name,
    amenity.icon,
    amenity.display_order
FROM amenity_categories ac
CROSS JOIN LATERAL (
    VALUES
        -- Room Features
        ('Room Features', 'Air Conditioning', 'snowflake', 1),
        ('Room Features', 'Balcony', 'door-open', 2),
        ('Room Features', 'City View', 'building', 3),
        ('Room Features', 'Sea View', 'waves', 4),
        ('Room Features', 'Mountain View', 'mountain', 5),
        ('Room Features', 'Garden View', 'trees', 6),
        ('Room Features', 'Soundproofing', 'volume-x', 7),
        ('Room Features', 'Non-Smoking Rooms', 'ban', 8),
        ('Room Features', 'Safe Deposit Box', 'lock', 9),
        ('Room Features', 'Minibar', 'glass-water', 10),
        ('Room Features', 'Refrigerator', 'refrigerator', 11),
        ('Room Features', 'Electric Kettle', 'coffee', 12),
        ('Room Features', 'Work Desk', 'desk', 13),
        ('Room Features', 'Seating Area', 'armchair', 14),
        ('Room Features', 'Wardrobe', 'warehouse', 15),

        -- Bathroom
        ('Bathroom', 'Private Bathroom', 'bath', 1),
        ('Bathroom', 'Hot Water', 'droplet', 2),
        ('Bathroom', 'Toiletries', 'spray-can', 3),
        ('Bathroom', 'Bathtub', 'bath', 4),
        ('Bathroom', 'Shower', 'shower-head', 5),
        ('Bathroom', 'Hair Dryer', 'wind', 6),
        ('Bathroom', 'Towels', 'sheet', 7),
        ('Bathroom', 'Slippers', 'footprints', 8),
        ('Bathroom', 'Bathrobes', 'shirt', 9),
        ('Bathroom', 'Bidet', 'droplets', 10),

        -- Technology
        ('Technology', 'Free WiFi', 'wifi', 1),
        ('Technology', 'Flat-screen TV', 'tv', 2),
        ('Technology', 'Cable Channels', 'tv-2', 3),
        ('Technology', 'Satellite Channels', 'satellite', 4),
        ('Technology', 'Telephone', 'phone', 5),
        ('Technology', 'iPod Dock', 'music', 6),
        ('Technology', 'Bluetooth Speaker', 'bluetooth', 7),
        ('Technology', 'Laptop Safe', 'laptop', 8),
        ('Technology', 'USB Charging Ports', 'usb', 9),
        ('Technology', 'Smart TV', 'monitor', 10),

        -- Food & Drink
        ('Food & Drink', 'Restaurant', 'utensils', 1),
        ('Food & Drink', 'Room Service', 'concierge-bell', 2),
        ('Food & Drink', 'Bar', 'wine', 3),
        ('Food & Drink', 'Complimentary Breakfast', 'coffee', 4),
        ('Food & Drink', 'Continental Breakfast', 'croissant', 5),
        ('Food & Drink', 'Buffet Breakfast', 'utensils-crossed', 6),
        ('Food & Drink', 'In-room Dining', 'chef-hat', 7),
        ('Food & Drink', 'Tea/Coffee Maker', 'coffee', 8),
        ('Food & Drink', 'Snack Bar', 'candy', 9),
        ('Food & Drink', 'Packed Lunch', 'lunch-box', 10),

        -- Services
        ('Services', '24-hour Front Desk', 'clock', 1),
        ('Services', 'Concierge', 'concierge', 2),
        ('Services', 'Laundry Service', 'shirt', 3),
        ('Services', 'Airport Shuttle', 'plane', 4),
        ('Services', 'Valet Parking', 'car', 5),
        ('Services', 'Currency Exchange', 'banknote', 6),
        ('Services', 'Luggage Storage', 'luggage', 7),
        ('Services', 'Express Check-in/out', 'zap', 8),
        ('Services', 'Dry Cleaning', 'spray', 9),
        ('Services', 'Ironing Service', 'iron', 10),
        ('Services', 'Shoe Shine', 'footprints', 11),
        ('Services', 'Tour Desk', 'map', 12),
        ('Services', 'Ticket Service', 'ticket', 13),
        ('Services', 'Meeting Rooms', 'presentation', 14),
        ('Services', 'Business Center', 'briefcase', 15),

        -- Wellness
        ('Wellness', 'Swimming Pool', 'waves', 1),
        ('Wellness', 'Fitness Center', 'dumbbell', 2),
        ('Wellness', 'Spa', 'spa', 3),
        ('Wellness', 'Sauna', 'thermometer', 4),
        ('Wellness', 'Hot Tub', 'bath', 5),
        ('Wellness', 'Massage Services', 'hand', 6),
        ('Wellness', 'Yoga Classes', 'stretch', 7),
        ('Wellness', 'Steam Room', 'cloud', 8),
        ('Wellness', 'Beauty Salon', 'sparkles', 9),
        ('Wellness', 'Indoor Pool', 'waves', 10),
        ('Wellness', 'Outdoor Pool', 'sun', 11)
) AS amenity(category, name, icon, display_order)
WHERE ac.name = amenity.category
ON CONFLICT DO NOTHING;

-- Verify the amenities were added
SELECT
    ac.name as category,
    COUNT(a.id) as amenity_count
FROM amenity_categories ac
LEFT JOIN amenities a ON a.category_id = ac.id
GROUP BY ac.name, ac.display_order
ORDER BY ac.display_order;

SELECT 'Amenities seeded successfully! 🎉' as message;
SELECT COUNT(*) as total_amenities FROM amenities;
