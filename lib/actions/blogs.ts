'use server'

/**
 * Blog management server actions (super_admin only).
 *
 * Content is authored using Tiptap rich text editor and stored as HTML.
 * Slugs are auto-generated from the title with collision handling.
 * Author info is joined via the get_blogs_with_author RPC (lib/db/rpc.ts), which
 * reads author emails from the auth_users collection.
 *
 * Status lifecycle: draft → published → archived.
 * published_at is set when status changes to 'published'.
 * city: optional, the city the post is about (lib/utils/blog-city.ts).
 */
import { createClient } from '@/lib/db/server'
import { requireSuperAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { blogCities, cleanCity } from '@/lib/utils/blog-city'
import { serverLog } from '@/lib/utils/server-log'
import { diffChanges, summarizeChanges, logActivity } from '@/lib/services/activity-log.service'

/** Blog lifecycle status. Once archived, a blog is hidden but not deleted. */
export type BlogStatus = 'draft' | 'published' | 'archived'

/** Full blog record as stored in the blogs table. */
export interface Blog {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  featured_image: string | null
  author_id: string
  status: BlogStatus
  published_at: string | null
  meta_title: string | null
  meta_description: string | null
  tags: string[] | null
  city: string | null
  view_count: number
  created_at: string
  updated_at: string
}

/**
 * Get all blogs (admin only)
 */
export async function getAllBlogs(filters?: {
  status?: BlogStatus
  search?: string
  page?: number
  limit?: number
}) {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    // Get all blogs with author email using RPC function
    const { data: allBlogs, error } = await db.rpc('get_blogs_with_author')

    if (error) {
      throw new Error(error.message)
    }

    let blogs = allBlogs || []

    // Apply filters in JavaScript
    if (filters?.status) {
      blogs = blogs.filter((blog: any) => blog.status === filters.status)
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      blogs = blogs.filter((blog: any) =>
        blog.title?.toLowerCase().includes(searchLower) ||
        blog.excerpt?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by created_at descending
    blogs.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Calculate pagination
    const total = blogs.length
    const paginatedBlogs = blogs.slice(offset, offset + limit)

    return {
      success: true,
      blogs: paginatedBlogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching blogs:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch blogs',
      blogs: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  }
}

/**
 * Get single blog by ID
 */
export async function getBlogById(id: string) {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    // Get all blogs with author email using RPC function
    const { data: blogs, error } = await db.rpc('get_blogs_with_author')

    if (error) {
      throw new Error(error.message)
    }

    // Find the specific blog by ID
    const blog = blogs?.find((b: any) => b.id === id)

    if (!blog) {
      throw new Error('Blog not found')
    }

    return {
      success: true,
      blog,
    }
  } catch (error: any) {
    serverLog.error('Error fetching blog:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch blog',
      blog: null,
    }
  }
}

/**
 * Generate unique slug from title
 */
async function generateSlug(title: string, excludeId?: string): Promise<string> {
  const db = await createClient()

  // Convert to URL-friendly slug
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  // Check if slug exists
  let counter = 0
  let finalSlug = slug

  while (true) {
    let query = db
      .from('blogs')
      .select('id')
      .eq('slug', finalSlug)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query.single()

    if (!data) break

    counter++
    finalSlug = `${slug}-${counter}`
  }

  return finalSlug
}

/**
 * Create new blog post
 */
export async function createBlog(data: {
  title: string
  excerpt?: string
  content: string
  featured_image?: string
  status: BlogStatus
  meta_title?: string
  meta_description?: string
  tags?: string[]
  city?: string | null
}) {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    // Get current user
    const { data: { user } } = await db.auth.getUser()
    if (!user) throw new Error('User not found')

    // Generate slug from title
    const slug = await generateSlug(data.title)

    // Set published_at if publishing
    const published_at = data.status === 'published' ? new Date().toISOString() : null

    const { data: blog, error } = await db
      .from('blogs')
      .insert({
        title: data.title,
        slug,
        excerpt: data.excerpt || null,
        content: data.content,
        featured_image: data.featured_image || null,
        author_id: user.id,
        status: data.status,
        published_at,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        tags: data.tags || null,
        city: cleanCity(data.city),
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/blogs`)
    revalidatePath('/blog')

    await logActivity({
      entity: 'blog',
      action: 'created',
      entityId: blog.id,
      label: blog.title,
      summary: `${blog.status === 'published' ? 'Published' : 'Drafted'} the post “${blog.title}”`,
      href: `/blogs/${blog.id}/edit`,
    })

    return {
      success: true,
      message: 'Blog created successfully',
      blog,
    }
  } catch (error: any) {
    serverLog.error('Error creating blog:', error)
    return {
      success: false,
      error: error.message || 'Failed to create blog',
    }
  }
}

/**
 * Update existing blog post
 */
export async function updateBlog(
  id: string,
  data: {
    title?: string
    excerpt?: string
    content?: string
    featured_image?: string
    status?: BlogStatus
    meta_title?: string
    meta_description?: string
    tags?: string[]
    /** null clears it */
    city?: string | null
  }
) {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    // Get current blog
    const { data: currentBlog } = await db
      .from('blogs')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentBlog) {
      throw new Error('Blog not found')
    }

    const updateData: any = { ...data }
    if (data.city !== undefined) updateData.city = cleanCity(data.city)

    // Generate new slug if title changed
    if (data.title && data.title !== currentBlog.title) {
      updateData.slug = await generateSlug(data.title, id)
    }

    // Set published_at if publishing for first time
    if (data.status === 'published' && currentBlog.status !== 'published' && !currentBlog.published_at) {
      updateData.published_at = new Date().toISOString()
    }

    const { data: blog, error } = await db
      .from('blogs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/blogs`)
    revalidatePath('/blog')
    revalidatePath(`/blog/${blog.slug}`)

    const statusChanged = data.status && data.status !== currentBlog.status
    const changes = diffChanges(currentBlog, blog, { keys: Object.keys(updateData) })
    const fields = summarizeChanges(changes)
    if (changes.length) await logActivity({
      changes,
      entity: 'blog',
      action: statusChanged ? 'status' : 'updated',
      entityId: blog.id,
      label: blog.title,
      summary: statusChanged
        ? `${data.status === 'published' ? 'Published' : data.status === 'archived' ? 'Archived' : 'Moved to drafts'} “${blog.title}”`
        : `Edited “${blog.title}”${fields ? `: ${fields}` : ''}`,
      href: `/blogs/${blog.id}/edit`,
    })

    return {
      success: true,
      message: 'Blog updated successfully',
      blog,
    }
  } catch (error: any) {
    serverLog.error('Error updating blog:', error)
    return {
      success: false,
      error: error.message || 'Failed to update blog',
    }
  }
}

/**
 * Delete blog post
 */
export async function deleteBlog(id: string) {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    // Get blog to delete associated images
    const { data: blog } = await db
      .from('blogs')
      .select('featured_image, slug, title')
      .eq('id', id)
      .single()

    if (!blog) {
      throw new Error('Blog not found')
    }

    // Delete blog (cascade will delete blog_images)
    const { error } = await db
      .from('blogs')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    // TODO: Delete images from storage bucket

    revalidatePath(`${ADMIN_PATH}/blogs`)
    revalidatePath('/blog')

    await logActivity({
      entity: 'blog',
      action: 'deleted',
      entityId: id,
      label: blog.title,
      summary: `Deleted the post “${blog.title || blog.slug}”`,
    })

    return {
      success: true,
      message: 'Blog deleted successfully',
    }
  } catch (error: any) {
    serverLog.error('Error deleting blog:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete blog',
    }
  }
}

/**
 * Upload blog image to storage
 */
export async function uploadBlogImage(formData: FormData) {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    const file = formData.get('file') as File
    if (!file) {
      throw new Error('No file provided')
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `blog-images/${fileName}`

    // Upload to storage
    const { data, error } = await db.storage
      .from('blog-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      throw new Error(error.message)
    }

    // Get public URL
    const { data: { publicUrl } } = db.storage
      .from('blog-images')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
      path: filePath,
    }
  } catch (error: any) {
    serverLog.error('Error uploading image:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    }
  }
}

/**
 * City suggestions for the blog form: cities with hotels first (the names the search uses),
 * then cities already given to posts
 */
export async function getBlogCityOptions(): Promise<string[]> {
  try {
    await requireSuperAdmin()
    const db = await createClient()
    const [{ data: hotels }, { data: blogs }] = await Promise.all([
      db.from('hotels').select('city'),
      db.from('blogs').select('city'),
    ])
    const names = [...blogCities(hotels ?? []), ...blogCities(blogs ?? [])].map((c) => c.name)
    const seen = new Set<string>()
    return names.filter((name) => {
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch (error) {
    serverLog.error('Error fetching blog city options:', error)
    return []
  }
}

/**
 * Get blog statistics
 */
export async function getBlogStats() {
  try {
    await requireSuperAdmin()
    const db = await createClient()

    // Get total blogs
    const { count: totalBlogs } = await db
      .from('blogs')
      .select('*', { count: 'exact', head: true })

    // Get published blogs
    const { count: publishedBlogs } = await db
      .from('blogs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    // Get draft blogs
    const { count: draftBlogs } = await db
      .from('blogs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft')

    // Get total views
    const { data: viewsData } = await db
      .from('blogs')
      .select('view_count')

    const totalViews = viewsData?.reduce((sum, blog) => sum + (blog.view_count || 0), 0) || 0

    return {
      success: true,
      stats: {
        totalBlogs: totalBlogs || 0,
        publishedBlogs: publishedBlogs || 0,
        draftBlogs: draftBlogs || 0,
        totalViews,
      },
    }
  } catch (error: any) {
    serverLog.error('Error fetching blog stats:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch blog statistics',
      stats: {
        totalBlogs: 0,
        publishedBlogs: 0,
        draftBlogs: 0,
        totalViews: 0,
      },
    }
  }
}
