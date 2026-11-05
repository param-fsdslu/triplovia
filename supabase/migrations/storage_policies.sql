-- =====================================================
-- Storage Policies for Hotel and Room Images
-- =====================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Hotel Images Bucket Policies
-- =====================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public Access to Hotel Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Hotel Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Hotel Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Hotel Images" ON storage.objects;

-- Allow public read access for hotel images
CREATE POLICY "Public Access to Hotel Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'hotel-images' );

-- Allow authenticated admins to upload hotel images
CREATE POLICY "Admin Upload Hotel Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hotel-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated admins to delete hotel images
CREATE POLICY "Admin Delete Hotel Images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hotel-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated admins to update hotel images
CREATE POLICY "Admin Update Hotel Images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'hotel-images' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'hotel-images' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- Room Images Bucket Policies
-- =====================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public Access to Room Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Room Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Room Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Room Images" ON storage.objects;

-- Allow public read access for room images
CREATE POLICY "Public Access to Room Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'room-images' );

-- Allow authenticated admins to upload room images
CREATE POLICY "Admin Upload Room Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'room-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated admins to delete room images
CREATE POLICY "Admin Delete Room Images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'room-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated admins to update room images
CREATE POLICY "Admin Update Room Images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'room-images' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'room-images' AND
  auth.role() = 'authenticated'
);

-- =====================================================
-- Verify Policies
-- =====================================================

-- You can verify the policies by running:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
