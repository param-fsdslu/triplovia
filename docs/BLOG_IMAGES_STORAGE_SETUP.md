# Blog Images Storage Setup

This guide explains how to set up the blog images storage bucket and RLS policies in Supabase.

## Problem

When uploading images in the blog editor, you may encounter the error:
```
Error: new row violates row-level security policy
```

This happens because the `blog-images` storage bucket doesn't have the necessary RLS (Row Level Security) policies configured.

## Solution

### Option 1: Run Migration via Supabase CLI

If you have Supabase CLI installed and linked to your project:

```bash
# Navigate to your project root
cd d:\2025\honnavar-travels

# Run the migration
npx supabase db push
```

This will apply all pending migrations including the blog images storage policies.

### Option 2: Run Migration via Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Open the migration file: `supabase/migrations/add_blog_images_storage_policies.sql`
5. Copy the entire SQL content
6. Paste it into the SQL Editor
7. Click **Run** to execute the migration

### Option 3: Manual Setup via Dashboard UI

If you prefer to set up the bucket and policies manually:

#### Step 1: Create the Bucket

1. Go to **Storage** in the Supabase Dashboard
2. Click **New bucket**
3. Configure:
   - **Name**: `blog-images`
   - **Public bucket**: ✅ Enabled
   - **File size limit**: 5 MB (5242880 bytes)
   - **Allowed MIME types**: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`
4. Click **Create bucket**

#### Step 2: Add RLS Policies

Navigate to **Storage** → **Policies** → Select `blog-images` bucket → **New policy**

**Policy 1: Public Read Access**
- Name: `Public Access to Blog Images`
- Target: `SELECT`
- Policy definition: `bucket_id = 'blog-images'`

**Policy 2: Admin Upload**
- Name: `Admin Upload Blog Images`
- Target: `INSERT`
- Policy definition: `bucket_id = 'blog-images' AND auth.role() = 'authenticated'`

**Policy 3: Admin Delete**
- Name: `Admin Delete Blog Images`
- Target: `DELETE`
- Policy definition: `bucket_id = 'blog-images' AND auth.role() = 'authenticated'`

**Policy 4: Admin Update**
- Name: `Admin Update Blog Images`
- Target: `UPDATE`
- Policy definition: `bucket_id = 'blog-images' AND auth.role() = 'authenticated'`

## Verification

After applying the migration or manual setup:

1. Navigate to `/admin/blogs/new` or edit an existing blog
2. Try uploading an image using the image button in the rich text editor
3. The image should upload successfully and display in the editor

You can also verify the policies in SQL Editor:

```sql
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%Blog Images%';
```

## Troubleshooting

### Issue: Still getting RLS policy error

1. Verify the bucket exists:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'blog-images';
   ```

2. Verify policies are active:
   ```sql
   SELECT * FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename = 'objects'
     AND policyname LIKE '%Blog%';
   ```

3. Check user authentication:
   - Make sure you're logged in as a super admin
   - Verify your session is valid

### Issue: Images upload but don't display

1. Check if the bucket is set to **public**
2. Verify the image URL is accessible by opening it in a new browser tab
3. Check browser console for CORS or loading errors

## Related Files

- Migration: `supabase/migrations/add_blog_images_storage_policies.sql`
- Upload Function: `lib/actions/blogs.ts` (uploadBlogImage function)
- RTE Component: `components/admin/RichTextEditor.tsx`

## Security Notes

- The current policies allow any authenticated user to upload blog images
- To restrict to super admins only, you can add role checks in the policies:
  ```sql
  WITH CHECK (
    bucket_id = 'blog-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  )
  ```
- Consider implementing cleanup for unused images
- Monitor storage usage and set appropriate limits
