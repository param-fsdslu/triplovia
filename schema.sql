


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_booking_amounts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Calculate num_nights
    NEW.num_nights := NEW.check_out_date - NEW.check_in_date;

    -- Calculate subtotal
    NEW.subtotal := NEW.price_per_night * NEW.num_nights * NEW.num_rooms;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_booking_amounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_blog_slug"("title" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    slug TEXT;
    counter INTEGER := 0;
    temp_slug TEXT;
BEGIN
    -- Convert to lowercase and replace spaces with hyphens
    slug := LOWER(TRIM(title));
    slug := REGEXP_REPLACE(slug, '[^a-z0-9\s-]', '', 'g');
    slug := REGEXP_REPLACE(slug, '\s+', '-', 'g');
    slug := REGEXP_REPLACE(slug, '-+', '-', 'g');

    -- Ensure slug is unique
    temp_slug := slug;
    WHILE EXISTS (SELECT 1 FROM blogs WHERE blogs.slug = temp_slug) LOOP
        counter := counter + 1;
        temp_slug := slug || '-' || counter;
    END LOOP;

    RETURN temp_slug;
END;
$$;


ALTER FUNCTION "public"."generate_blog_slug"("title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_booking_reference"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    reference TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate format: BK-YYYYMMDD-XXXX (e.g., BK-20250109-A7B2)
        reference := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                     UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

        -- Check if reference already exists
        SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_reference = reference) INTO exists;

        -- Exit loop if reference is unique
        EXIT WHEN NOT exists;
    END LOOP;

    RETURN reference;
END;
$$;


ALTER FUNCTION "public"."generate_booking_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_blogs_with_author"() RETURNS TABLE("id" "uuid", "title" character varying, "slug" character varying, "excerpt" "text", "content" "text", "featured_image" "text", "author_id" "uuid", "status" character varying, "published_at" timestamp with time zone, "meta_title" character varying, "meta_description" character varying, "tags" "text"[], "view_count" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "author_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.title,
        b.slug,
        b.excerpt,
        b.content,
        b.featured_image,
        b.author_id,
        b.status,
        b.published_at,
        b.meta_title,
        b.meta_description,
        b.tags,
        b.view_count,
        b.created_at,
        b.updated_at,
        u.email::TEXT as author_email
    FROM blogs b
    LEFT JOIN auth.users u ON b.author_id = u.id;
END;
$$;


ALTER FUNCTION "public"."get_blogs_with_author"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_blogs_with_author"() IS 'Returns all blogs with author email for admin dashboard';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, hotel_ids)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->'hotel_ids'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        hotel_ids = EXCLUDED.hotel_ids,
        updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'super_admin'
        OR auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
      )
    )
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_hotel_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'hotel_admin'
    )
  );
END;
$$;


ALTER FUNCTION "public"."is_hotel_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'super_admin'
        OR auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
  );
END;
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_payment_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO payment_audit_log (
        payment_id,
        booking_id,
        event_type,
        event_source,
        payload,
        success
    ) VALUES (
        NEW.id,
        NEW.booking_id,
        TG_OP,
        'database_trigger',
        row_to_json(NEW),
        CASE WHEN NEW.status = 'success' THEN TRUE ELSE FALSE END
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_payment_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."amenities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid",
    "name" character varying(100) NOT NULL,
    "icon" character varying(100),
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amenity_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "icon" character varying(100),
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."amenity_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "blog_id" "uuid",
    "image_url" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "alt_text" character varying(255),
    "caption" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."blog_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blogs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(500) NOT NULL,
    "slug" character varying(500) NOT NULL,
    "excerpt" "text",
    "content" "text" NOT NULL,
    "featured_image" "text",
    "author_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "published_at" timestamp with time zone,
    "meta_title" character varying(200),
    "meta_description" character varying(500),
    "tags" "text"[],
    "view_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "blogs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."blogs" OWNER TO "postgres";


COMMENT ON TABLE "public"."blogs" IS 'Blog posts with rich text content';



COMMENT ON COLUMN "public"."blogs"."slug" IS 'URL-friendly identifier for the blog post';



COMMENT ON COLUMN "public"."blogs"."content" IS 'Rich text HTML content from editor';



COMMENT ON COLUMN "public"."blogs"."featured_image" IS 'Main image URL for the blog post';



COMMENT ON COLUMN "public"."blogs"."status" IS 'Post status: draft, published, or archived';



COMMENT ON COLUMN "public"."blogs"."tags" IS 'Array of tags for categorization';



CREATE OR REPLACE VIEW "public"."blogs_with_author" WITH ("security_invoker"='true') AS
 SELECT "b"."id",
    "b"."title",
    "b"."slug",
    "b"."excerpt",
    "b"."content",
    "b"."featured_image",
    "b"."author_id",
    "b"."status",
    "b"."published_at",
    "b"."meta_title",
    "b"."meta_description",
    "b"."tags",
    "b"."view_count",
    "b"."created_at",
    "b"."updated_at",
    "u"."email" AS "author_email"
   FROM ("public"."blogs" "b"
     LEFT JOIN "auth"."users" "u" ON (("b"."author_id" = "u"."id")));


ALTER VIEW "public"."blogs_with_author" OWNER TO "postgres";


COMMENT ON VIEW "public"."blogs_with_author" IS 'Blogs table with author email for admin dashboard';



CREATE TABLE IF NOT EXISTS "public"."boat_amenities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "boat_id" "uuid" NOT NULL,
    "amenity_id" "uuid" NOT NULL,
    "is_free" boolean DEFAULT true,
    "additional_charge" numeric(10,2)
);


ALTER TABLE "public"."boat_amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boat_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_reference" "text" NOT NULL,
    "user_id" "uuid",
    "boat_id" "uuid" NOT NULL,
    "trip_type_id" "uuid" NOT NULL,
    "time_slot_id" "uuid" NOT NULL,
    "trip_date" "date" NOT NULL,
    "num_adults" integer DEFAULT 1 NOT NULL,
    "num_children" integer DEFAULT 0 NOT NULL,
    "guest_first_name" "text" NOT NULL,
    "guest_last_name" "text" NOT NULL,
    "guest_email" "text" NOT NULL,
    "guest_phone" "text" NOT NULL,
    "pricing_model" "text" NOT NULL,
    "price_per_person" numeric(10,2),
    "price_per_boat" numeric(10,2),
    "child_price_per_person" numeric(10,2),
    "subtotal" numeric(10,2) NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax_percentage" numeric(5,2) DEFAULT 12,
    "service_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'INR'::"text" NOT NULL,
    "booking_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text",
    "payment_transaction_id" "text",
    "special_requests" "text",
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "booking_source" "text" DEFAULT 'web'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "boat_bookings_booking_status_check" CHECK (("booking_status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text", 'no_show'::"text"]))),
    CONSTRAINT "boat_bookings_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "boat_bookings_pricing_model_check" CHECK (("pricing_model" = ANY (ARRAY['per_person'::"text", 'per_boat'::"text"])))
);


