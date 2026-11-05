import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getAllBlogs, getBlogStats } from '@/lib/actions/blogs'
import { BlogsTable } from '@/components/admin/BlogsTable'
import { Button } from '@/components/ui/button'
import { FileText, Plus } from '@/components/icons'
import Link from 'next/link'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatCard } from '@/components/admin/StatCard'

export const metadata = {
  title: 'Blog Management - Admin Dashboard',
  description: 'Manage blog posts and content',
}

export default async function BlogsPage() {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect(ADMIN_PATH)
  }

  // Get blogs and stats
  const { blogs, error } = await getAllBlogs()
  const { stats } = await getBlogStats()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blog Management"
        icon={FileText}
        description="Create and manage blog posts"
        actions={
          <Link href={`${ADMIN_PATH}/blogs/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Blog Post
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Blogs" value={stats.totalBlogs} />
        <StatCard label="Published" value={stats.publishedBlogs} tone="success" toneValue />
        <StatCard label="Drafts" value={stats.draftBlogs} tone="warning" toneValue />
        <StatCard label="Total Views" value={stats.totalViews.toLocaleString()} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading blogs</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Blogs Table */}
      <BlogsTable blogs={blogs} />
    </div>
  )
}
