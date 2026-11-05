-- =====================================================
-- Blog System - Database Schema
-- =====================================================
-- Description: Blog posts with rich text content and images
-- Created: 2025-01-15
-- =====================================================

-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    tags TEXT[], -- Array of tags
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_images table (for images used in blog content)
CREATE TABLE IF NOT EXISTS blog_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    alt_text VARCHAR(255),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_blogs_slug ON blogs(slug);
CREATE INDEX idx_blogs_status ON blogs(status);
CREATE INDEX idx_blogs_published_at ON blogs(published_at DESC);
CREATE INDEX idx_blogs_author_id ON blogs(author_id);
CREATE INDEX idx_blogs_tags ON blogs USING GIN(tags);
CREATE INDEX idx_blog_images_blog_id ON blog_images(blog_id);

-- Create updated_at trigger
CREATE TRIGGER update_blogs_updated_at
    BEFORE UPDATE ON blogs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE blogs IS 'Blog posts with rich text content';
COMMENT ON COLUMN blogs.status IS 'Post status: draft, published, or archived';
COMMENT ON COLUMN blogs.slug IS 'URL-friendly identifier for the blog post';
COMMENT ON COLUMN blogs.content IS 'Rich text HTML content from editor';
COMMENT ON COLUMN blogs.featured_image IS 'Main image URL for the blog post';
COMMENT ON COLUMN blogs.tags IS 'Array of tags for categorization';

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_images ENABLE ROW LEVEL SECURITY;

-- Public can view published blogs
CREATE POLICY blogs_public_view ON blogs
    FOR SELECT
    USING (status = 'published');

-- Super admins can do everything
CREATE POLICY blogs_super_admin_all ON blogs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

-- Blog images: public can view
CREATE POLICY blog_images_public_view ON blog_images
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM blogs
            WHERE blogs.id = blog_images.blog_id
            AND blogs.status = 'published'
        )
    );

-- Blog images: super admins can manage
CREATE POLICY blog_images_super_admin_all ON blog_images
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

-- =====================================================
-- Storage Bucket for Blog Images
-- =====================================================

-- Insert blog-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for blog images
CREATE POLICY "Public can view blog images"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "Super admins can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'blog-images'
    AND auth.uid() IN (
        SELECT id FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'super_admin'
    )
);

CREATE POLICY "Super admins can update blog images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'blog-images'
    AND auth.uid() IN (
        SELECT id FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'super_admin'
    )
);

CREATE POLICY "Super admins can delete blog images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'blog-images'
    AND auth.uid() IN (
        SELECT id FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'super_admin'
    )
);

-- =====================================================
-- Helper Function: Generate Slug
-- =====================================================

CREATE OR REPLACE FUNCTION generate_blog_slug(title TEXT)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
