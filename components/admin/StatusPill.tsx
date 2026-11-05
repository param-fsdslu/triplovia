/**
 * A booking or payment status as a solid coloured pill (status-colors.ts, the same colours as the
 * booking calendar). Shows the status word ("partially refunded") unless a `label` is given.
 */
import { cn } from '@/lib/utils'
import { statusColor } from './status-colors'

interface StatusPillProps {
  status: string
  label?: string
  className?: string
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize text-white',
        statusColor(status).fill,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/75" />
      {label ?? status.replace(/_/g, ' ')}
    </span>
  )
}
