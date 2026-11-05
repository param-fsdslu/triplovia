-- Wires up the existing (previously unused) price_rules table for weekend,
-- festival/long-weekend, and custom date-range room pricing.
-- Run this in the Supabase SQL editor before deploying the app changes that use it.
--
-- Row shapes:
--   Weekend pricing:  price_type='weekend', day_of_week set (0=Sun..6=Sat), one row
--                      per applicable weekday, a wide/open-ended valid_from/valid_to.
--   Festival/long_weekend/custom: price_type accordingly, day_of_week NULL,
--                      an explicit valid_from/valid_to date range.
--
-- Resolution precedence for a given night: any matching non-weekend rule
-- (festival/long_weekend/custom covering that date) wins; otherwise a matching
-- weekend rule (date in range AND day_of_week matches) applies; otherwise base_price.

ALTER TABLE "public"."price_rules"
  ADD COLUMN IF NOT EXISTS "label" character varying(255),
  ADD COLUMN IF NOT EXISTS "price_type" character varying(20) DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS "created_by" "uuid";

ALTER TABLE "public"."price_rules"
  DROP CONSTRAINT IF EXISTS "price_rules_price_type_check";
ALTER TABLE "public"."price_rules"
  ADD CONSTRAINT "price_rules_price_type_check"
  CHECK (("price_type" = ANY (ARRAY['weekend', 'festival', 'long_weekend', 'custom']::"text"[])));

COMMENT ON COLUMN "public"."price_rules"."label" IS 'Admin-facing name, e.g. "Weekend", "Christmas Festival", "Republic Day Long Weekend".';
COMMENT ON COLUMN "public"."price_rules"."price_type" IS 'weekend (recurring by day_of_week) | festival | long_weekend | custom (explicit date range).';
COMMENT ON COLUMN "public"."price_rules"."day_of_week" IS 'Set only for price_type=weekend: 0=Sunday .. 6=Saturday. NULL for date-range overrides.';

-- This table had no RLS and was GRANTed to anon/authenticated directly — anyone
-- could previously write arbitrary prices. Lock it down now that it's live,
-- using the same is_super_admin()/is_hotel_admin() helpers the rest of the
-- admin-managed, hotel-scoped tables (hotel_images, room_type_amenities, etc.) use.
ALTER TABLE "public"."price_rules" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_rules_public_read" ON "public"."price_rules";
CREATE POLICY "price_rules_public_read"
  ON "public"."price_rules" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "price_rules_super_admin_all" ON "public"."price_rules";
CREATE POLICY "price_rules_super_admin_all"
  ON "public"."price_rules" FOR ALL
  USING ("public"."is_super_admin"())
  WITH CHECK ("public"."is_super_admin"());

DROP POLICY IF EXISTS "price_rules_hotel_admin_own" ON "public"."price_rules";
CREATE POLICY "price_rules_hotel_admin_own"
  ON "public"."price_rules" FOR ALL
  USING (
    "public"."is_hotel_admin"() AND EXISTS (
      SELECT 1 FROM "public"."room_types"
      JOIN "public"."hotels" ON "hotels"."id" = "room_types"."hotel_id"
      WHERE "room_types"."id" = "price_rules"."room_type_id"
      AND "hotels"."owner_id" = "auth"."uid"()
    )
  )
  WITH CHECK (
    "public"."is_hotel_admin"() AND EXISTS (
      SELECT 1 FROM "public"."room_types"
      JOIN "public"."hotels" ON "hotels"."id" = "room_types"."hotel_id"
      WHERE "room_types"."id" = "price_rules"."room_type_id"
      AND "hotels"."owner_id" = "auth"."uid"()
    )
  );

REVOKE ALL ON TABLE "public"."price_rules" FROM "anon";
