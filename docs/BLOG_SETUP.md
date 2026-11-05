# Blog System Setup Instructions

## Step 1: Install Required Packages

Run the following command to install Tiptap editor and its extensions:

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-underline @tiptap/extension-color @tiptap/extension-text-style
```

## Step 2: Apply Database Migration

Run the blog migration to create the necessary tables:

```bash
# If using Supabase CLI
supabase db push

# Or manually run in Supabase SQL Editor
# File: supabase/migrations/create_blog_tables.sql
```

## Step 3: Verify Storage Bucket

The migration creates a `blog-images` storage bucket. Verify it exists:

1. Go to Supabase Dashboard → Storage
2. Check for `blog-images` bucket
3. Verify it's public

## Step 4: Test the Blog System

1. Login as super admin
2. Navigate to `/admin/blogs`
3. Click "Create Blog Post"
4. Test the rich text editor
5. Upload images
6. Publish blog

## Packages Installed

- `@tiptap/react` - React wrapper for Tiptap
- `@tiptap/starter-kit` - Basic editor features (bold, italic, headings, etc.)
- `@tiptap/extension-image` - Image support
- `@tiptap/extension-link` - Hyperlink support
- `@tiptap/extension-placeholder` - Placeholder text
- `@tiptap/extension-text-align` - Text alignment
- `@tiptap/extension-underline` - Underline text
- `@tiptap/extension-color` - Text color
- `@tiptap/extension-text-style` - Text styling

## Features

✅ Rich text editing with Tiptap
✅ Image upload to Supabase storage
✅ Draft and publish functionality
✅ SEO metadata (title, description)
✅ Tags support
✅ Featured image
✅ Slug generation
✅ View counter
✅ Super admin only access

## Next Steps

After installation, the blog system will be fully functional at `/admin/blogs`.