ALTER TABLE "public"."boat_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boat_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "boat_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "storage_path" "text",
    "alt_text" "text" DEFAULT ''::"text",
    "is_primary" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."boat_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boat_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "boat_id" "uuid" NOT NULL,
    "boat_booking_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "overall_rating" numeric(3,1) NOT NULL,
    "safety_rating" numeric(3,1),
    "crew_rating" numeric(3,1),
    "experience_rating" numeric(3,1),
    "value_rating" numeric(3,1),
    "title" "text",
    "comment" "text",
    "trip_date" "date",
    "is_verified" boolean DEFAULT true,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "boat_reviews_overall_rating_check" CHECK ((("overall_rating" >= (0)::numeric) AND ("overall_rating" <= (10)::numeric))),
    CONSTRAINT "boat_reviews_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."boat_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "boat_type" "text" DEFAULT 'motorboat'::"text" NOT NULL,
    "capacity" integer DEFAULT 10 NOT NULL,
    "owner_id" "uuid",
    "address_line_1" "text",
    "city" "text" DEFAULT 'Honnavar'::"text" NOT NULL,
    "state" "text" DEFAULT 'Karnataka'::"text" NOT NULL,
    "country" "text" DEFAULT 'India'::"text" NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "departure_point" "text",
    "phone" "text",
    "email" "text",
    "cancellation_policy_text" "text",
    "safety_info_text" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "boats_boat_type_check" CHECK (("boat_type" = ANY (ARRAY['motorboat'::"text", 'sailboat'::"text", 'speedboat'::"text", 'houseboat'::"text", 'kayak'::"text", 'ferry'::"text"]))),
    CONSTRAINT "boats_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."boats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_meal_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "meal_plan_id" "uuid" NOT NULL,
    "meal_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price_per_person" numeric(10,2) NOT NULL,
    "num_guests" integer NOT NULL,
    "num_nights" integer NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."booking_meal_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "guest_email" character varying(255) NOT NULL,
    "guest_first_name" character varying(100) NOT NULL,
    "guest_last_name" character varying(100) NOT NULL,
    "guest_phone" character varying(20) NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "check_in_date" "date" NOT NULL,
    "check_out_date" "date" NOT NULL,
    "num_nights" integer,
    "num_adults" integer NOT NULL,
    "num_children" integer DEFAULT 0,
    "num_rooms" integer DEFAULT 1,
    "price_per_night" numeric(10,2) NOT NULL,
    "subtotal" numeric(10,2),
    "tax_amount" numeric(10,2) DEFAULT 0,
    "service_fee" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) NOT NULL,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "payment_method" character varying(50),
    "payment_transaction_id" character varying(255),
    "booking_status" character varying(20) DEFAULT 'pending'::character varying,
    "booking_reference" character varying(20) NOT NULL,
    "special_requests" "text",
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "razorpay_order_id" character varying(255),
    "razorpay_payment_id" character varying(255),
    "meal_plan_total" numeric(10,2) DEFAULT 0,
    "extra_bed_charge" numeric(10,2) DEFAULT 0,
    CONSTRAINT "bookings_booking_status_check" CHECK ((("booking_status")::"text" = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying, 'no_show'::character varying])::"text"[]))),
    CONSTRAINT "bookings_num_adults_check" CHECK (("num_adults" >= 1)),
    CONSTRAINT "bookings_num_children_check" CHECK (("num_children" >= 0)),
    CONSTRAINT "bookings_num_rooms_check" CHECK (("num_rooms" >= 1)),
    CONSTRAINT "bookings_payment_status_check" CHECK ((("payment_status")::"text" = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::"text"[]))),
    CONSTRAINT "valid_dates" CHECK (("check_out_date" > "check_in_date")),
    CONSTRAINT "valid_total" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cancellation_policies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "room_type_id" "uuid",
    "policy_name" character varying(255) NOT NULL,
    "free_cancellation_hours" integer,
    "cancellation_charge_percentage" numeric(5,2),
    "no_show_charge_percentage" numeric(5,2),
    "valid_from" "date",
    "valid_to" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cancellation_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_policies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "children_allowed" boolean DEFAULT true,
    "age_charged_as_adult" integer,
    "extra_bed_available" boolean DEFAULT false,
    "crib_available" boolean DEFAULT false,
    "extra_bed_charge" numeric(10,2),
    "crib_charge" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."child_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faqs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid",
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" character varying(50),
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "faqs_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['breakfast'::character varying, 'parking'::character varying, 'spa'::character varying, 'swimming_pool'::character varying, 'wifi'::character varying, 'check_in_out'::character varying, 'payment'::character varying, 'general'::character varying])::"text"[])))
);


ALTER TABLE "public"."faqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_admin_permissions" (
    "permission_key" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "requires_approval" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hotel_admin_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_amenities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "amenity_id" "uuid" NOT NULL,
    "is_free" boolean DEFAULT true,
    "additional_charge" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "alt_text" character varying(255),
    "is_primary" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "storage_path" "text"
);


ALTER TABLE "public"."hotel_images" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hotel_images"."storage_path" IS 'Path to the image file in Supabase Storage (e.g., hotel-id/filename.jpg)';



CREATE TABLE IF NOT EXISTS "public"."hotel_languages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "language_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_languages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_nearby_attractions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "attraction_id" "uuid" NOT NULL,
    "distance_meters" integer,
    "distance_text" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_nearby_attractions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_payment_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "payment_method_id" "uuid" NOT NULL,
    "is_accepted" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_property_highlights" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "highlight_type" character varying(50),
    "title" character varying(255) NOT NULL,
    "description" "text",
    "icon" character varying(100),
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hotel_property_highlights_highlight_type_check" CHECK ((("highlight_type")::"text" = ANY ((ARRAY['perfect_for_stay'::character varying, 'loyal_customers'::character varying, 'top_location'::character varying, 'great_value'::character varying, 'excellent_service'::character varying])::"text"[])))
);


