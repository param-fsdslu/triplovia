'use client'

import { Label } from '@/components/ui/label'
import { StarRating } from './StarRating'

interface CategoryRatingProps {
  label: string
  value: number
  onChange: (value: number) => void
  icon?: React.ReactNode
  description?: string
}

export function CategoryRating({
  label,
  value,
  onChange,
  icon,
}: CategoryRatingProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <Label className="text-sm font-medium">{label}</Label>
      </div>
      <StarRating value={value} onChange={onChange} size="md" />
    </div>
  )
}
