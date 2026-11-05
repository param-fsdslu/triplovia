'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RichTextEditor } from './RichTextEditor'
import { createBlog, updateBlog, uploadBlogImage, type Blog, type BlogStatus } from '@/lib/actions/blogs'
import { Save, Eye, ImageIcon, X, MapPin } from '@/components/icons'
import Image from 'next/image'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { cleanCity, sameCity } from '@/lib/utils/blog-city'

interface BlogFormProps {
  blog?: Blog
  /** Suggestions for the City field (cities with hotels, then cities on other posts) */
  cityOptions?: string[]
}

export function BlogForm({ blog, cityOptions = [] }: BlogFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: blog?.title || '',
    excerpt: blog?.excerpt || '',
    content: blog?.content || '',
    featured_image: blog?.featured_image || '',
    status: (blog?.status || 'draft') as BlogStatus,
    meta_title: blog?.meta_title || '',
    meta_description: blog?.meta_description || '',
    tags: blog?.tags?.join(', ') || '',
    city: blog?.city || '',
  })

  // A typed city that matches a suggestion takes its spelling, so posts and hotels share one name
  const canonicalCity = (value: string) => cityOptions.find((option) => sameCity(option, value)) ?? cleanCity(value)

  const handleSubmit = async (e: React.FormEvent, status?: BlogStatus) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const submitData = {
      city: canonicalCity(formData.city),
      title: formData.title,
      excerpt: formData.excerpt || undefined,
      content: formData.content,
      featured_image: formData.featured_image || undefined,
      status: status || formData.status,
      meta_title: formData.meta_title || undefined,
      meta_description: formData.meta_description || undefined,
      tags: formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : undefined,
    }

    let result
    if (blog) {
      result = await updateBlog(blog.id, submitData)
    } else {
      result = await createBlog(submitData)
    }

    if (result.success) {
      router.push(`${ADMIN_PATH}/blogs`)
      router.refresh()
    } else {
      setError(result.error || 'Failed to save blog')
    }

    setIsSubmitting(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadBlogImage(formData)

    if (result.success && result.url) {
      setFormData((prev) => ({ ...prev, featured_image: result.url! }))
    } else {
      setError(result.error || 'Failed to upload image')
    }

    setImageUploading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white border rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter blog post title"
                  required
                  className="text-2xl font-bold"
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Short description of the blog post"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Brief summary shown in blog listings
                </p>
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-white border rounded-lg p-6">
            <Label className="mb-2 block">Content *</Label>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Start writing your blog post..."
            />
          </div>
        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Publish Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: BlogStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.title || !formData.content}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : blog ? 'Update' : 'Save Draft'}
                </Button>
                {formData.status !== 'published' && (
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, 'published')}
                    disabled={isSubmitting || !formData.title || !formData.content}
                    variant="default"
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Publish
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Featured Image</h3>
            <div className="space-y-4">
              {formData.featured_image ? (
                <div className="relative">
                  <Image
                    src={formData.featured_image}
                    alt="Featured image"
                    width={400}
                    height={200}
                    className="w-full h-auto rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData({ ...formData, featured_image: '' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {imageUploading ? 'Uploading...' : 'No image selected'}
                  </p>
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">Max size: 5MB</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </h3>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                list="blog-city-options"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                onBlur={() => setFormData((prev) => ({ ...prev, city: canonicalCity(prev.city) ?? '' }))}
                placeholder="e.g. Honnavar"
                autoComplete="off"
                maxLength={80}
              />
              <datalist id="blog-city-options">
                {cityOptions.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground mt-1">
                Guests who pick this city in the search (or on the Journal page) see this post. Leave empty for a
                general post.
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Tags</h3>
            <div>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="travel, tips, guide"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate tags with commas</p>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder="SEO title"
                  maxLength={200}
                />
              </div>
              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  placeholder="SEO description"
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