ALTER TABLE "public"."hotel_property_highlights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotels" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "description" "text",
    "star_rating" integer,
    "property_type" character varying(50) DEFAULT 'hotel'::character varying,
    "chain_brand" character varying(100),
    "address_line_1" character varying(255) NOT NULL,
    "address_line_2" character varying(255),
    "city" character varying(100) NOT NULL,
    "state" character varying(100) NOT NULL,
    "country" character varying(100) NOT NULL,
    "postal_code" character varying(20),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "location_rating" numeric(3,1),
    "phone" character varying(20),
    "email" character varying(255),
    "website" "text",
    "check_in_from_time" time without time zone,
    "check_in_to_time" time without time zone,
    "check_out_time" time without time zone,
    "advance_notice_required" boolean DEFAULT false,
    "minimum_age_check_in" integer DEFAULT 18,
    "cancellation_policy_text" "text",
    "child_policy_text" "text",
    "extra_bed_policy_text" "text",
    "pet_policy_text" "text",
    "smoking_allowed" boolean DEFAULT false,
    "parking_available" boolean DEFAULT false,
    "parking_type" character varying(20),
    "parking_free" boolean DEFAULT false,
    "is_genius_discount_available" boolean DEFAULT false,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "owner_id" "uuid",
    "maps_embed_url" "text",
    "inventory_source" "text" DEFAULT 'manual'::"text" NOT NULL,
    CONSTRAINT "hotels_inventory_source_check" CHECK (("inventory_source" = ANY (ARRAY['manual'::"text", 'api'::"text"]))),
    CONSTRAINT "hotels_location_rating_check" CHECK ((("location_rating" >= (0)::numeric) AND ("location_rating" <= (10)::numeric))),
    CONSTRAINT "hotels_parking_type_check" CHECK ((("parking_type")::"text" = ANY ((ARRAY['on-site'::character varying, 'off-site'::character varying, 'none'::character varying])::"text"[]))),
    CONSTRAINT "hotels_property_type_check" CHECK ((("property_type")::"text" = ANY ((ARRAY['hotel'::character varying, 'apartment'::character varying, 'resort'::character varying, 'villa'::character varying, 'guesthouse'::character varying, 'hostel'::character varying, 'motel'::character varying, 'homestay'::character varying])::"text"[]))),
    CONSTRAINT "hotels_star_rating_check" CHECK ((("star_rating" >= 1) AND ("star_rating" <= 5))),
    CONSTRAINT "hotels_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."hotels" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hotels"."owner_id" IS 'Reference to the user who owns/manages this hotel (hotel_admin role)';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reviewer_name" character varying(255),
    "reviewer_country" character varying(100),
    "reviewer_avatar_url" "text",
    "overall_rating" numeric(3,1),
    "staff_rating" numeric(3,1),
    "facilities_rating" numeric(3,1),
    "cleanliness_rating" numeric(3,1),
    "comfort_rating" numeric(3,1),
    "value_rating" numeric(3,1),
    "location_rating" numeric(3,1),
    "free_wifi_rating" numeric(3,1),
    "title" character varying(255),
    "comment" "text",
    "stayed_date" "date",
    "is_verified" boolean DEFAULT false,
    "helpful_count" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "reviews_cleanliness_rating_check" CHECK ((("cleanliness_rating" >= (0)::numeric) AND ("cleanliness_rating" <= (10)::numeric))),
    CONSTRAINT "reviews_comfort_rating_check" CHECK ((("comfort_rating" >= (0)::numeric) AND ("comfort_rating" <= (10)::numeric))),
    CONSTRAINT "reviews_facilities_rating_check" CHECK ((("facilities_rating" >= (0)::numeric) AND ("facilities_rating" <= (10)::numeric))),
    CONSTRAINT "reviews_free_wifi_rating_check" CHECK ((("free_wifi_rating" >= (0)::numeric) AND ("free_wifi_rating" <= (10)::numeric))),
    CONSTRAINT "reviews_location_rating_check" CHECK ((("location_rating" >= (0)::numeric) AND ("location_rating" <= (10)::numeric))),
    CONSTRAINT "reviews_overall_rating_check" CHECK ((("overall_rating" >= (0)::numeric) AND ("overall_rating" <= (10)::numeric))),
    CONSTRAINT "reviews_staff_rating_check" CHECK ((("staff_rating" >= (0)::numeric) AND ("staff_rating" <= (10)::numeric))),
    CONSTRAINT "reviews_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::"text"[]))),
    CONSTRAINT "reviews_value_rating_check" CHECK ((("value_rating" >= (0)::numeric) AND ("value_rating" <= (10)::numeric)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "size_sqm" integer,
    "max_occupancy" integer NOT NULL,
    "max_adults" integer NOT NULL,
    "max_children" integer DEFAULT 0,
    "standard_occupancy" integer DEFAULT 2 NOT NULL,
    "extra_bed_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "bed_configuration" character varying(255),
    "base_price" numeric(10,2) NOT NULL,
    "num_available_rooms" integer DEFAULT 0,
    "free_cancellation_until" "date",
    "prepayment_required" boolean DEFAULT false,
    "credit_card_required" boolean DEFAULT true,
    "status" character varying(20) DEFAULT 'available'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "room_types_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['available'::character varying, 'unavailable'::character varying])::"text"[])))
);


ALTER TABLE "public"."room_types" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."hotel_summary" AS
 SELECT "h"."id",
    "h"."name",
    "h"."slug",
    "h"."city",
    "h"."star_rating",
    "h"."property_type",
    "h"."location_rating",
    "count"(DISTINCT "r"."id") AS "review_count",
    "round"("avg"("r"."overall_rating"), 1) AS "avg_overall_rating",
    "round"("avg"("r"."staff_rating"), 1) AS "avg_staff_rating",
    "round"("avg"("r"."facilities_rating"), 1) AS "avg_facilities_rating",
    "round"("avg"("r"."cleanliness_rating"), 1) AS "avg_cleanliness_rating",
    "round"("avg"("r"."comfort_rating"), 1) AS "avg_comfort_rating",
    "round"("avg"("r"."value_rating"), 1) AS "avg_value_rating",
    "round"("avg"("r"."location_rating"), 1) AS "avg_location_rating_review",
    "round"("avg"("r"."free_wifi_rating"), 1) AS "avg_wifi_rating",
    "min"("rt"."base_price") AS "starting_price"
   FROM (("public"."hotels" "h"
     LEFT JOIN "public"."reviews" "r" ON ((("h"."id" = "r"."hotel_id") AND (("r"."status")::"text" = 'approved'::"text"))))
     LEFT JOIN "public"."room_types" "rt" ON ((("h"."id" = "rt"."hotel_id") AND (("rt"."status")::"text" = 'available'::"text"))))
  WHERE (("h"."status")::"text" = 'active'::"text")
  GROUP BY "h"."id", "h"."name", "h"."slug", "h"."city", "h"."star_rating", "h"."property_type", "h"."location_rating";


ALTER VIEW "public"."hotel_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."languages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character varying(5) NOT NULL,
    "name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."languages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "meal_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price_per_person" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "child_price_per_person" numeric(10,2),
    CONSTRAINT "meal_plans_meal_type_check" CHECK (("meal_type" = ANY (ARRAY['breakfast'::"text", 'lunch'::"text", 'dinner'::"text"]))),
    CONSTRAINT "meal_plans_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."meal_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nearby_attractions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(50),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nearby_attractions_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['restaurant'::character varying, 'attraction'::character varying, 'natural_beauty'::character varying, 'public_transit'::character varying, 'airport'::character varying, 'shopping'::character varying, 'entertainment'::character varying])::"text"[])))
);


ALTER TABLE "public"."nearby_attractions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying(50),
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['booking_confirmation'::character varying, 'reminder'::character varying, 'promotion'::character varying, 'review_request'::character varying, 'cancellation'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_anomalies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_id" "uuid",
    "payment_id" character varying(255),
    "anomaly_type" character varying(50),
    "details" "jsonb",
    "severity" character varying(20) DEFAULT 'medium'::character varying,
    "status" character varying(20) DEFAULT 'pending_review'::character varying,
    "resolution_notes" "text",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_anomalies_anomaly_type_check" CHECK ((("anomaly_type")::"text" = ANY ((ARRAY['amount_mismatch'::character varying, 'duplicate_payment'::character varying, 'refund_failed'::character varying, 'signature_mismatch'::character varying, 'suspicious_activity'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "payment_anomalies_severity_check" CHECK ((("severity")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "payment_anomalies_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending_review'::character varying, 'investigating'::character varying, 'resolved'::character varying, 'false_positive'::character varying])::"text"[])))
);


ALTER TABLE "public"."payment_anomalies" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_anomalies" IS 'Logs payment anomalies for admin review and fraud detection';



CREATE TABLE IF NOT EXISTS "public"."payment_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_id" "uuid",
    "payment_id" "uuid",
    "event_type" character varying(50) NOT NULL,
    "event_source" character varying(50),
    "payload" "jsonb",
    "user_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "success" boolean,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_audit_log" IS 'Complete audit trail of all payment-related events for compliance';



CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(50) NOT NULL,
    "icon_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "payment_reference" character varying(100),
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'INR'::character varying,
    "payment_method_id" "uuid",
    "payment_gateway" character varying(50),
    "transaction_id" character varying(255),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "payment_gateway_order_id" character varying(255),
    "payment_gateway_payment_id" character varying(255),
    "payment_method" character varying(50),
    "refund_amount" numeric(10,2),
    "refund_id" character varying(255),
    "refunded_at" timestamp with time zone,
    "payment_details" "jsonb",
    CONSTRAINT "payments_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'success'::character varying, 'failed'::character varying, 'refunded'::character varying, 'partially_refunded'::character varying])::"text"[])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'Payment transactions with Razorpay integration and refund tracking';



COMMENT ON COLUMN "public"."payments"."payment_gateway_order_id" IS 'Razorpay order ID (order_xxx)';



COMMENT ON COLUMN "public"."payments"."payment_gateway_payment_id" IS 'Razorpay payment ID (pay_xxx) - used for idempotency checks';



CREATE TABLE IF NOT EXISTS "public"."refund_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "payment_id" "uuid",
    "refund_gateway_id" character varying(255),
    "refund_amount" numeric(10,2) NOT NULL,
    "cancellation_charge" numeric(10,2) DEFAULT 0,
    "total_paid" numeric(10,2) NOT NULL,
    "refund_reason" "text",
    "is_full_refund" boolean DEFAULT true,
    "processed_by" character varying(50),
    "status" character varying(20) DEFAULT 'processing'::character varying,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "processed_by_user_id" "uuid",
    "notes" "text",
    "calculated_refund_amount" numeric(10,2),
    "amount_edited_by" "uuid",
    "amount_edit_reason" "text",
    CONSTRAINT "refund_transactions_processed_by_check" CHECK ((("processed_by")::"text" = ANY ((ARRAY['customer'::character varying, 'admin'::character varying, 'system'::character varying])::"text"[]))),
    CONSTRAINT "refund_transactions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."refund_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."refund_transactions" IS 'Tracks all refund transactions with 48-hour cancellation policy enforcement';



COMMENT ON COLUMN "public"."refund_transactions"."is_full_refund" IS 'TRUE for full refund (>48hrs), FALSE for partial/no refund (<48hrs)';



