-- Add 'archived' as a valid hotels.status value, to support soft-deleting
-- hotels that have historical (past/completed/cancelled) bookings.
-- Archiving preserves booking/payment/review history (avoids the
-- ON DELETE CASCADE data loss a hard delete would cause) while removing
-- the property from the public site and the admin's default hotel list.

ALTER TABLE "public"."hotels"
  DROP CONSTRAINT IF EXISTS "hotels_status_check";

ALTER TABLE "public"."hotels"
  ADD CONSTRAINT "hotels_status_check"
  CHECK ((("status")::"text" = ANY ((ARRAY[
    'active'::character varying,
    'inactive'::character varying,
    'pending'::character varying,
    'archived'::character varying
  ])::"text"[])));
