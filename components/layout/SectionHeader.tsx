import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  /** Rendered on the right on desktop (e.g. a "View all" link) */
  action?: ReactNode
  align?: 'left' | 'center'
  /** For sections on a dark background */
  inverted?: boolean
  className?: string
}

/** Consistent heading block for page sections: gold eyebrow, Manrope title, muted description. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  inverted = false,
  className,
}: SectionHeaderProps) {
  const centered = align === 'center'
  return (
    <div
      className={cn(
        'mb-8 sm:mb-10 flex flex-col gap-4',
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto')}>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold">{eyebrow}</p>
        )}
        <h2
          className={cn(
            'text-2xl sm:text-3xl lg:text-[2.125rem] font-bold tracking-tight leading-tight',
            inverted ? 'text-white' : 'text-foreground'
          )}
        >
          {title}
        </h2>
        {description && (
          <p className={cn('mt-3 text-sm sm:text-base leading-relaxed', inverted ? 'text-white/70' : 'text-muted-foreground')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