COMMENT ON COLUMN "public"."refund_transactions"."processed_by" IS 'Indicates who initiated the refund: customer, admin, or system';



CREATE OR REPLACE VIEW "public"."payment_reconciliation" AS
 SELECT "b"."booking_reference",
    "b"."total_amount" AS "booking_amount",
    "p"."amount" AS "payment_amount",
    "p"."status" AS "payment_status",
    "p"."payment_gateway_payment_id",
    COALESCE("r"."refund_amount", (0)::numeric) AS "refund_amount",
    "b"."created_at" AS "booking_date",
    "p"."created_at" AS "payment_date",
    "r"."created_at" AS "refund_date"
   FROM (("public"."bookings" "b"
     LEFT JOIN "public"."payments" "p" ON (("p"."booking_id" = "b"."id")))
     LEFT JOIN "public"."refund_transactions" "r" ON (("r"."booking_id" = "b"."id")))
  WHERE ("p"."id" IS NOT NULL)
  ORDER BY "b"."created_at" DESC;


ALTER VIEW "public"."payment_reconciliation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_rules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "valid_from" "date" NOT NULL,
    "valid_to" "date" NOT NULL,
    "price_per_night" numeric(10,2) NOT NULL,
    "min_nights" integer DEFAULT 1,
    "max_nights" integer,
    "day_of_week" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "label" character varying(255),
    "price_type" character varying(20) DEFAULT 'custom'::character varying,
    "created_by" "uuid",
    CONSTRAINT "price_rules_price_type_check" CHECK ((("price_type")::"text" = ANY ((ARRAY['weekend'::character varying, 'festival'::character varying, 'long_weekend'::character varying, 'custom'::character varying])::"text"[])))
);


ALTER TABLE "public"."price_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "full_name" character varying(200) GENERATED ALWAYS AS (
CASE
    WHEN (("first_name" IS NOT NULL) AND ("last_name" IS NOT NULL)) THEN ((("first_name")::"text" || ' '::"text") || ("last_name")::"text")
    WHEN ("first_name" IS NOT NULL) THEN ("first_name")::"text"
    WHEN ("last_name" IS NOT NULL) THEN ("last_name")::"text"
    ELSE NULL::"text"
END) STORED,
    "phone" character varying(20),
    "date_of_birth" "date",
    "nationality" character varying(3),
    "profile_image" "text",
    "bio" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "role" "text",
    "hotel_ids" "jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid",
    "code" character varying(50) NOT NULL,
    "description" "text",
    "discount_type" character varying(20),
    "discount_value" numeric(10,2) NOT NULL,
    "min_booking_amount" numeric(10,2),
    "max_discount" numeric(10,2),
    "valid_from" "date",
    "valid_to" "date",
    "usage_limit" integer,
    "used_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "promotions_discount_type_check" CHECK ((("discount_type")::"text" = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::"text"[])))
);


ALTER TABLE "public"."promotions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."refund_summary" AS
 SELECT "date"("created_at") AS "refund_date",
    "count"(*) AS "total_refunds",
    "sum"("refund_amount") AS "total_refund_amount",
    "sum"("cancellation_charge") AS "total_cancellation_charges",
    "count"(*) FILTER (WHERE "is_full_refund") AS "full_refunds",
    "count"(*) FILTER (WHERE (NOT "is_full_refund")) AS "partial_refunds",
    "count"(*) FILTER (WHERE (("status")::"text" = 'completed'::"text")) AS "completed_refunds",
    "count"(*) FILTER (WHERE (("status")::"text" = 'processing'::"text")) AS "pending_refunds",
    "count"(*) FILTER (WHERE (("status")::"text" = 'failed'::"text")) AS "failed_refunds"
   FROM "public"."refund_transactions" "r"
  GROUP BY ("date"("created_at"))
  ORDER BY ("date"("created_at")) DESC;


ALTER VIEW "public"."refund_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "response_text" "text" NOT NULL,
    "responded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."review_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_availability" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'available'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "room_availability_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['available'::character varying, 'booked'::character varying, 'blocked'::character varying])::"text"[])))
);


ALTER TABLE "public"."room_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_inventory_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "rooms_blocked" integer DEFAULT 1 NOT NULL,
    "reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "room_inventory_blocks_rooms_blocked_check" CHECK (("rooms_blocked" > 0)),
    CONSTRAINT "valid_date_range" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."room_inventory_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_type_amenities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "amenity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_type_amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_type_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "alt_text" character varying(255),
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "storage_path" "text"
);


ALTER TABLE "public"."room_type_images" OWNER TO "postgres";


COMMENT ON COLUMN "public"."room_type_images"."storage_path" IS 'Path to the image file in Supabase Storage (e.g., room-type-id/filename.jpg)';



CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "room_number" character varying(20) NOT NULL,
    "floor" integer,
    "status" character varying(20) DEFAULT 'available'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rooms_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['available'::character varying, 'occupied'::character varying, 'maintenance'::character varying, 'cleaning'::character varying])::"text"[])))
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."special_offers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "badge_text" character varying(100),
    "badge_color" character varying(20),
    "valid_from" "date",
    "valid_to" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."special_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."taxes_and_fees" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "tax_name" character varying(100) NOT NULL,
    "tax_type" character varying(20),
    "tax_value" numeric(10,2) NOT NULL,
    "is_included_in_price" boolean DEFAULT false,
    "valid_from" "date",
    "valid_to" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "taxes_and_fees_tax_type_check" CHECK ((("tax_type")::"text" = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::"text"[])))
);


ALTER TABLE "public"."taxes_and_fees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_time_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_type_id" "uuid" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "label" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trip_time_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_type_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_type_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "storage_path" "text",
    "alt_text" "text" DEFAULT ''::"text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trip_type_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "boat_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "duration_minutes" integer DEFAULT 120 NOT NULL,
    "max_passengers" integer DEFAULT 10 NOT NULL,
    "min_passengers" integer DEFAULT 1 NOT NULL,
    "pricing_model" "text" DEFAULT 'per_person'::"text" NOT NULL,
    "price_per_person" numeric(10,2),
    "price_per_boat" numeric(10,2),
    "child_price_per_person" numeric(10,2),
    "max_trips_per_day" integer DEFAULT 3 NOT NULL,
    "includes_text" "text",
    "what_to_bring_text" "text",
    "free_cancellation_hours" integer DEFAULT 24,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trip_types_pricing_model_check" CHECK (("pricing_model" = ANY (ARRAY['per_person'::"text", 'per_boat'::"text"]))),
    CONSTRAINT "trip_types_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'unavailable'::"text", 'seasonal'::"text"])))
);


ALTER TABLE "public"."trip_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlists" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wishlists" OWNER TO "postgres";


ALTER TABLE ONLY "public"."amenities"
    ADD CONSTRAINT "amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amenity_categories"
    ADD CONSTRAINT "amenity_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_images"
    ADD CONSTRAINT "blog_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blogs"
    ADD CONSTRAINT "blogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blogs"
    ADD CONSTRAINT "blogs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."boat_amenities"
    ADD CONSTRAINT "boat_amenities_boat_id_amenity_id_key" UNIQUE ("boat_id", "amenity_id");



ALTER TABLE ONLY "public"."boat_amenities"
    ADD CONSTRAINT "boat_amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boat_bookings"
    ADD CONSTRAINT "boat_bookings_booking_reference_key" UNIQUE ("booking_reference");



ALTER TABLE ONLY "public"."boat_bookings"
    ADD CONSTRAINT "boat_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boat_images"
    ADD CONSTRAINT "boat_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boat_reviews"
    ADD CONSTRAINT "boat_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boats"
    ADD CONSTRAINT "boats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boats"
    ADD CONSTRAINT "boats_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."booking_meal_plans"
    ADD CONSTRAINT "booking_meal_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_booking_reference_key" UNIQUE ("booking_reference");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cancellation_policies"
    ADD CONSTRAINT "cancellation_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_policies"
    ADD CONSTRAINT "child_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_admin_permissions"
    ADD CONSTRAINT "hotel_admin_permissions_pkey" PRIMARY KEY ("permission_key");



