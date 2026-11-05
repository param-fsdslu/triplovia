import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { BlogForm } from '@/components/admin/BlogForm'
import { getBlogCityOptions } from '@/lib/actions/blogs'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ADMIN_PATH } from '@/lib/config/admin-path'

export const metadata = {
  title: 'Create Blog Post - Admin Dashboard',
  description: 'Create a new blog post',
}

export default async function NewBlogPage() {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect(ADMIN_PATH)
  }

  const cityOptions = await getBlogCityOptions()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Create Blog Post"
        description="Write and publish a new blog post"
        backHref={`${ADMIN_PATH}/blogs`}
        backLabel="Back to Blogs"
      />

      {/* Blog Form */}
      <BlogForm cityOptions={cityOptions} />
    </div>
  )
}
