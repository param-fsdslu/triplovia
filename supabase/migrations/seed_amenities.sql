-- =====================================================
-- Seed Amenity Categories & Amenities
-- Run this in Supabase SQL Editor
-- =====================================================

-- Insert amenity categories (let DB generate UUIDs)
INSERT INTO amenity_categories (name, icon, display_order) VALUES
  ('General',           'building',         1),
  ('Room Features',     'bed',              2),
  ('Bathroom',          'bath',             3),
  ('Kitchen & Dining',  'utensils',         4),
  ('Outdoor & Views',   'mountain',         5),
  ('Services',          'concierge-bell',   6),
  ('Safety & Security', 'shield',           7),
  ('Recreation',        'dumbbell',         8),
  ('Transport',         'car',              9),
  ('Family',            'baby',            10),
  ('Business',          'briefcase',       11),
  ('Water Activities',  'anchor',          12);

-- =====================================================
-- General Amenities
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Free WiFi',              'wifi',           (SELECT id FROM amenity_categories WHERE name = 'General'), 1),
  ('Air Conditioning',       'snowflake',      (SELECT id FROM amenity_categories WHERE name = 'General'), 2),
  ('Heating',                'thermometer',    (SELECT id FROM amenity_categories WHERE name = 'General'), 3),
  ('Elevator',               'arrow-up-down',  (SELECT id FROM amenity_categories WHERE name = 'General'), 4),
  ('24-Hour Front Desk',     'clock',          (SELECT id FROM amenity_categories WHERE name = 'General'), 5),
  ('Non-Smoking Rooms',      'cigarette-off',  (SELECT id FROM amenity_categories WHERE name = 'General'), 6),
  ('Luggage Storage',        'luggage',        (SELECT id FROM amenity_categories WHERE name = 'General'), 7),
  ('Daily Housekeeping',     'sparkles',       (SELECT id FROM amenity_categories WHERE name = 'General'), 8),
  ('Power Backup',           'zap',            (SELECT id FROM amenity_categories WHERE name = 'General'), 9),
  ('Wheelchair Accessible',  'accessibility',  (SELECT id FROM amenity_categories WHERE name = 'General'), 10);