ALTER TABLE ONLY "public"."hotel_amenities"
    ADD CONSTRAINT "hotel_amenities_hotel_id_amenity_id_key" UNIQUE ("hotel_id", "amenity_id");



ALTER TABLE ONLY "public"."hotel_amenities"
    ADD CONSTRAINT "hotel_amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_images"
    ADD CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_languages"
    ADD CONSTRAINT "hotel_languages_hotel_id_language_id_key" UNIQUE ("hotel_id", "language_id");



ALTER TABLE ONLY "public"."hotel_languages"
    ADD CONSTRAINT "hotel_languages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_nearby_attractions"
    ADD CONSTRAINT "hotel_nearby_attractions_hotel_id_attraction_id_key" UNIQUE ("hotel_id", "attraction_id");



ALTER TABLE ONLY "public"."hotel_nearby_attractions"
    ADD CONSTRAINT "hotel_nearby_attractions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_payment_methods"
    ADD CONSTRAINT "hotel_payment_methods_hotel_id_payment_method_id_key" UNIQUE ("hotel_id", "payment_method_id");



ALTER TABLE ONLY "public"."hotel_payment_methods"
    ADD CONSTRAINT "hotel_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_property_highlights"
    ADD CONSTRAINT "hotel_property_highlights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."languages"
    ADD CONSTRAINT "languages_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."languages"
    ADD CONSTRAINT "languages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nearby_attractions"
    ADD CONSTRAINT "nearby_attractions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_anomalies"
    ADD CONSTRAINT "payment_anomalies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_audit_log"
    ADD CONSTRAINT "payment_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_reference_key" UNIQUE ("payment_reference");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "promotions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "promotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refund_transactions"
    ADD CONSTRAINT "refund_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_responses"
    ADD CONSTRAINT "review_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_responses"
    ADD CONSTRAINT "review_responses_review_id_key" UNIQUE ("review_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_availability"
    ADD CONSTRAINT "room_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_availability"
    ADD CONSTRAINT "room_availability_room_id_date_key" UNIQUE ("room_id", "date");



ALTER TABLE ONLY "public"."room_inventory_blocks"
    ADD CONSTRAINT "room_inventory_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_type_amenities"
    ADD CONSTRAINT "room_type_amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_type_amenities"
    ADD CONSTRAINT "room_type_amenities_room_type_id_amenity_id_key" UNIQUE ("room_type_id", "amenity_id");



ALTER TABLE ONLY "public"."room_type_images"
    ADD CONSTRAINT "room_type_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_hotel_id_room_number_key" UNIQUE ("hotel_id", "room_number");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."special_offers"
    ADD CONSTRAINT "special_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."taxes_and_fees"
    ADD CONSTRAINT "taxes_and_fees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_time_slots"
    ADD CONSTRAINT "trip_time_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_type_images"
    ADD CONSTRAINT "trip_type_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_types"
    ADD CONSTRAINT "trip_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_hotel_id_key" UNIQUE ("user_id", "hotel_id");



CREATE INDEX "bookings_booking_reference_idx" ON "public"."bookings" USING "btree" ("booking_reference");



CREATE INDEX "bookings_booking_status_idx" ON "public"."bookings" USING "btree" ("booking_status");



CREATE INDEX "bookings_check_in_date_idx" ON "public"."bookings" USING "btree" ("check_in_date");



CREATE INDEX "bookings_check_out_date_idx" ON "public"."bookings" USING "btree" ("check_out_date");



CREATE INDEX "bookings_created_at_idx" ON "public"."bookings" USING "btree" ("created_at" DESC);



CREATE INDEX "bookings_hotel_id_idx" ON "public"."bookings" USING "btree" ("hotel_id");



CREATE INDEX "bookings_payment_status_idx" ON "public"."bookings" USING "btree" ("payment_status");



CREATE INDEX "bookings_room_type_id_idx" ON "public"."bookings" USING "btree" ("room_type_id");



CREATE INDEX "bookings_user_id_idx" ON "public"."bookings" USING "btree" ("user_id");



CREATE INDEX "idx_blog_images_blog_id" ON "public"."blog_images" USING "btree" ("blog_id");



CREATE INDEX "idx_blogs_author_id" ON "public"."blogs" USING "btree" ("author_id");



CREATE INDEX "idx_blogs_published_at" ON "public"."blogs" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_blogs_slug" ON "public"."blogs" USING "btree" ("slug");



CREATE INDEX "idx_blogs_status" ON "public"."blogs" USING "btree" ("status");



CREATE INDEX "idx_blogs_tags" ON "public"."blogs" USING "gin" ("tags");



CREATE INDEX "idx_boat_amenities_boat_id" ON "public"."boat_amenities" USING "btree" ("boat_id");



CREATE INDEX "idx_boat_bookings_boat_id" ON "public"."boat_bookings" USING "btree" ("boat_id");



CREATE INDEX "idx_boat_bookings_reference" ON "public"."boat_bookings" USING "btree" ("booking_reference");



CREATE INDEX "idx_boat_bookings_status" ON "public"."boat_bookings" USING "btree" ("booking_status");



CREATE INDEX "idx_boat_bookings_trip_date" ON "public"."boat_bookings" USING "btree" ("trip_date");



CREATE INDEX "idx_boat_bookings_trip_slot" ON "public"."boat_bookings" USING "btree" ("trip_type_id", "time_slot_id", "trip_date");



CREATE INDEX "idx_boat_bookings_user_id" ON "public"."boat_bookings" USING "btree" ("user_id");



CREATE INDEX "idx_boat_images_boat_id" ON "public"."boat_images" USING "btree" ("boat_id");



CREATE INDEX "idx_boat_reviews_boat_id" ON "public"."boat_reviews" USING "btree" ("boat_id");



CREATE INDEX "idx_boat_reviews_booking_id" ON "public"."boat_reviews" USING "btree" ("boat_booking_id");



CREATE INDEX "idx_boats_city" ON "public"."boats" USING "btree" ("city");



CREATE INDEX "idx_boats_slug" ON "public"."boats" USING "btree" ("slug");



CREATE INDEX "idx_boats_status" ON "public"."boats" USING "btree" ("status");



CREATE INDEX "idx_booking_meal_plans_booking_id" ON "public"."booking_meal_plans" USING "btree" ("booking_id");



CREATE INDEX "idx_bookings_razorpay_order_id" ON "public"."bookings" USING "btree" ("razorpay_order_id");



CREATE INDEX "idx_bookings_razorpay_payment_id" ON "public"."bookings" USING "btree" ("razorpay_payment_id");



CREATE INDEX "idx_hotels_city" ON "public"."hotels" USING "btree" ("city");



CREATE INDEX "idx_hotels_location" ON "public"."hotels" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_hotels_owner_id" ON "public"."hotels" USING "btree" ("owner_id");



CREATE INDEX "idx_hotels_property_type" ON "public"."hotels" USING "btree" ("property_type");



CREATE INDEX "idx_hotels_slug" ON "public"."hotels" USING "btree" ("slug");



CREATE INDEX "idx_hotels_status" ON "public"."hotels" USING "btree" ("status");



CREATE INDEX "idx_meal_plans_hotel_id" ON "public"."meal_plans" USING "btree" ("hotel_id");



CREATE INDEX "idx_meal_plans_status" ON "public"."meal_plans" USING "btree" ("status");



CREATE INDEX "idx_payment_anomalies_created_at" ON "public"."payment_anomalies" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payment_anomalies_status" ON "public"."payment_anomalies" USING "btree" ("status");



CREATE INDEX "idx_payment_audit_log_booking_id" ON "public"."payment_audit_log" USING "btree" ("booking_id");



CREATE INDEX "idx_payment_audit_log_created_at" ON "public"."payment_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payment_audit_log_event_type" ON "public"."payment_audit_log" USING "btree" ("event_type");



CREATE UNIQUE INDEX "idx_payments_gateway_payment_id" ON "public"."payments" USING "btree" ("payment_gateway_payment_id") WHERE ("payment_gateway_payment_id" IS NOT NULL);



CREATE INDEX "idx_price_rules_dates" ON "public"."price_rules" USING "btree" ("valid_from", "valid_to");



CREATE INDEX "idx_price_rules_room_type" ON "public"."price_rules" USING "btree" ("room_type_id");



CREATE INDEX "idx_refund_transactions_booking_id" ON "public"."refund_transactions" USING "btree" ("booking_id");



CREATE INDEX "idx_refund_transactions_created_at" ON "public"."refund_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_refund_transactions_payment_id" ON "public"."refund_transactions" USING "btree" ("payment_id");



CREATE INDEX "idx_refund_transactions_status" ON "public"."refund_transactions" USING "btree" ("status");



CREATE INDEX "idx_reviews_created_at" ON "public"."reviews" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reviews_hotel_id" ON "public"."reviews" USING "btree" ("hotel_id");



CREATE INDEX "idx_reviews_status" ON "public"."reviews" USING "btree" ("status");



CREATE INDEX "idx_room_availability_room_date" ON "public"."room_availability" USING "btree" ("room_id", "date");



CREATE INDEX "idx_room_availability_status" ON "public"."room_availability" USING "btree" ("status");



CREATE INDEX "idx_room_inventory_blocks_room_type_dates" ON "public"."room_inventory_blocks" USING "btree" ("room_type_id", "start_date", "end_date");



CREATE INDEX "idx_trip_time_slots_trip_type_id" ON "public"."trip_time_slots" USING "btree" ("trip_type_id");



CREATE INDEX "idx_trip_type_images_trip_type_id" ON "public"."trip_type_images" USING "btree" ("trip_type_id");



CREATE INDEX "idx_trip_types_boat_id" ON "public"."trip_types" USING "btree" ("boat_id");



CREATE INDEX "idx_trip_types_status" ON "public"."trip_types" USING "btree" ("status");



CREATE INDEX "profiles_created_at_idx" ON "public"."profiles" USING "btree" ("created_at" DESC);



CREATE INDEX "profiles_full_name_idx" ON "public"."profiles" USING "btree" ("full_name");



CREATE OR REPLACE TRIGGER "calculate_booking_amounts_trigger" BEFORE INSERT OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_booking_amounts"();



CREATE OR REPLACE TRIGGER "payment_audit_trigger" AFTER INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."log_payment_event"();



CREATE OR REPLACE TRIGGER "set_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_blogs_updated_at" BEFORE UPDATE ON "public"."blogs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_child_policies_updated_at" BEFORE UPDATE ON "public"."child_policies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_faqs_updated_at" BEFORE UPDATE ON "public"."faqs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hotels_updated_at" BEFORE UPDATE ON "public"."hotels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_price_rules_updated_at" BEFORE UPDATE ON "public"."price_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_promotions_updated_at" BEFORE UPDATE ON "public"."promotions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_room_types_updated_at" BEFORE UPDATE ON "public"."room_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rooms_updated_at" BEFORE UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."amenities"
    ADD CONSTRAINT "amenities_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."amenity_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."blog_images"
    ADD CONSTRAINT "blog_images_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "public"."blogs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blogs"
    ADD CONSTRAINT "blogs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."boat_amenities"
    ADD CONSTRAINT "boat_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id");



