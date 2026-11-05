-- =====================================================
-- COPY AND RUN THIS ENTIRE FILE IN SUPABASE DASHBOARD
-- =====================================================
-- Go to: https://supabase.com/dashboard
-- Navigate to: SQL Editor → New Query
-- Paste this entire file and click "Run"
-- =====================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create Blog Images Bucket (if not exists)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- =====================================================
-- Blog Images Bucket Policies
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access to Blog Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Blog Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Blog Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Blog Images" ON storage.objects;

-- Allow public read access for blog images
CREATE POLICY "Public Access to Blog Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'blog-images' );

-- Allow authenticated users to upload blog images
CREATE POLICY "Admin Upload Blog Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete blog images
CREATE POLICY "Admin Delete Blog Images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update blog images
CREATE POLICY "Admin Update Blog Images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-images' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'blog-images' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- VERIFICATION (Optional - Run separately to check)
-- =====================================================
-- SELECT * FROM storage.buckets WHERE id = 'blog-images';
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%Blog Images%';
