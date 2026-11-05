# Supabase Storage Setup Guide

This guide will help you set up Supabase Storage buckets for hotel and room type images.

## Prerequisites

- Supabase project created
- Admin access to Supabase dashboard

## Step 1: Create Storage Buckets

### Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Create the first bucket:
   - **Name**: `hotel-images`
   - **Public bucket**: ✅ Enabled (check this box)
   - **Allowed MIME types**: Leave empty or set to `image/jpeg, image/png, image/webp`
   - **File size limit**: `5242880` (5MB in bytes)
   - Click **"Create bucket"**

5. Create the second bucket:
   - **Name**: `room-images`
   - **Public bucket**: ✅ Enabled (check this box)
   - **Allowed MIME types**: Leave empty or set to `image/jpeg, image/png, image/webp`
   - **File size limit**: `5242880` (5MB in bytes)
   - Click **"Create bucket"**

### Via SQL (Alternative Method)

If you prefer using SQL, run these commands in the Supabase SQL Editor:

```sql
-- Create hotel-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-images',
  'hotel-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create room-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-images',
  'room-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;
```

## Step 2: Set Up Storage Policies

### For `hotel-images` bucket:

```sql
-- Allow public read access for hotel images
CREATE POLICY "Public Access to Hotel Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'hotel-images' );

-- Allow authenticated admins to upload hotel images
CREATE POLICY "Admin Upload Hotel Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hotel-images' AND
  auth.jwt() ->> 'role' = 'authenticated' AND
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Allow authenticated admins to delete hotel images
CREATE POLICY "Admin Delete Hotel Images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hotel-images' AND
  auth.jwt() ->> 'role' = 'authenticated' AND
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
```

### For `room-images` bucket:

```sql
-- Allow public read access for room images
CREATE POLICY "Public Access to Room Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'room-images' );

-- Allow authenticated admins to upload room images
CREATE POLICY "Admin Upload Room Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'room-images' AND
  auth.jwt() ->> 'role' = 'authenticated' AND
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Allow authenticated admins to delete room images
CREATE POLICY "Admin Delete Room Images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'room-images' AND
  auth.jwt() ->> 'role' = 'authenticated' AND
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
```

## Step 3: Run Database Migration

Run the migration to add `storage_path` columns to image tables:

```bash
npx supabase db push
```

Or manually run the SQL:

```sql
-- Add storage_path column to hotel_images table
ALTER TABLE hotel_images
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add storage_path column to room_type_images table
ALTER TABLE room_type_images
ADD COLUMN IF NOT EXISTS storage_path TEXT;
```

## Step 4: Verify Setup

### Check Buckets

1. Go to **Storage** in Supabase dashboard
2. You should see two buckets:
   - `hotel-images` (Public)
   - `room-images` (Public)

### Test Upload

1. Log in to your application as an admin
2. Go to **Admin > Hotels**
3. Edit a hotel and go to the **Images** tab
4. Click **"Upload Image"**
5. Select an image file (JPEG, PNG, or WebP, under 5MB)
6. Fill in alt text (optional)
7. Click **"Upload Image"**

If successful, you should see:
- The image appears in the gallery
- The image URL starts with your Supabase project URL
- The image loads properly

### Verify in Storage Dashboard

1. Go to **Storage** > `hotel-images` in Supabase dashboard
2. You should see folders for each hotel ID
3. Inside each folder, you'll find the uploaded images

## Folder Structure

Images are organized by entity ID:

```
hotel-images/
├── hotel-uuid-1/
│   ├── 1234567890-abc123.jpg
│   └── 1234567891-def456.webp
└── hotel-uuid-2/
    └── 1234567892-ghi789.png

room-images/
├── room-type-uuid-1/
│   ├── 1234567893-jkl012.jpg
│   └── 1234567894-mno345.png
└── room-type-uuid-2/
    └── 1234567895-pqr678.webp
```

## Image Specifications

- **Allowed formats**: JPEG, JPG, PNG, WebP
- **Maximum size**: 5MB per image
- **Recommended dimensions**:
  - Hotel images: 1920×1080px (16:9 aspect ratio)
  - Room images: 1600×900px (16:9 aspect ratio)
- **Recommended optimization**: Use tools like TinyPNG or ImageOptim before uploading

## Troubleshooting

### "Failed to upload image" Error

**Possible causes**:
1. Storage buckets not created
2. Storage policies not set up correctly
3. User is not authenticated as admin
4. File size exceeds 5MB
5. Invalid file type

**Solutions**:
- Verify buckets exist in Supabase dashboard
- Check storage policies are applied
- Ensure user has admin role in `user_metadata`
- Compress images before uploading
- Only use JPEG, PNG, or WebP formats

### Images Not Displaying

**Possible causes**:
1. Bucket is not public
2. CORS issues
3. Invalid image URL

**Solutions**:
- Ensure bucket has "Public bucket" enabled
- Check browser console for CORS errors
- Verify image URL format in database

### Permission Denied Errors

**Cause**: Storage policies not allowing uploads/deletes

**Solution**: Re-run the storage policy SQL commands above

## Cleanup Old URLs

If you have existing hotels with external image URLs and want to migrate them to Supabase Storage:

1. Download the external images
2. Upload them using the admin panel
3. The old URLs will remain in `image_url` for backwards compatibility
4. New uploads will have both `image_url` and `storage_path`

The delete function automatically handles both:
- New images: Deletes from Supabase Storage using `storage_path`
- Old images: Attempts to extract path from `image_url` for cleanup

## Next Steps

Once storage is set up:

1. ✅ Upload hotel images via admin panel
2. ✅ Upload room type images via admin panel
3. ✅ Images are automatically deleted from storage when removed from database
4. ✅ All images are publicly accessible via CDN URLs
5. ✅ Organized folder structure for easy management
