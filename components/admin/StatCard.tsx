/** A figure on an admin page: tinted icon, label, value and an optional hint */
import type { ReactNode } from 'react'
import type { LucideIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

/** Icon tile colours per tone (also used by other admin figure layouts) */
export const TONES = {
  primary: 'bg-mint text-primary',
  info: 'bg-sky-50 text-sky-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  violet: 'bg-violet-50 text-violet-700',
} as const

export type StatTone = keyof typeof TONES

/** Text colour of a tone, for values and inline figures */
export const toneText = (tone: StatTone) => TONES[tone].split(' ')[1]

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  icon?: LucideIcon
  hint?: ReactNode
  tone?: StatTone
  /** Colours the value with the tone too (e.g. a green published count) */
  toneValue?: boolean
  className?: string
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'primary', toneValue, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 shadow-[0_1px_3px_rgba(7,63,61,0.06)] transition-shadow hover:shadow-[0_6px_20px_-8px_rgba(7,63,61,0.18)]',
        className
      )}
    >
      {Icon && (
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-0.5 truncate font-heading text-[22px] font-bold leading-tight tracking-tight',
            toneValue ? toneText(tone) : 'text-foreground'
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}
