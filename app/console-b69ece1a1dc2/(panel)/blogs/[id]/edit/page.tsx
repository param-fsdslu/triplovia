import { redirect, notFound } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getBlogById, getBlogCityOptions } from '@/lib/actions/blogs'
import { BlogForm } from '@/components/admin/BlogForm'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ADMIN_PATH } from '@/lib/config/admin-path'

export const metadata = {
  title: 'Edit Blog Post - Admin Dashboard',
  description: 'Edit blog post',
}

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect(ADMIN_PATH)
  }

  // Await params (Next.js 15 requirement)
  const { id } = await params

  // Get blog data
  const [{ blog, error }, cityOptions] = await Promise.all([getBlogById(id), getBlogCityOptions()])

  if (error || !blog) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Edit Blog Post"
        description="Update your blog post content"
        backHref={`${ADMIN_PATH}/blogs`}
        backLabel="Back to Blogs"
      />

      {/* Blog Form */}
      <BlogForm blog={blog} cityOptions={cityOptions} />
    </div>
  )
}
