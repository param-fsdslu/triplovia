/**
 * The header every admin page starts with: optional back button, title (with an optional
 * icon), description, and the page's actions on the right (below the title on phones).
 */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, type LucideIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'

interface AdminPageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Shows a back button to this page */
  backHref?: string
  /** With backHref: a text link above the title (e.g. "Back to Blogs") instead of the icon button */
  backLabel?: string
  icon?: LucideIcon
  actions?: ReactNode
}

export function AdminPageHeader({ title, description, backHref, backLabel, icon: Icon, actions }: AdminPageHeaderProps) {
  return (
    <div className="border-b border-border pb-4">
      {backHref && backLabel && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {backHref && !backLabel && (
            <Button variant="outline" size="icon" asChild className="mt-0.5 shrink-0 bg-card">
              <Link href={backHref} aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-heading text-[22px] font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
              {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />}
              <span className="min-w-0 break-words">{title}</span>
            </h1>
            {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
