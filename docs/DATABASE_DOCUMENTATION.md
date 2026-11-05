# Hotel Booking System - Database Documentation

**Version:** 1.0.0
**Database:** PostgreSQL (Supabase)
**Created:** 2025-12-06
**Last Updated:** 2025-12-06

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Table Descriptions](#table-descriptions)
5. [Key Relationships](#key-relationships)
6. [Indexes and Performance](#indexes-and-performance)
7. [Security Considerations](#security-considerations)
8. [Setup Instructions](#setup-instructions)
9. [Common Queries](#common-queries)
10. [Migration Guide](#migration-guide)

---

## Overview

This database schema is designed for a comprehensive hotel booking application similar to Booking.com. It supports:

- Multi-property hotel management
- Dynamic room pricing and availability
- User bookings and payments
- Reviews and ratings system
- Promotional offers and discounts
- Multi-language support
- Location-based services
- Detailed amenities and facilities management

### Key Features

- **35+ tables** covering all aspects of hotel booking
- **UUIDs** for all primary keys
- **Timestamps** for audit trails
- **Soft delete** capabilities where needed
- **Row Level Security (RLS)** ready
- **Optimized indexes** for common queries
- **Database triggers** for automatic timestamp updates
- **Materialized views** for performance

---

## Database Architecture

### Core Modules

The database is organized into logical modules:

#### 1. **User Management**
- `users` - User accounts and profiles

#### 2. **Hotel Management**
- `hotels` - Hotel properties
- `hotel_images` - Hotel photos
- `hotel_property_highlights` - Marketing highlights
- `hotel_languages` - Languages spoken at property
- `languages` - Master language list

#### 3. **Amenities & Facilities**
- `amenity_categories` - Amenity groupings
- `amenities` - Individual amenities
- `hotel_amenities` - Property-level amenities
- `room_type_amenities` - Room-level amenities

#### 4. **Rooms & Inventory**
- `room_types` - Room type definitions
- `room_type_images` - Room photos
- `rooms` - Individual room units
- `room_availability` - Daily availability tracking

#### 5. **Pricing & Policies**
- `price_rules` - Dynamic pricing
- `cancellation_policies` - Cancellation terms
- `taxes_and_fees` - Tax structures
- `child_policies` - Children and extra bed policies

#### 6. **Bookings & Payments**
- `bookings` - Reservation records
- `booking_guests` - Guest information
- `payments` - Payment transactions
- `payment_methods` - Payment types
- `hotel_payment_methods` - Accepted payment methods

#### 7. **Promotions**
- `promotions` - Discount codes
- `booking_promotions` - Applied promotions
- `special_offers` - Special deals

#### 8. **Reviews & Ratings**
- `reviews` - Customer reviews with category ratings
- `review_responses` - Hotel responses

#### 9. **Location Services**
- `nearby_attractions` - Points of interest
- `hotel_nearby_attractions` - Distances from hotel

#### 10. **Additional Features**
- `faqs` - Frequently asked questions
- `wishlists` - Saved hotels
- `notifications` - User notifications

---

## Entity Relationship Diagram

### Core Relationships

```
users (1) ─────< (∞) bookings
hotels (1) ─────< (∞) bookings
hotels (1) ─────< (∞) room_types
room_types (1) ─────< (∞) rooms
bookings (1) ─────< (∞) payments
bookings (1) ───── (1) reviews
hotels (1) ─────< (∞) reviews
hotels (∞) ─────< (∞) amenities (through hotel_amenities)
room_types (∞) ─────< (∞) amenities (through room_type_amenities)
```

---

## Table Descriptions

### 1. Users

**Table:** `users`

Stores user account information for guests, hotel managers, and administrators.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email address |
| password_hash | VARCHAR(255) | Hashed password |
| first_name | VARCHAR(100) | User's first name |
| last_name | VARCHAR(100) | User's last name |
| phone | VARCHAR(20) | Contact phone number |
| date_of_birth | DATE | Birth date |
| nationality | VARCHAR(3) | ISO country code |
| profile_image | TEXT | Profile photo URL |
| user_type | VARCHAR(20) | guest, hotel_manager, admin |
| email_verified | BOOLEAN | Email verification status |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:**
- `idx_users_email` on email
- `idx_users_user_type` on user_type

---

### 2. Hotels

**Table:** `hotels`

Main hotel property information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Hotel name |
| slug | VARCHAR(255) | URL-friendly identifier |
| description | TEXT | Hotel description |
| star_rating | INTEGER | 1-5 star rating |
| property_type | VARCHAR(50) | hotel, apartment, resort, etc. |
| chain_brand | VARCHAR(100) | Brand name (e.g., "Olive by Embassy") |
| address_line_1 | VARCHAR(255) | Street address |
| address_line_2 | VARCHAR(255) | Additional address |
| city | VARCHAR(100) | City name |
| state | VARCHAR(100) | State/province |
| country | VARCHAR(100) | Country name |
| postal_code | VARCHAR(20) | Postal code |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| location_rating | DECIMAL(3,1) | Location score (0-10) |
| phone | VARCHAR(20) | Contact phone |
| email | VARCHAR(255) | Contact email |
| website | TEXT | Hotel website |
| check_in_from_time | TIME | Check-in start time |
| check_in_to_time | TIME | Check-in end time |
| check_out_time | TIME | Check-out time |
| advance_notice_required | BOOLEAN | Requires advance notice |
| minimum_age_check_in | INTEGER | Minimum age (default: 18) |
| cancellation_policy_text | TEXT | Cancellation policy |
| child_policy_text | TEXT | Children policy |
| extra_bed_policy_text | TEXT | Extra bed policy |
| pet_policy_text | TEXT | Pet policy |
| smoking_allowed | BOOLEAN | Smoking permitted |
| parking_available | BOOLEAN | Parking available |
| parking_type | VARCHAR(20) | on-site, off-site, none |
| parking_free | BOOLEAN | Free parking |
| is_genius_discount_available | BOOLEAN | Genius program participation |
| status | VARCHAR(20) | active, inactive, pending |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:**
- `idx_hotels_slug` on slug
- `idx_hotels_city` on city
- `idx_hotels_status` on status
- `idx_hotels_property_type` on property_type
- `idx_hotels_location` on (latitude, longitude)

---

### 3. Hotel Images

**Table:** `hotel_images`

Photos and images for hotel properties.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hotel_id | UUID | Foreign key to hotels |
| image_url | TEXT | Image URL |
| alt_text | VARCHAR(255) | Image description |
| is_primary | BOOLEAN | Primary/featured image |
| display_order | INTEGER | Sort order |
| created_at | TIMESTAMP | Upload time |

---

### 4. Room Types

**Table:** `room_types`

Room category definitions (e.g., Standard Double, Deluxe Suite).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hotel_id | UUID | Foreign key to hotels |
| name | VARCHAR(255) | Room type name |
| description | TEXT | Room description |
| size_sqm | INTEGER | Room size in square meters |
| max_occupancy | INTEGER | Maximum guests |
| max_adults | INTEGER | Maximum adults |
| max_children | INTEGER | Maximum children |
| bed_configuration | VARCHAR(255) | Bed setup description |
| base_price | DECIMAL(10,2) | Base nightly rate |
| num_available_rooms | INTEGER | Available room count |
| free_cancellation_until | DATE | Free cancellation deadline |
| prepayment_required | BOOLEAN | Prepayment needed |
| credit_card_required | BOOLEAN | Card required |
| status | VARCHAR(20) | available, unavailable |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

---

### 5. Rooms

**Table:** `rooms`

Individual room units (physical rooms).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hotel_id | UUID | Foreign key to hotels |
| room_type_id | UUID | Foreign key to room_types |
| room_number | VARCHAR(20) | Room identifier |
| floor | INTEGER | Floor number |
| status | VARCHAR(20) | available, occupied, maintenance, cleaning |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Unique Constraint:** (hotel_id, room_number)

---

### 6. Bookings

**Table:** `bookings`

Customer reservation records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| booking_reference | VARCHAR(50) | Unique booking code |
| user_id | UUID | Foreign key to users |
| hotel_id | UUID | Foreign key to hotels |
| room_type_id | UUID | Foreign key to room_types |
| room_id | UUID | Foreign key to rooms (assigned at check-in) |
| check_in_date | DATE | Check-in date |
| check_out_date | DATE | Check-out date |
| num_adults | INTEGER | Number of adults |
| num_children | INTEGER | Number of children |
| children_ages | INTEGER[] | Array of child ages |
| num_rooms | INTEGER | Number of rooms |
| total_nights | INTEGER | Length of stay |
| price_per_night | DECIMAL(10,2) | Nightly rate |
| subtotal | DECIMAL(10,2) | Subtotal before taxes |
| tax_amount | DECIMAL(10,2) | Total taxes |
| tax_percentage | DECIMAL(5,2) | Tax rate |
| service_charge | DECIMAL(10,2) | Service fees |
| discount_amount | DECIMAL(10,2) | Discount applied |
| total_amount | DECIMAL(10,2) | Final total |
| currency | VARCHAR(3) | Currency code (default: INR) |
| status | VARCHAR(20) | pending, confirmed, checked_in, checked_out, cancelled |
| special_requests | TEXT | Guest requests |
| cancellation_deadline | TIMESTAMP | Cancel by date |
| prepayment_required | BOOLEAN | Prepayment needed |
| credit_card_required | BOOLEAN | Card required |
| booking_source | VARCHAR(20) | web, mobile, api, phone |
| created_at | TIMESTAMP | Booking time |
| updated_at | TIMESTAMP | Last update time |
| cancelled_at | TIMESTAMP | Cancellation time |

**Indexes:**
- `idx_bookings_user_id` on user_id
- `idx_bookings_hotel_id` on hotel_id
- `idx_bookings_status` on status
- `idx_bookings_dates` on (check_in_date, check_out_date)
- `idx_bookings_reference` on booking_reference

---

### 7. Reviews

**Table:** `reviews`

Customer reviews with category-based ratings (similar to Booking.com).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hotel_id | UUID | Foreign key to hotels |
| booking_id | UUID | Foreign key to bookings |
| user_id | UUID | Foreign key to users |
| reviewer_name | VARCHAR(255) | Display name |
| reviewer_country | VARCHAR(100) | Reviewer's country |
| reviewer_avatar_url | TEXT | Profile photo |
| overall_rating | DECIMAL(3,1) | Overall score (0-10) |
| staff_rating | DECIMAL(3,1) | Staff score (0-10) |
| facilities_rating | DECIMAL(3,1) | Facilities score (0-10) |
| cleanliness_rating | DECIMAL(3,1) | Cleanliness score (0-10) |
| comfort_rating | DECIMAL(3,1) | Comfort score (0-10) |
| value_rating | DECIMAL(3,1) | Value score (0-10) |
| location_rating | DECIMAL(3,1) | Location score (0-10) |
| free_wifi_rating | DECIMAL(3,1) | WiFi score (0-10) |
| title | VARCHAR(255) | Review title |
| comment | TEXT | Review text |
| stayed_date | DATE | Stay date |
| is_verified | BOOLEAN | Verified stay |
| helpful_count | INTEGER | Helpful votes |
| status | VARCHAR(20) | pending, approved, rejected |
| created_at | TIMESTAMP | Review time |
| updated_at | TIMESTAMP | Last update time |

**Unique Constraint:** booking_id (one review per booking)

**Indexes:**
- `idx_reviews_hotel_id` on hotel_id
- `idx_reviews_status` on status
- `idx_reviews_created_at` on created_at DESC

---

### 8. Payments

**Table:** `payments`

Payment transaction records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| booking_id | UUID | Foreign key to bookings |
| payment_reference | VARCHAR(100) | Unique payment ID |
| amount | DECIMAL(10,2) | Payment amount |
| currency | VARCHAR(3) | Currency code |
| payment_method_id | UUID | Foreign key to payment_methods |
| payment_gateway | VARCHAR(50) | Gateway used (stripe, razorpay, etc.) |
| transaction_id | VARCHAR(255) | Gateway transaction ID |
| status | VARCHAR(20) | pending, success, failed, refunded |
| paid_at | TIMESTAMP | Payment time |
| created_at | TIMESTAMP | Record creation time |

---

### 9. Amenities

**Table:** `amenities`

Master list of hotel amenities and facilities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| category_id | UUID | Foreign key to amenity_categories |
| name | VARCHAR(100) | Amenity name |
| icon | VARCHAR(100) | Icon identifier |
| display_order | INTEGER | Sort order |
| created_at | TIMESTAMP | Creation time |

**Related Tables:**
- `amenity_categories` - Amenity groupings (Bathroom, Media & Technology, etc.)
- `hotel_amenities` - Property-level amenities
- `room_type_amenities` - Room-level amenities

---

### 10. Price Rules

**Table:** `price_rules`

Dynamic pricing rules for different periods and conditions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| room_type_id | UUID | Foreign key to room_types |
| valid_from | DATE | Start date |
| valid_to | DATE | End date |
| price_per_night | DECIMAL(10,2) | Nightly rate |
| min_nights | INTEGER | Minimum stay |
| max_nights | INTEGER | Maximum stay |
| day_of_week | INTEGER | 0-6 for specific days |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:**
- `idx_price_rules_room_type` on room_type_id
- `idx_price_rules_dates` on (valid_from, valid_to)

---

### 11. Promotions

**Table:** `promotions`

Discount codes and promotional offers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hotel_id | UUID | Foreign key to hotels (NULL for global) |
| code | VARCHAR(50) | Promo code |
| description | TEXT | Offer description |
| discount_type | VARCHAR(20) | percentage, fixed |
| discount_value | DECIMAL(10,2) | Discount amount |
| min_booking_amount | DECIMAL(10,2) | Minimum spend |
| max_discount | DECIMAL(10,2) | Maximum discount |
| valid_from | DATE | Start date |
| valid_to | DATE | End date |
| usage_limit | INTEGER | Maximum uses |
| used_count | INTEGER | Current usage |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

---

### 12. Nearby Attractions

**Table:** `nearby_attractions`

Points of interest near hotels.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Attraction name |
| category | VARCHAR(50) | restaurant, attraction, transit, etc. |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| description | TEXT | Description |
| created_at | TIMESTAMP | Creation time |

**Related Table:** `hotel_nearby_attractions` - Links hotels to attractions with distances

---

### 13. FAQs

**Table:** `faqs`

Frequently asked questions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hotel_id | UUID | Foreign key to hotels (NULL for global) |
| question | TEXT | Question text |
| answer | TEXT | Answer text |
| category | VARCHAR(50) | breakfast, parking, wifi, etc. |
| display_order | INTEGER | Sort order |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

---

## Key Relationships

### One-to-Many Relationships

1. **hotels → room_types** (One hotel has many room types)
2. **hotels → bookings** (One hotel has many bookings)
3. **users → bookings** (One user has many bookings)
4. **room_types → rooms** (One room type has many physical rooms)
5. **bookings → payments** (One booking has many payments - for installments)
6. **hotels → reviews** (One hotel has many reviews)
7. **bookings → booking_guests** (One booking has many guests)

### One-to-One Relationships

1. **bookings ↔ reviews** (One booking has one review)
2. **reviews ↔ review_responses** (One review has one response)

### Many-to-Many Relationships

1. **hotels ↔ amenities** (through `hotel_amenities`)
2. **room_types ↔ amenities** (through `room_type_amenities`)
3. **hotels ↔ payment_methods** (through `hotel_payment_methods`)
4. **hotels ↔ languages** (through `hotel_languages`)
5. **hotels ↔ nearby_attractions** (through `hotel_nearby_attractions`)
6. **users ↔ hotels** (through `wishlists`)

---

## Indexes and Performance

### Primary Indexes

All tables use UUID primary keys with auto-generation via `uuid_generate_v4()`.

### Performance Indexes

Created on frequently queried columns:

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Hotel searches
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_location ON hotels(latitude, longitude);

-- Booking queries
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Review filtering
CREATE INDEX idx_reviews_hotel_id ON reviews(hotel_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Availability checks
CREATE INDEX idx_room_availability_room_date ON room_availability(room_id, date);
```

### Database Views

**hotel_summary** - Aggregated hotel data with ratings:

```sql
CREATE OR REPLACE VIEW hotel_summary AS
SELECT
    h.id,
    h.name,
    h.city,
    COUNT(DISTINCT r.id) as review_count,
    ROUND(AVG(r.overall_rating), 1) as avg_rating,
    MIN(rt.base_price) as starting_price
FROM hotels h
LEFT JOIN reviews r ON h.id = r.hotel_id AND r.status = 'approved'
LEFT JOIN room_types rt ON h.id = rt.hotel_id
GROUP BY h.id;
```

---

## Security Considerations

### Row Level Security (RLS)

The schema is designed to work with Supabase RLS. Example policies:

```sql
-- Users can only view their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can only view their own bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookings_select_own ON bookings
    FOR SELECT USING (auth.uid() = user_id);

-- Anyone can view approved reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select_approved ON reviews
    FOR SELECT USING (status = 'approved');
```

### Data Protection

1. **Password Hashing**: Store only hashed passwords
2. **Email Verification**: Track verification status
3. **Soft Deletes**: Use `deleted_at` columns for audit trails
4. **Audit Trails**: `created_at` and `updated_at` on all tables

### Foreign Key Constraints

- **CASCADE**: Delete related child records (images, amenities)
- **RESTRICT**: Prevent deletion of referenced records (users, hotels in bookings)
- **SET NULL**: Nullify references (payment methods, room assignments)

---

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Wait for database provisioning

### 2. Run SQL Schema

1. Open SQL Editor in Supabase
2. Copy contents of `database-schema.sql`
3. Execute the script

### 3. Verify Installation

Check table creation:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 4. Enable Row Level Security (Optional)

Uncomment and customize RLS policies in the schema file based on your requirements.

### 5. Configure Authentication

Set up Supabase Auth for user management:

```sql
-- Link Supabase auth users to your users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (new.id, new.email, new.created_at);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## Common Queries

### Search Hotels by City

```sql
SELECT
    h.id,
    h.name,
    h.star_rating,
    hs.avg_rating,
    hs.review_count,
    hs.starting_price
FROM hotels h
JOIN hotel_summary hs ON h.id = hs.id
WHERE h.city = 'Bangalore'
    AND h.status = 'active'
ORDER BY hs.avg_rating DESC
LIMIT 20;
```

### Check Room Availability

```sql
SELECT
    rt.id,
    rt.name,
    rt.base_price,
    rt.max_occupancy,
    COUNT(r.id) as total_rooms,
    COUNT(r.id) FILTER (WHERE r.status = 'available') as available_rooms
FROM room_types rt
JOIN rooms r ON rt.id = r.room_type_id
WHERE rt.hotel_id = 'hotel-uuid-here'
    AND rt.status = 'available'
GROUP BY rt.id, rt.name, rt.base_price, rt.max_occupancy
HAVING COUNT(r.id) FILTER (WHERE r.status = 'available') > 0;
```

### Get Hotel with Reviews

```sql
SELECT
    h.*,
    ROUND(AVG(r.overall_rating), 1) as avg_overall,
    ROUND(AVG(r.staff_rating), 1) as avg_staff,
    ROUND(AVG(r.facilities_rating), 1) as avg_facilities,
    ROUND(AVG(r.cleanliness_rating), 1) as avg_cleanliness,
    COUNT(r.id) as total_reviews
FROM hotels h
LEFT JOIN reviews r ON h.id = r.hotel_id AND r.status = 'approved'
WHERE h.id = 'hotel-uuid-here'
GROUP BY h.id;
```

### User Booking History

```sql
SELECT
    b.booking_reference,
    h.name as hotel_name,
    b.check_in_date,
    b.check_out_date,
    b.total_amount,
    b.status,
    p.status as payment_status
FROM bookings b
JOIN hotels h ON b.hotel_id = h.id
LEFT JOIN payments p ON b.id = p.booking_id
WHERE b.user_id = 'user-uuid-here'
ORDER BY b.created_at DESC;
```

### Calculate Dynamic Pricing

```sql
SELECT
    rt.name,
    COALESCE(pr.price_per_night, rt.base_price) as current_price,
    pr.min_nights,
    pr.max_nights
FROM room_types rt
LEFT JOIN price_rules pr ON rt.id = pr.room_type_id
    AND CURRENT_DATE BETWEEN pr.valid_from AND pr.valid_to
    AND pr.is_active = true
WHERE rt.hotel_id = 'hotel-uuid-here'
    AND rt.status = 'available';
```

### Get Nearby Attractions

```sql
SELECT
    na.name,
    na.category,
    hna.distance_text
FROM hotel_nearby_attractions hna
JOIN nearby_attractions na ON hna.attraction_id = na.id
WHERE hna.hotel_id = 'hotel-uuid-here'
ORDER BY hna.distance_meters ASC
LIMIT 10;
```

### Apply Promotion Code

```sql
SELECT
    p.code,
    p.discount_type,
    p.discount_value,
    p.min_booking_amount,
    p.max_discount,
    p.usage_limit - p.used_count as remaining_uses
FROM promotions p
WHERE p.code = 'SUMMER2025'
    AND p.is_active = true
    AND CURRENT_DATE BETWEEN p.valid_from AND p.valid_to
    AND (p.hotel_id = 'hotel-uuid-here' OR p.hotel_id IS NULL)
    AND p.used_count < p.usage_limit;
```

---

## Migration Guide

### Adding New Fields

```sql
ALTER TABLE hotels ADD COLUMN new_field VARCHAR(100);
```

### Modifying Existing Fields

```sql
ALTER TABLE hotels ALTER COLUMN description TYPE TEXT;
```

### Creating Indexes

```sql
CREATE INDEX idx_custom ON table_name(column_name);
```

### Backup Before Migration

```bash
# Using Supabase CLI
supabase db dump > backup.sql

# Or using pg_dump
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Rolling Back Changes

Keep migration scripts versioned and maintain rollback scripts:

```sql
-- Migration: 001_add_field.sql
ALTER TABLE hotels ADD COLUMN new_field VARCHAR(100);

-- Rollback: 001_add_field_rollback.sql
ALTER TABLE hotels DROP COLUMN new_field;
```

---

## Best Practices

### 1. Use Transactions

```sql
BEGIN;
-- Your queries here
COMMIT;
```

### 2. Avoid N+1 Queries

Use JOINs or batch queries instead of multiple individual queries.

### 3. Use Prepared Statements

Always use parameterized queries to prevent SQL injection.

### 4. Monitor Performance

Use Supabase dashboard to track slow queries and optimize indexes.

### 5. Regular Backups

Schedule automated backups:
- Daily full backups
- Hourly incremental backups for production

### 6. Test Locally

Use Supabase local development:

```bash
supabase start
supabase db reset
supabase db push
```

---

## Troubleshooting

### Common Issues

**Issue:** Foreign key constraint violation
```
ERROR: insert or update on table "bookings" violates foreign key constraint
```

**Solution:** Ensure referenced records exist before inserting.

**Issue:** Duplicate key violation
```
ERROR: duplicate key value violates unique constraint
```

**Solution:** Check for existing records before inserting or use `ON CONFLICT` clauses.

**Issue:** Slow queries
**Solution:** Add appropriate indexes and use `EXPLAIN ANALYZE` to check query plans.

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Project Repository**: [Your repo URL]
- **Issue Tracker**: [Your issues URL]

---

## License

[Your License Here]

---

## Changelog

### Version 1.0.0 (2025-12-06)
- Initial database schema
- 35+ tables covering all hotel booking features
- Optimized indexes for performance
- RLS-ready for security
- Comprehensive documentation

---

**End of Documentation**
