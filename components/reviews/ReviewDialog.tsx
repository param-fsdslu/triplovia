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
import { submitReview } from '@/lib/actions/reviews'
import { uploadUserImage } from '@/lib/actions/uploads'
import { Review } from '@/lib/types'
import {
  Users,
  Building,
  Sparkles,
  Bed,
  DollarSign,
  MapPin,
  Wifi,
  ChevronDown,
  ChevronUp,
} from '@/components/icons'

interface ReviewDialogProps {
  booking: {
    id: string
    booking_reference: string
    hotel: {
      id: string
      name: string
    }
    check_in_date: string
    check_out_date: string
  }
  existingReview?: Review | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReviewDialog({
  booking,
  existingReview,
  open,
  onOpenChange,
}: ReviewDialogProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    overallRating: 0,
    staffRating: 0,
    facilitiesRating: 0,
    cleanlinessRating: 0,
    comfortRating: 0,
    valueRating: 0,
    locationRating: 0,
    freeWifiRating: 0,
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

    // Upload images to Firebase Storage (all in parallel)
    const imageUrls: string[] = []
    if (images.length > 0) {
      const uploads = await Promise.all(
        images.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          return uploadUserImage('review-images', formData)
        })
      )

      const failed = uploads.find((u) => !u.url)
      if (failed) {
        setError(failed.error === 'You must be logged in' ? failed.error : 'Failed to upload one or more images. Please try again.')
        setIsSubmitting(false)
        return
      }
      imageUrls.push(...uploads.map((u) => u.url as string))
    }

    const result = await submitReview({
      bookingId: booking.id,
      hotelId: booking.hotel.id,
      overallRating: formData.overallRating,
      staffRating: formData.staffRating || undefined,
      facilitiesRating: formData.facilitiesRating || undefined,
      cleanlinessRating: formData.cleanlinessRating || undefined,
      comfortRating: formData.comfortRating || undefined,
      valueRating: formData.valueRating || undefined,
      locationRating: formData.locationRating || undefined,
      freeWifiRating: formData.freeWifiRating || undefined,
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
              You've already reviewed this stay
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
              Share your experience at {booking.hotel.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Booking Summary Card */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold">{booking.hotel.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(booking.check_in_date), 'MMM dd, yyyy')} -{' '}
                {format(new Date(booking.check_out_date), 'MMM dd, yyyy')}
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
                    label="Staff"
                    icon={<Users className="h-4 w-4" />}
                    value={formData.staffRating}
                    onChange={(val) =>
                      setFormData({ ...formData, staffRating: val })
                    }
                  />
                  <CategoryRating
                    label="Facilities"
                    icon={<Building className="h-4 w-4" />}
                    value={formData.facilitiesRating}
                    onChange={(val) =>
                      setFormData({ ...formData, facilitiesRating: val })
                    }
                  />
                  <CategoryRating
                    label="Cleanliness"
                    icon={<Sparkles className="h-4 w-4" />}
                    value={formData.cleanlinessRating}
                    onChange={(val) =>
                      setFormData({ ...formData, cleanlinessRating: val })
                    }
                  />
                  <CategoryRating
                    label="Comfort"
                    icon={<Bed className="h-4 w-4" />}
                    value={formData.comfortRating}
                    onChange={(val) =>
                      setFormData({ ...formData, comfortRating: val })
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
                  <CategoryRating
                    label="Location"
                    icon={<MapPin className="h-4 w-4" />}
                    value={formData.locationRating}
                    onChange={(val) =>
                      setFormData({ ...formData, locationRating: val })
                    }
                  />
                  <CategoryRating
                    label="Free WiFi"
                    icon={<Wifi className="h-4 w-4" />}
                    value={formData.freeWifiRating}
                    onChange={(val) =>
                      setFormData({ ...formData, freeWifiRating: val })
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
                placeholder="Sum up your stay in a few words"
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
                placeholder="Share your experience..."
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