ALTER TABLE ONLY "public"."boat_amenities"
    ADD CONSTRAINT "boat_amenities_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "public"."boats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boat_bookings"
    ADD CONSTRAINT "boat_bookings_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "public"."boats"("id");



ALTER TABLE ONLY "public"."boat_bookings"
    ADD CONSTRAINT "boat_bookings_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "public"."trip_time_slots"("id");



ALTER TABLE ONLY "public"."boat_bookings"
    ADD CONSTRAINT "boat_bookings_trip_type_id_fkey" FOREIGN KEY ("trip_type_id") REFERENCES "public"."trip_types"("id");



ALTER TABLE ONLY "public"."boat_bookings"
    ADD CONSTRAINT "boat_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."boat_images"
    ADD CONSTRAINT "boat_images_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "public"."boats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boat_reviews"
    ADD CONSTRAINT "boat_reviews_boat_booking_id_fkey" FOREIGN KEY ("boat_booking_id") REFERENCES "public"."boat_bookings"("id");



ALTER TABLE ONLY "public"."boat_reviews"
    ADD CONSTRAINT "boat_reviews_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "public"."boats"("id");



ALTER TABLE ONLY "public"."boat_reviews"
    ADD CONSTRAINT "boat_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."boats"
    ADD CONSTRAINT "boats_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."booking_meal_plans"
    ADD CONSTRAINT "booking_meal_plans_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_meal_plans"
    ADD CONSTRAINT "booking_meal_plans_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cancellation_policies"
    ADD CONSTRAINT "cancellation_policies_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancellation_policies"
    ADD CONSTRAINT "cancellation_policies_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_policies"
    ADD CONSTRAINT "child_policies_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_amenities"
    ADD CONSTRAINT "hotel_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_amenities"
    ADD CONSTRAINT "hotel_amenities_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_images"
    ADD CONSTRAINT "hotel_images_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_languages"
    ADD CONSTRAINT "hotel_languages_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_languages"
    ADD CONSTRAINT "hotel_languages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_nearby_attractions"
    ADD CONSTRAINT "hotel_nearby_attractions_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "public"."nearby_attractions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_nearby_attractions"
    ADD CONSTRAINT "hotel_nearby_attractions_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_payment_methods"
    ADD CONSTRAINT "hotel_payment_methods_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_payment_methods"
    ADD CONSTRAINT "hotel_payment_methods_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_property_highlights"
    ADD CONSTRAINT "hotel_property_highlights_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_anomalies"
    ADD CONSTRAINT "payment_anomalies_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_audit_log"
    ADD CONSTRAINT "payment_audit_log_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_audit_log"
    ADD CONSTRAINT "payment_audit_log_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "promotions_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refund_transactions"
    ADD CONSTRAINT "refund_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refund_transactions"
    ADD CONSTRAINT "refund_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."review_responses"
    ADD CONSTRAINT "review_responses_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_responses"
    ADD CONSTRAINT "review_responses_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_availability"
    ADD CONSTRAINT "room_availability_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_inventory_blocks"
    ADD CONSTRAINT "room_inventory_blocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."room_inventory_blocks"
    ADD CONSTRAINT "room_inventory_blocks_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_inventory_blocks"
    ADD CONSTRAINT "room_inventory_blocks_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_type_amenities"
    ADD CONSTRAINT "room_type_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_type_amenities"
    ADD CONSTRAINT "room_type_amenities_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_type_images"
    ADD CONSTRAINT "room_type_images_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."special_offers"
    ADD CONSTRAINT "special_offers_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."taxes_and_fees"
    ADD CONSTRAINT "taxes_and_fees_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_time_slots"
    ADD CONSTRAINT "trip_time_slots_trip_type_id_fkey" FOREIGN KEY ("trip_type_id") REFERENCES "public"."trip_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_type_images"
    ADD CONSTRAINT "trip_type_images_trip_type_id_fkey" FOREIGN KEY ("trip_type_id") REFERENCES "public"."trip_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_types"
    ADD CONSTRAINT "trip_types_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "public"."boats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage boat amenities" ON "public"."boat_amenities" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'hotel_admin'::"text"])));



CREATE POLICY "Admins can manage boat bookings" ON "public"."boat_bookings" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'hotel_admin'::"text"])));



CREATE POLICY "Admins can manage boat images" ON "public"."boat_images" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'hotel_admin'::"text"])));



CREATE POLICY "Admins can manage boat reviews" ON "public"."boat_reviews" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'hotel_admin'::"text"])));



CREATE POLICY "Admins can manage boats" ON "public"."boats" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'hotel_admin'::"text"])));



CREATE POLICY "Admins can manage meal plans" ON "public"."meal_plans" USING (("public"."is_super_admin"() OR ("public"."is_hotel_admin"() AND (("hotel_id")::"text" = ANY (ARRAY( SELECT "jsonb_array_elements_text"((("auth"."jwt"() -> 'user_metadata'::"text") -> 'hotel_ids'::"text")) AS "jsonb_array_elements_text"))))));



