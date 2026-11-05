-- booking_status previously defaulted to 'confirmed', so any insert path that
-- forgot to set it explicitly would silently create a "confirmed" booking before
-- payment. The application now sets 'pending' explicitly at creation and only
-- moves to 'confirmed' once payment is verified — this fixes the column default
-- to match, as defense in depth.

ALTER TABLE "public"."bookings" ALTER COLUMN "booking_status" SET DEFAULT 'pending';
ALTER TABLE "public"."boat_bookings" ALTER COLUMN "booking_status" SET DEFAULT 'pending';
