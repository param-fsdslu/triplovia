-- Allow 'homestay' as a valid property_type on hotels.
-- The frontend (HotelForm.tsx, lib/types/hotel.ts) already offers "Homestay",
-- but the DB check constraint rejected it, causing:
-- "new row for relation \"hotels\" violates check constraint \"hotels_property_type_check\""

ALTER TABLE "public"."hotels"
  DROP CONSTRAINT IF EXISTS "hotels_property_type_check";

ALTER TABLE "public"."hotels"
  ADD CONSTRAINT "hotels_property_type_check"
  CHECK ((("property_type")::"text" = ANY ((ARRAY[
    'hotel'::character varying,
    'apartment'::character varying,
    'resort'::character varying,
    'villa'::character varying,
    'guesthouse'::character varying,
    'hostel'::character varying,
    'motel'::character varying,
    'homestay'::character varying
  ])::"text"[])));
