'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StarRating } from './StarRating'
import { CategoryRating } from './CategoryRating'
import { ReviewImageUpload } from './ReviewImageUpload'
import { submitBoatReview } from '@/lib/actions/boat-reviews'
import { uploadUserImage } from '@/lib/actions/uploads'
import { BoatReview } from '@/lib/types'
import {
  Shield,
  Users,
  Compass,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from '@/components/icons'

interface BoatReviewDialogProps {
  booking: {
    id: string
    booking_reference: string
    boat: {
      id: string
      name: string
    }
    trip_date: string
  }
  existingReview?: BoatReview | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BoatReviewDialog({
  booking,
  existingReview,
  open,
  onOpenChange,
}: BoatReviewDialogProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    overallRating: 0,
    safetyRating: 0,
    crewRating: 0,
    experienceRating: 0,
    valueRating: 0,
    title: '',
    comment: '',
  })
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showCategories, setShowCategories] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.overallRating) {
      setError('Overall rating is required')
      return
    }

    setIsSubmitting(true)

    // Upload images to Firebase Storage
    const imageUrls: string[] = []
    for (const file of images) {
      const formData = new FormData()
      formData.append('file', file)
      const uploaded = await uploadUserImage('review-images', formData)

      if (!uploaded.url) {
        setError(uploaded.error === 'You must be logged in' ? uploaded.error : 'Failed to upload image. Please try again.')
        setIsSubmitting(false)
        return
      }

      imageUrls.push(uploaded.url)
    }

    const result = await submitBoatReview({
      bookingId: booking.id,
      boatId: booking.boat.id,
      overallRating: formData.overallRating,
      safetyRating: formData.safetyRating || undefined,
      crewRating: formData.crewRating || undefined,
      experienceRating: formData.experienceRating || undefined,
      valueRating: formData.valueRating || undefined,
      title: formData.title || undefined,
      comment: formData.comment || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    })

    if (result.success) {
      onOpenChange(false)
      router.refresh()
    } else {
      setError(result.error || 'Failed to submit review')
    }

    setIsSubmitting(false)
  }

  // Read-only mode if review exists
  if (existingReview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Your Review</DialogTitle>
            <DialogDescription>
              You&apos;ve already reviewed this trip
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Badge
              variant={
                existingReview.status === 'approved' ? 'default' : 'secondary'
              }
            >
              {existingReview.status.charAt(0).toUpperCase() +
                existingReview.status.slice(1)}
            </Badge>

            <div>
              <Label>Overall Rating</Label>
              <StarRating
                value={existingReview.overall_rating / 2}
                readonly
                showValue
                size="lg"
              />
            </div>

            {existingReview.title && (
              <div>
                <Label>Title</Label>
                <p className="text-sm mt-1">{existingReview.title}</p>
              </div>
            )}

            {existingReview.comment && (
              <div>
                <Label>Review</Label>
                <p className="text-sm text-foreground/80 mt-1">
                  {existingReview.comment}
                </p>
              </div>
            )}

            {existingReview.image_urls && existingReview.image_urls.length > 0 && (
              <ReviewImageUpload
                images={[]}
                onImagesChange={() => {}}
                existingUrls={existingReview.image_urls}
              />
            )}

            <p className="text-xs text-muted-foreground">
              Submitted on {format(new Date(existingReview.created_at), 'MMM dd, yyyy')}
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Write review form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience on {booking.boat.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Booking Summary Card */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold">{booking.boat.name}</p>
              <p className="text-sm text-muted-foreground">
                Trip Date: {format(new Date(booking.trip_date), 'MMM dd, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">
                Ref: {booking.booking_reference}
              </p>
            </div>

            {/* Overall Rating Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Overall Rating <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <StarRating
                  value={formData.overallRating}
                  onChange={(val) =>
                    setFormData({ ...formData, overallRating: val })
                  }
                  size="lg"
                  showValue
                />
              </div>
              <p className="text-xs text-muted-foreground">
                How would you rate your overall experience?
              </p>
            </div>

            {/* Category Ratings Section (Collapsible) */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                {showCategories ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {showCategories ? 'Hide' : 'Show'} detailed ratings (optional)
              </button>

              {showCategories && (
                <div className="space-y-1 pt-2 border rounded-lg p-3">
                  <CategoryRating
                    label="Safety"
                    icon={<Shield className="h-4 w-4" />}
                    value={formData.safetyRating}
                    onChange={(val) =>
                      setFormData({ ...formData, safetyRating: val })
                    }
                  />
                  <CategoryRating
                    label="Crew"
                    icon={<Users className="h-4 w-4" />}
                    value={formData.crewRating}
                    onChange={(val) =>
                      setFormData({ ...formData, crewRating: val })
                    }
                  />
                  <CategoryRating
                    label="Experience"
                    icon={<Compass className="h-4 w-4" />}
                    value={formData.experienceRating}
                    onChange={(val) =>
                      setFormData({ ...formData, experienceRating: val })
                    }
                  />
                  <CategoryRating
                    label="Value for Money"
                    icon={<DollarSign className="h-4 w-4" />}
                    value={formData.valueRating}
                    onChange={(val) =>
                      setFormData({ ...formData, valueRating: val })
                    }
                  />
                </div>
              )}
            </div>

            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title">Review Title (Optional)</Label>
              <Input
                id="title"
                placeholder="Sum up your trip in a few words"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.title.length}/100
              </p>
            </div>

            {/* Comment Field */}
            <div className="space-y-2">
              <Label htmlFor="comment">Your Review (Optional)</Label>
              <Textarea
                id="comment"
                placeholder="Share your experience on the trip..."
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
                maxLength={1000}
                rows={5}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.comment.length}/1000
              </p>
            </div>

            {/* Photo Upload */}
            <ReviewImageUpload
              images={images}
              onImagesChange={setImages}
              disabled={isSubmitting}
            />

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.overallRating}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
