'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Star, Building2, Ship } from '@/components/icons'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import Image from 'next/image'

interface ReviewCardProps {
  review: {
    id: string
    overall_rating: number
    title?: string | null
    comment?: string | null
    image_urls?: string[] | null
    created_at: string
    property_name: string
    property_type: 'hotel' | 'boat'
  }
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const stars = review.overall_rating / 2 // Convert 0-10 → 0-5

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* Header: Rating + Property */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(stars)
                      ? 'fill-gold text-gold'
                      : 'text-muted'
                  }`}
                />
              ))}
              <span className="text-sm font-medium ml-1">{stars.toFixed(1)}</span>
            </div>
            <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
              {review.property_type === 'hotel' ? (
                <Building2 className="h-3 w-3" />
              ) : (
                <Ship className="h-3 w-3" />
              )}
              {review.property_name}
            </Badge>
          </div>

          {/* Title */}
          {review.title && (
            <p className="font-semibold text-sm text-foreground">{review.title}</p>
          )}

          {/* Comment */}
          {review.comment && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
              {review.comment}
            </p>
          )}

          {/* Photos */}
          {review.image_urls && review.image_urls.length > 0 && (
            <div className="flex gap-2">
              {review.image_urls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className="relative w-24 h-24 rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxUrl(url)}
                >
                  <Image
                    src={url}
                    alt={`Review photo ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Date */}
          <p className="text-xs text-muted-foreground">
            {format(new Date(review.created_at), 'MMM dd, yyyy')}
          </p>
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="sm:max-w-2xl p-2">
          <DialogTitle className="sr-only">Review photo</DialogTitle>
          {lightboxUrl && (
            <div className="relative w-full aspect-4/3">
              <Image
                src={lightboxUrl}
                alt="Review photo"
                fill
                className="object-contain rounded-lg"
                sizes="(max-width: 672px) 100vw, 672px"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
