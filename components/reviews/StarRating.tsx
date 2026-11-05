'use client'

import { Star } from '@/components/icons'
import { useState } from 'react'

interface StarRatingProps {
  value: number // 0-5
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  required?: boolean
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            readonly ? '' : 'cursor-pointer'
          } transition-colors`}
          fill={star <= (hoverValue || value) ? '#D8AA68' : 'none'}
          stroke={star <= (hoverValue || value) ? '#D8AA68' : '#E2E9E5'}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          onClick={() => !readonly && onChange?.(star)}
        />
      ))}
      {showValue && (
        <span className="text-sm text-muted-foreground ml-2">{value}/5</span>
      )}
    </div>
  )
}
