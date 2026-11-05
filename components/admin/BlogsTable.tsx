'use client'

import { useState } from 'react'
import { Eye, Edit, Trash2, MoreVertical, CheckCircle, Clock, Archive, FileText, Plus, MapPin } from '@/components/icons'
import { ExportButtons } from './ExportButtons'
import type { ExportColumn } from '@/lib/utils/export'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteBlog } from '@/lib/actions/blogs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { BlogStatus } from '@/lib/actions/blogs'
import { ADMIN_PATH } from '@/lib/config/admin-path'

interface Blog {
  id: string
  title: string
  slug: string
  status: BlogStatus
  city?: string | null
  view_count: number
  published_at: string | null
  created_at: string
  author: { email: string } | null
}

interface BlogsTableProps {
  blogs: Blog[]
}

export function BlogsTable({ blogs }: BlogsTableProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (blog: Blog) => {
    setSelectedBlog(blog)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedBlog) return

    setIsDeleting(true)
    const result = await deleteBlog(selectedBlog.id)

    if (result.success) {
      setDeleteDialogOpen(false)
      setSelectedBlog(null)
      router.refresh()
    } else {
      alert(result.error || 'Failed to delete blog')
    }
    setIsDeleting(false)
  }

  const getStatusBadge = (status: BlogStatus) => {
    const statusMap = {
      published: { label: 'Published', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
      draft: { label: 'Draft', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
      archived: { label: 'Archived', icon: Archive, className: 'bg-muted text-foreground' },
    }

    const config = statusMap[status]
    const Icon = config.icon

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const exportColumns: ExportColumn[] = [
    { header: 'Title', accessor: 'title' },
    { header: 'Status', accessor: 'status' },
    { header: 'City', accessor: (r: any) => r.city || '' },
    { header: 'Author', accessor: (r: any) => r.author?.email || 'Unknown' },
    { header: 'Views', accessor: 'view_count' },
    { header: 'Published At', accessor: (r: any) => r.published_at ? formatDate(r.published_at) : 'Not published' },
  ]

  if (blogs.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No blog posts yet</h3>
        <p className="text-muted-foreground mb-4">Create your first blog post to get started.</p>
        <Link href={`${ADMIN_PATH}/blogs/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Blog Post
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <ExportButtons rows={blogs} columns={exportColumns} filenamePrefix="blogs" title="Blog Posts" />
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Published
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {blogs.map((blog) => (
                <tr key={blog.id} className="hover:bg-muted/60">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground">{blog.title}</div>
                    <div className="text-sm text-muted-foreground">/blog/{blog.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(blog.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {blog.city ? (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {blog.city}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">General</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {blog.author?.email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {blog.view_count.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(blog.published_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {blog.status === 'published' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/blog/${blog.slug}`} target="_blank">
                              <Eye className="h-4 w-4 mr-2" />
                              View Post
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`${ADMIN_PATH}/blogs/${blog.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Blog
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(blog)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Blog
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedBlog?.title}</strong>? This action
              cannot be undone. The blog post and all its images will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Blog'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
