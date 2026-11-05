-- Fix missing RLS on 3 high-risk tables
-- 1. wishlists: has policies but RLS was never enabled (policies are currently ignored!)
-- 2. hotel_admin_permissions: admin-only config table exposed to all
-- 3. notifications: user-specific data exposed to all

-- ============================================================
-- 1. WISHLISTS — just enable RLS (policies already exist)
-- ============================================================
ALTER TABLE "public"."wishlists" ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. HOTEL_ADMIN_PERMISSIONS — super_admin full access,
--    all admins can read (for permission checks)
-- ============================================================
ALTER TABLE "public"."hotel_admin_permissions" ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage permissions"
  ON "public"."hotel_admin_permissions"
  USING ("public"."is_super_admin"())
  WITH CHECK ("public"."is_super_admin"());

-- All admin roles can read (needed for isHotelAdminPermissionEnabled checks)
CREATE POLICY "Admins can read permissions"
  ON "public"."hotel_admin_permissions"
  FOR SELECT
  USING ("public"."is_admin"());


-- ============================================================
-- 3. NOTIFICATIONS — users see own, admins see all
-- ============================================================
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON "public"."notifications"
  FOR SELECT
  USING ("auth"."uid"() = "user_id");

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON "public"."notifications"
  FOR UPDATE
  USING ("auth"."uid"() = "user_id")
  WITH CHECK ("auth"."uid"() = "user_id");

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON "public"."notifications"
  FOR SELECT
  USING ("public"."is_super_admin"());

-- Admins can insert notifications (e.g. system-generated)
CREATE POLICY "Admins can insert notifications"
  ON "public"."notifications"
  FOR INSERT
  WITH CHECK ("public"."is_super_admin"());
