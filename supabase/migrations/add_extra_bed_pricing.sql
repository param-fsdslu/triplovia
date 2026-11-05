-- Adds standard occupancy + extra-bed/additional-guest pricing to room_types,
-- and an extra_bed_charge column on bookings to record what was actually charged.
-- Run this in the Supabase SQL editor (dashboard) before deploying the app changes
-- that read/write these columns.

ALTER TABLE "public"."room_types"
  ADD COLUMN IF NOT EXISTS "standard_occupancy" integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "extra_bed_price" numeric(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN "public"."room_types"."standard_occupancy" IS
  'Number of guests included in base_price before extra_bed_price applies per additional guest.';
COMMENT ON COLUMN "public"."room_types"."extra_bed_price" IS
  'Per-night charge for each guest beyond standard_occupancy, up to max_occupancy.';

ALTER TABLE "public"."bookings"
  ADD COLUMN IF NOT EXISTS "extra_bed_charge" numeric(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN "public"."bookings"."extra_bed_charge" IS
  'Total extra-bed/additional-guest charge for this booking (nights x extra guests x room_types.extra_bed_price at time of booking).';
