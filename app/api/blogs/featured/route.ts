import { createClient } from '@/lib/db/server'
import { NextResponse } from 'next/server'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { cleanCity, sameCity } from '@/lib/utils/blog-city'

/**
 * Latest published posts. `?city=` keeps only that city's posts (none when it has none);
 * `?general=1` only posts about no particular city.
 */
const handler = async (request: Request) => {
  try {
    const db = await createClient()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6')
    const city = searchParams.get('city')
    const general = searchParams.get('general') === '1'

    const { data: blogs, error } = await db
      .from('blogs')
      .select('id, title, slug, excerpt, featured_image, published_at, view_count, tags, city')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error) {
      throw error
    }

    const posts = (blogs || []).filter((blog: any) =>
      city ? sameCity(blog.city, city) : general ? !cleanCity(blog.city) : true
    )
    return NextResponse.json(posts.slice(0, limit))
  } catch (error: any) {
    console.error('Error fetching featured blogs:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export const GET = withApiLogging(handler, 'blogs/featured')