CREATE POLICY "Admins can manage trip time slots" ON "public"."trip_time_slots" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'hotel_admin'::"text"])));



CREATE POLICY "Admins can manage trip type images" ON "public"."trip_type_images" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'hotel_admin'::"text"])));



CREATE POLICY "Admins can manage trip types" ON "public"."trip_types" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'hotel_admin'::"text"])));



CREATE POLICY "Admins can read all booking meal plans" ON "public"."booking_meal_plans" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all refund transactions" ON "public"."refund_transactions" USING ("public"."is_super_admin"());



CREATE POLICY "Anyone can read active meal plans" ON "public"."meal_plans" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Only admins can access payment anomalies" ON "public"."payment_anomalies" USING ("public"."is_super_admin"());



CREATE POLICY "Only admins can access payment audit log" ON "public"."payment_audit_log" USING ("public"."is_super_admin"());



CREATE POLICY "Public can read active boats" ON "public"."boats" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Public can read approved boat reviews" ON "public"."boat_reviews" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "Public can read boat amenities" ON "public"."boat_amenities" FOR SELECT USING (true);



CREATE POLICY "Public can read boat images" ON "public"."boat_images" FOR SELECT USING (true);



CREATE POLICY "Public can read trip time slots" ON "public"."trip_time_slots" FOR SELECT USING (true);



CREATE POLICY "Public can read trip type images" ON "public"."trip_type_images" FOR SELECT USING (true);



CREATE POLICY "Public can read trip types" ON "public"."trip_types" FOR SELECT USING (true);