-- =====================================================
-- Room Features
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Flat Screen TV',         'tv',           (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 1),
  ('Mini Bar',               'wine',         (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 2),
  ('Tea/Coffee Maker',       'coffee',       (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 3),
  ('Iron & Ironing Board',   'shirt',        (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 4),
  ('Safe/Locker',            'lock',         (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 5),
  ('Wardrobe',               'shirt',        (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 6),
  ('Desk & Chair',           'laptop',       (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 7),
  ('Balcony',                'door-open',    (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 8),
  ('Sofa',                   'sofa',         (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 9),
  ('Blackout Curtains',      'moon',         (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 10),
  ('Mosquito Net',           'shield',       (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 11),
  ('Fan',                    'fan',          (SELECT id FROM amenity_categories WHERE name = 'Room Features'), 12);

-- =====================================================
-- Bathroom
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Attached Bathroom',      'bath',         (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 1),
  ('Hot Water',              'droplets',     (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 2),
  ('Rain Shower',            'cloud-rain',   (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 3),
  ('Bathtub',                'bath',         (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 4),
  ('Hair Dryer',             'wind',         (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 5),
  ('Toiletries',             'pipette',      (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 6),
  ('Towels',                 'shirt',        (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 7),
  ('Western Toilet',         'check',        (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 8),
  ('Geyser',                 'flame',        (SELECT id FROM amenity_categories WHERE name = 'Bathroom'), 9);

-- =====================================================
-- Kitchen & Dining
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Restaurant',             'utensils',         (SELECT id FROM amenity_categories WHERE name = 'Kitchen & Dining'), 1),
  ('Room Service',           'bell',             (SELECT id FROM amenity_categories WHERE name = 'Kitchen & Dining'), 2),
  ('Breakfast Included',     'egg',              (SELECT id FROM amenity_categories WHERE name = 'Kitchen & Dining'), 3),
  ('Kitchen/Kitchenette',    'chef-hat',         (SELECT id FROM amenity_categories WHERE name = 'Kitchen & Dining'), 4),
  ('Refrigerator',           'refrigerator',     (SELECT id FROM amenity_categories WHERE name = 'Kitchen & Dining'), 5),
  ('Dining Area',            'utensils-crossed', (SELECT id FROM amenity_categories WHERE name = 'Kitchen & Dining'), 6),
  ('Barbeque Facility',      'flame',            (SELECT id FROM amenity_categories WHERE name = 'Kitchen & Dining'), 7),
  ('Complimentary Water',    'glass-water',      (SELECT id FROM amenity_categories WHERE name = 'Kitchen & Dining'), 8);

-- =====================================================
-- Outdoor & Views
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Garden',                 'flower',     (SELECT id FROM amenity_categories WHERE name = 'Outdoor & Views'), 1),
  ('Terrace',                'sun',        (SELECT id FROM amenity_categories WHERE name = 'Outdoor & Views'), 2),
  ('Sea View',               'waves',      (SELECT id FROM amenity_categories WHERE name = 'Outdoor & Views'), 3),
  ('Mountain View',          'mountain',   (SELECT id FROM amenity_categories WHERE name = 'Outdoor & Views'), 4),
  ('River View',             'waves',      (SELECT id FROM amenity_categories WHERE name = 'Outdoor & Views'), 5),
  ('Sit-Out Area',           'armchair',   (SELECT id FROM amenity_categories WHERE name = 'Outdoor & Views'), 6),
  ('Campfire/Bonfire',       'flame',      (SELECT id FROM amenity_categories WHERE name = 'Outdoor & Views'), 7),
  ('Private Beach Access',   'umbrella',   (SELECT id FROM amenity_categories WHERE name = 'Outdoor & Views'), 8);

-- =====================================================
-- Services
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Free Parking',           'car',              (SELECT id FROM amenity_categories WHERE name = 'Services'), 1),
  ('Paid Parking',           'parking-circle',   (SELECT id FROM amenity_categories WHERE name = 'Services'), 2),
  ('Laundry Service',        'shirt',            (SELECT id FROM amenity_categories WHERE name = 'Services'), 3),
  ('Tour Desk',              'map',              (SELECT id FROM amenity_categories WHERE name = 'Services'), 4),
  ('Doctor on Call',         'stethoscope',      (SELECT id FROM amenity_categories WHERE name = 'Services'), 5),
  ('Concierge',              'concierge-bell',   (SELECT id FROM amenity_categories WHERE name = 'Services'), 6),
  ('Wake-Up Service',        'alarm-clock',      (SELECT id FROM amenity_categories WHERE name = 'Services'), 7),
  ('Currency Exchange',      'indian-rupee',     (SELECT id FROM amenity_categories WHERE name = 'Services'), 8),
  ('Travel Assistance',      'compass',          (SELECT id FROM amenity_categories WHERE name = 'Services'), 9);

-- =====================================================
-- Safety & Security
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('CCTV Surveillance',      'camera',        (SELECT id FROM amenity_categories WHERE name = 'Safety & Security'), 1),
  ('Fire Extinguisher',      'flame-kindling', (SELECT id FROM amenity_categories WHERE name = 'Safety & Security'), 2),
  ('First Aid Kit',          'cross',         (SELECT id FROM amenity_categories WHERE name = 'Safety & Security'), 3),
  ('Security Guard',         'shield-check',  (SELECT id FROM amenity_categories WHERE name = 'Safety & Security'), 4),
  ('Smoke Detector',         'siren',         (SELECT id FROM amenity_categories WHERE name = 'Safety & Security'), 5),
  ('Electronic Key Card',    'key',           (SELECT id FROM amenity_categories WHERE name = 'Safety & Security'), 6);

-- =====================================================
-- Recreation
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Swimming Pool',          'waves',      (SELECT id FROM amenity_categories WHERE name = 'Recreation'), 1),
  ('Gym/Fitness Center',     'dumbbell',   (SELECT id FROM amenity_categories WHERE name = 'Recreation'), 2),
  ('Spa',                    'sparkles',   (SELECT id FROM amenity_categories WHERE name = 'Recreation'), 3),
  ('Indoor Games',           'gamepad-2',  (SELECT id FROM amenity_categories WHERE name = 'Recreation'), 4),
  ('Library',                'book-open',  (SELECT id FROM amenity_categories WHERE name = 'Recreation'), 5),
  ('Yoga/Meditation Area',   'heart',      (SELECT id FROM amenity_categories WHERE name = 'Recreation'), 6),
  ('Cycling',                'bike',       (SELECT id FROM amenity_categories WHERE name = 'Recreation'), 7);

-- =====================================================
-- Transport
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Airport Shuttle',        'plane',  (SELECT id FROM amenity_categories WHERE name = 'Transport'), 1),
  ('Railway Station Pickup', 'train',  (SELECT id FROM amenity_categories WHERE name = 'Transport'), 2),
  ('Car Rental',             'car',    (SELECT id FROM amenity_categories WHERE name = 'Transport'), 3),
  ('Bike Rental',            'bike',   (SELECT id FROM amenity_categories WHERE name = 'Transport'), 4),
  ('Boat Transfer',          'ship',   (SELECT id FROM amenity_categories WHERE name = 'Transport'), 5);

-- =====================================================
-- Family
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Kids Play Area',         'baby',        (SELECT id FROM amenity_categories WHERE name = 'Family'), 1),
  ('Babysitting Service',    'baby',        (SELECT id FROM amenity_categories WHERE name = 'Family'), 2),
  ('Extra Bed Available',    'bed-double',  (SELECT id FROM amenity_categories WHERE name = 'Family'), 3),
  ('Cradle/Crib Available',  'baby',        (SELECT id FROM amenity_categories WHERE name = 'Family'), 4),
  ('Family Rooms',           'users',       (SELECT id FROM amenity_categories WHERE name = 'Family'), 5);

-- =====================================================
-- Business
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Conference Room',        'presentation',  (SELECT id FROM amenity_categories WHERE name = 'Business'), 1),
  ('Business Center',        'briefcase',     (SELECT id FROM amenity_categories WHERE name = 'Business'), 2),
  ('Projector',              'projector',     (SELECT id FROM amenity_categories WHERE name = 'Business'), 3),
  ('Printer/Fax',            'printer',       (SELECT id FROM amenity_categories WHERE name = 'Business'), 4),
  ('Meeting Room',           'users',         (SELECT id FROM amenity_categories WHERE name = 'Business'), 5);

-- =====================================================
-- Water Activities (useful for boats & coastal hotels)
-- =====================================================
INSERT INTO amenities (name, icon, category_id, display_order) VALUES
  ('Snorkeling',             'glasses',       (SELECT id FROM amenity_categories WHERE name = 'Water Activities'), 1),
  ('Fishing',                'fish',          (SELECT id FROM amenity_categories WHERE name = 'Water Activities'), 2),
  ('Kayaking',               'ship',          (SELECT id FROM amenity_categories WHERE name = 'Water Activities'), 3),
  ('Jet Ski',                'waves',         (SELECT id FROM amenity_categories WHERE name = 'Water Activities'), 4),
  ('Scuba Diving',           'glasses',       (SELECT id FROM amenity_categories WHERE name = 'Water Activities'), 5),
  ('Boat Ride',              'sailboat',      (SELECT id FROM amenity_categories WHERE name = 'Water Activities'), 6),
  ('Life Jackets',           'shield-check',  (SELECT id FROM amenity_categories WHERE name = 'Water Activities'), 7),
  ('Swimming Allowed',       'waves',         (SELECT id FROM amenity_categories WHERE name = 'Water Activities'), 8);
