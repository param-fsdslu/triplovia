-- =====================================================
-- Create Function to Get Blogs with Author Email
-- =====================================================
-- Description: Creates a secure function that returns blogs with author email
-- This uses SECURITY DEFINER to bypass RLS and access auth.users
-- Created: 2026-01-15
-- =====================================================

-- Create function to get blogs with author email (SECURITY DEFINER allows access to auth.users)
CREATE OR REPLACE FUNCTION get_blogs_with_author()
RETURNS TABLE (
    id UUID,
    title VARCHAR(500),
    slug VARCHAR(500),
    excerpt TEXT,
    content TEXT,
    featured_image TEXT,
    author_id UUID,
    status VARCHAR(20),
    published_at TIMESTAMP WITH TIME ZONE,
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    tags TEXT[],
    view_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    author_email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_blogs_with_author() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_blogs_with_author() IS 'Returns all blogs with author email for admin dashboard';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