CREATE POLICY "Service role can insert booking meal plans" ON "public"."booking_meal_plans" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can add to own wishlist" ON "public"."wishlists" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own bookings" ON "public"."bookings" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert boat bookings" ON "public"."boat_bookings" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert boat reviews" ON "public"."boat_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can read own boat bookings" ON "public"."boat_bookings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own booking meal plans" ON "public"."booking_meal_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "booking_meal_plans"."booking_id") AND ("bookings"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can remove from own wishlist" ON "public"."wishlists" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own boat bookings" ON "public"."boat_bookings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own bookings" ON "public"."bookings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own bookings" ON "public"."bookings" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own refund transactions" ON "public"."refund_transactions" FOR SELECT USING (("booking_id" IN ( SELECT "bookings"."id"
   FROM "public"."bookings"
  WHERE ("bookings"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own wishlist" ON "public"."wishlists" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."blog_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blog_images_public_view" ON "public"."blog_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."blogs"
  WHERE (("blogs"."id" = "blog_images"."blog_id") AND (("blogs"."status")::"text" = 'published'::"text")))));



CREATE POLICY "blog_images_super_admin_all" ON "public"."blog_images" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



ALTER TABLE "public"."blogs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blogs_public_view" ON "public"."blogs" FOR SELECT USING ((("status")::"text" = 'published'::"text"));



CREATE POLICY "blogs_super_admin_all" ON "public"."blogs" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



ALTER TABLE "public"."boat_amenities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boat_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boat_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boat_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_meal_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_admin_own_hotel" ON "public"."bookings" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "bookings"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"()));



CREATE POLICY "bookings_hotel_admin_update" ON "public"."bookings" FOR UPDATE USING (("public"."is_hotel_admin"() AND (EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "bookings"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "bookings_super_admin_all" ON "public"."bookings" FOR SELECT USING ("public"."is_super_admin"());



CREATE POLICY "bookings_super_admin_update" ON "public"."bookings" FOR UPDATE USING ("public"."is_super_admin"());



CREATE POLICY "bookings_user_own" ON "public"."bookings" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."hotel_amenities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hotel_amenities_admin_own" ON "public"."hotel_amenities" USING (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "hotel_amenities"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "hotel_amenities"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"()));



CREATE POLICY "hotel_amenities_public_view" ON "public"."hotel_amenities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "hotel_amenities"."hotel_id") AND (("hotels"."status")::"text" = 'active'::"text")))));



CREATE POLICY "hotel_amenities_super_admin_all" ON "public"."hotel_amenities" USING ("public"."is_super_admin"());



ALTER TABLE "public"."hotel_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hotel_images_admin_own" ON "public"."hotel_images" USING (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "hotel_images"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "hotel_images"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"()));



CREATE POLICY "hotel_images_public_view" ON "public"."hotel_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "hotel_images"."hotel_id") AND (("hotels"."status")::"text" = 'active'::"text")))));



CREATE POLICY "hotel_images_super_admin_all" ON "public"."hotel_images" USING ("public"."is_super_admin"());



ALTER TABLE "public"."hotels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hotels_admin_own" ON "public"."hotels" USING ((("owner_id" = "auth"."uid"()) AND "public"."is_hotel_admin"())) WITH CHECK ((("owner_id" = "auth"."uid"()) AND "public"."is_hotel_admin"()));



CREATE POLICY "hotels_public_view" ON "public"."hotels" FOR SELECT USING ((("status")::"text" = 'active'::"text"));



CREATE POLICY "hotels_super_admin_all" ON "public"."hotels" USING ("public"."is_super_admin"());



ALTER TABLE "public"."meal_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_anomalies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_admin_own_hotel" ON "public"."payments" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."bookings"
     JOIN "public"."hotels" ON (("hotels"."id" = "bookings"."hotel_id")))
  WHERE (("bookings"."id" = "payments"."booking_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"()));



CREATE POLICY "payments_super_admin_all" ON "public"."payments" FOR SELECT USING ("public"."is_super_admin"());



CREATE POLICY "payments_user_own" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "payments"."booking_id") AND ("bookings"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_update_all" ON "public"."profiles" FOR UPDATE USING ("public"."is_super_admin"());



CREATE POLICY "profiles_admin_view_all" ON "public"."profiles" FOR SELECT USING ("public"."is_super_admin"());



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_view_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."refund_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_type_amenities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_type_amenities_admin_own" ON "public"."room_type_amenities" USING (((EXISTS ( SELECT 1
   FROM ("public"."room_types"
     JOIN "public"."hotels" ON (("hotels"."id" = "room_types"."hotel_id")))
  WHERE (("room_types"."id" = "room_type_amenities"."room_type_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."room_types"
     JOIN "public"."hotels" ON (("hotels"."id" = "room_types"."hotel_id")))
  WHERE (("room_types"."id" = "room_type_amenities"."room_type_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"()));



CREATE POLICY "room_type_amenities_public_view" ON "public"."room_type_amenities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."room_types"
     JOIN "public"."hotels" ON (("hotels"."id" = "room_types"."hotel_id")))
  WHERE (("room_types"."id" = "room_type_amenities"."room_type_id") AND (("hotels"."status")::"text" = 'active'::"text") AND (("room_types"."status")::"text" = 'available'::"text")))));



CREATE POLICY "room_type_amenities_super_admin_all" ON "public"."room_type_amenities" USING ("public"."is_super_admin"());



ALTER TABLE "public"."room_type_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_type_images_admin_own" ON "public"."room_type_images" USING (((EXISTS ( SELECT 1
   FROM ("public"."room_types"
     JOIN "public"."hotels" ON (("hotels"."id" = "room_types"."hotel_id")))
  WHERE (("room_types"."id" = "room_type_images"."room_type_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."room_types"
     JOIN "public"."hotels" ON (("hotels"."id" = "room_types"."hotel_id")))
  WHERE (("room_types"."id" = "room_type_images"."room_type_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"()));



CREATE POLICY "room_type_images_public_view" ON "public"."room_type_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."room_types"
     JOIN "public"."hotels" ON (("hotels"."id" = "room_types"."hotel_id")))
  WHERE (("room_types"."id" = "room_type_images"."room_type_id") AND (("hotels"."status")::"text" = 'active'::"text") AND (("room_types"."status")::"text" = 'available'::"text")))));



CREATE POLICY "room_type_images_super_admin_all" ON "public"."room_type_images" USING ("public"."is_super_admin"());



ALTER TABLE "public"."room_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_types_admin_own" ON "public"."room_types" USING (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "room_types"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "room_types"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"()));



CREATE POLICY "room_types_public_view" ON "public"."room_types" FOR SELECT USING (((("status")::"text" = 'available'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "room_types"."hotel_id") AND (("hotels"."status")::"text" = 'active'::"text"))))));



CREATE POLICY "room_types_super_admin_all" ON "public"."room_types" USING ("public"."is_super_admin"());



ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rooms_admin_own" ON "public"."rooms" USING (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "rooms"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "rooms"."hotel_id") AND ("hotels"."owner_id" = "auth"."uid"())))) AND "public"."is_hotel_admin"()));



CREATE POLICY "rooms_public_view" ON "public"."rooms" FOR SELECT USING (((("status")::"text" = 'available'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "rooms"."hotel_id") AND (("hotels"."status")::"text" = 'active'::"text"))))));



CREATE POLICY "rooms_super_admin_all" ON "public"."rooms" USING ("public"."is_super_admin"());



ALTER TABLE "public"."trip_time_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_type_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_types" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_booking_amounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_booking_amounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_booking_amounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_blog_slug"("title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_blog_slug"("title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_blog_slug"("title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_booking_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_booking_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_booking_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_blogs_with_author"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_blogs_with_author"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_blogs_with_author"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_hotel_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_hotel_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_hotel_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_payment_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_payment_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_payment_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."amenities" TO "anon";
GRANT ALL ON TABLE "public"."amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."amenities" TO "service_role";



GRANT ALL ON TABLE "public"."amenity_categories" TO "anon";
GRANT ALL ON TABLE "public"."amenity_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."amenity_categories" TO "service_role";



GRANT ALL ON TABLE "public"."blog_images" TO "anon";
GRANT ALL ON TABLE "public"."blog_images" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_images" TO "service_role";



GRANT ALL ON TABLE "public"."blogs" TO "anon";
GRANT ALL ON TABLE "public"."blogs" TO "authenticated";
GRANT ALL ON TABLE "public"."blogs" TO "service_role";



GRANT ALL ON TABLE "public"."blogs_with_author" TO "anon";
GRANT ALL ON TABLE "public"."blogs_with_author" TO "authenticated";
GRANT ALL ON TABLE "public"."blogs_with_author" TO "service_role";



GRANT ALL ON TABLE "public"."boat_amenities" TO "anon";
GRANT ALL ON TABLE "public"."boat_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."boat_amenities" TO "service_role";



GRANT ALL ON TABLE "public"."boat_bookings" TO "anon";
GRANT ALL ON TABLE "public"."boat_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."boat_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."boat_images" TO "anon";
GRANT ALL ON TABLE "public"."boat_images" TO "authenticated";
GRANT ALL ON TABLE "public"."boat_images" TO "service_role";



GRANT ALL ON TABLE "public"."boat_reviews" TO "anon";
GRANT ALL ON TABLE "public"."boat_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."boat_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."boats" TO "anon";
GRANT ALL ON TABLE "public"."boats" TO "authenticated";
GRANT ALL ON TABLE "public"."boats" TO "service_role";



GRANT ALL ON TABLE "public"."booking_meal_plans" TO "anon";
GRANT ALL ON TABLE "public"."booking_meal_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_meal_plans" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."cancellation_policies" TO "anon";
GRANT ALL ON TABLE "public"."cancellation_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."cancellation_policies" TO "service_role";



GRANT ALL ON TABLE "public"."child_policies" TO "anon";
GRANT ALL ON TABLE "public"."child_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."child_policies" TO "service_role";



GRANT ALL ON TABLE "public"."faqs" TO "anon";
GRANT ALL ON TABLE "public"."faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."faqs" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_admin_permissions" TO "anon";
GRANT ALL ON TABLE "public"."hotel_admin_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_admin_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_amenities" TO "anon";
GRANT ALL ON TABLE "public"."hotel_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_amenities" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_images" TO "anon";
GRANT ALL ON TABLE "public"."hotel_images" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_images" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_languages" TO "anon";
GRANT ALL ON TABLE "public"."hotel_languages" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_languages" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_nearby_attractions" TO "anon";
GRANT ALL ON TABLE "public"."hotel_nearby_attractions" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_nearby_attractions" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."hotel_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_property_highlights" TO "anon";
GRANT ALL ON TABLE "public"."hotel_property_highlights" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_property_highlights" TO "service_role";



GRANT ALL ON TABLE "public"."hotels" TO "anon";
GRANT ALL ON TABLE "public"."hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."hotels" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."room_types" TO "anon";
GRANT ALL ON TABLE "public"."room_types" TO "authenticated";
GRANT ALL ON TABLE "public"."room_types" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_summary" TO "anon";
GRANT ALL ON TABLE "public"."hotel_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_summary" TO "service_role";



GRANT ALL ON TABLE "public"."languages" TO "anon";
GRANT ALL ON TABLE "public"."languages" TO "authenticated";
GRANT ALL ON TABLE "public"."languages" TO "service_role";



GRANT ALL ON TABLE "public"."meal_plans" TO "anon";
GRANT ALL ON TABLE "public"."meal_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_plans" TO "service_role";



GRANT ALL ON TABLE "public"."nearby_attractions" TO "anon";
GRANT ALL ON TABLE "public"."nearby_attractions" TO "authenticated";
GRANT ALL ON TABLE "public"."nearby_attractions" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payment_anomalies" TO "anon";
GRANT ALL ON TABLE "public"."payment_anomalies" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_anomalies" TO "service_role";



GRANT ALL ON TABLE "public"."payment_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."payment_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."refund_transactions" TO "anon";
GRANT ALL ON TABLE "public"."refund_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."payment_reconciliation" TO "anon";
GRANT ALL ON TABLE "public"."payment_reconciliation" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_reconciliation" TO "service_role";



GRANT ALL ON TABLE "public"."price_rules" TO "anon";
GRANT ALL ON TABLE "public"."price_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."price_rules" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."promotions" TO "anon";
GRANT ALL ON TABLE "public"."promotions" TO "authenticated";
GRANT ALL ON TABLE "public"."promotions" TO "service_role";



GRANT ALL ON TABLE "public"."refund_summary" TO "anon";
GRANT ALL ON TABLE "public"."refund_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_summary" TO "service_role";



GRANT ALL ON TABLE "public"."review_responses" TO "anon";
GRANT ALL ON TABLE "public"."review_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."review_responses" TO "service_role";



GRANT ALL ON TABLE "public"."room_availability" TO "anon";
GRANT ALL ON TABLE "public"."room_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."room_availability" TO "service_role";



GRANT ALL ON TABLE "public"."room_inventory_blocks" TO "anon";
GRANT ALL ON TABLE "public"."room_inventory_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."room_inventory_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."room_type_amenities" TO "anon";
GRANT ALL ON TABLE "public"."room_type_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."room_type_amenities" TO "service_role";



GRANT ALL ON TABLE "public"."room_type_images" TO "anon";
GRANT ALL ON TABLE "public"."room_type_images" TO "authenticated";
GRANT ALL ON TABLE "public"."room_type_images" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON TABLE "public"."special_offers" TO "anon";
GRANT ALL ON TABLE "public"."special_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."special_offers" TO "service_role";



GRANT ALL ON TABLE "public"."taxes_and_fees" TO "anon";
GRANT ALL ON TABLE "public"."taxes_and_fees" TO "authenticated";
GRANT ALL ON TABLE "public"."taxes_and_fees" TO "service_role";



GRANT ALL ON TABLE "public"."trip_time_slots" TO "anon";
GRANT ALL ON TABLE "public"."trip_time_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_time_slots" TO "service_role";



GRANT ALL ON TABLE "public"."trip_type_images" TO "anon";
GRANT ALL ON TABLE "public"."trip_type_images" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_type_images" TO "service_role";



GRANT ALL ON TABLE "public"."trip_types" TO "anon";
GRANT ALL ON TABLE "public"."trip_types" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_types" TO "service_role";



GRANT ALL ON TABLE "public"."wishlists" TO "anon";
GRANT ALL ON TABLE "public"."wishlists" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlists" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































