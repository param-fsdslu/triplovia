-- =====================================================
-- Complete Storage Setup: Buckets + Policies
-- Run this in your NEW Supabase project's SQL Editor
-- Matches the old project's storage policies exactly
-- =====================================================

-- RLS is already enabled on storage.objects by default in Supabase

-- =====================================================
-- Create All Buckets
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('hotel-images', 'hotel-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('room-images', 'room-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('boat-images', 'boat-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('trip-images', 'trip-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('blog-images', 'blog-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('review-images', 'review-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- =====================================================
-- Hotel Images Policies
-- =====================================================

CREATE POLICY "Public Access to Hotel Images"
ON storage.objects FOR SELECT USING (bucket_id = 'hotel-images');

CREATE POLICY "Admin Upload Hotel Images"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hotel-images');

CREATE POLICY "Admin Update Hotel Images"
ON storage.objects FOR UPDATE USING (bucket_id = 'hotel-images');

CREATE POLICY "Admin Delete Hotel Images"
ON storage.objects FOR DELETE USING (bucket_id = 'hotel-images');

-- =====================================================
-- Room Images Policies
-- =====================================================

CREATE POLICY "Public Access to Room Images"
ON storage.objects FOR SELECT USING (bucket_id = 'room-images');

CREATE POLICY "Admin Upload Room Images"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'room-images');

CREATE POLICY "Admin Update Room Images"
ON storage.objects FOR UPDATE USING (bucket_id = 'room-images');

CREATE POLICY "Admin Delete Room Images"
ON storage.objects FOR DELETE USING (bucket_id = 'room-images');

-- =====================================================
-- Boat Images Policies
-- =====================================================

CREATE POLICY "Public Access to Boat Images"
ON storage.objects FOR SELECT USING (bucket_id = 'boat-images');

CREATE POLICY "Admin Upload Boat Images"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'boat-images');

CREATE POLICY "Admin Update Boat Images"
ON storage.objects FOR UPDATE USING (bucket_id = 'boat-images');

CREATE POLICY "Admin Delete Boat Images"
ON storage.objects FOR DELETE USING (bucket_id = 'boat-images');

-- =====================================================
-- Trip Images Policies
-- =====================================================

CREATE POLICY "Public Access to Trip Images"
ON storage.objects FOR SELECT USING (bucket_id = 'trip-images');

CREATE POLICY "Admin Upload Trip Images"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'trip-images');

CREATE POLICY "Admin Update Trip Images"
ON storage.objects FOR UPDATE USING (bucket_id = 'trip-images');

CREATE POLICY "Admin Delete Trip Images"
ON storage.objects FOR DELETE USING (bucket_id = 'trip-images');

-- =====================================================
-- Blog Images Policies (with auth.role() check like old project)
-- =====================================================

CREATE POLICY "Public Access to Blog Images"
ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Admin Upload Blog Images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admin Delete Blog Images"
ON storage.objects FOR DELETE
USING (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admin Update Blog Images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'blog-images' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

-- =====================================================
-- Review Images Policies
-- =====================================================

CREATE POLICY "Public Access to Review Images"
ON storage.objects FOR SELECT USING (bucket_id = 'review-images');

CREATE POLICY "Authenticated Upload Review Images"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'review-images');

CREATE POLICY "Authenticated Update Review Images"
ON storage.objects FOR UPDATE USING (bucket_id = 'review-images');

CREATE POLICY "Authenticated Delete Review Images"
ON storage.objects FOR DELETE USING (bucket_id = 'review-images');

-- =====================================================
-- Verify: run this after to confirm
-- =====================================================
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
