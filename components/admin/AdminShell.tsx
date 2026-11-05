'use client'

/**
 * The admin panel frame: sidebar (AdminNav), a sticky top bar naming the current section (with the
 * activity log for super admins), and
 * the page using the full width beside the sidebar. Panel-only looks for the shared UI
 * primitives (tables, cards, tabs) are set here on the content wrapper, so the public site's
 * components stay as they are.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Shield } from '@/components/icons'
import type { AdminRole } from '@/lib/utils/roles'
import { cn } from '@/lib/utils'
import { AdminNav, isNavItemActive, visibleNavGroups } from './AdminNav'
import { AdminToaster } from './AdminToaster'
import { ActivityLogButton } from './ActivityLogButton'

const CONTENT_STYLES = [
  // Tables: tinted header row with small caps labels, roomier rows, mint hover, framed
  '[&_[data-slot=table-container]]:rounded-lg [&_[data-slot=table-container]]:border [&_[data-slot=table-container]]:border-border',
  '[&_[data-slot=table-header]]:bg-muted/60',
  '[&_[data-slot=table-head]]:h-10 [&_[data-slot=table-head]]:text-[11px] [&_[data-slot=table-head]]:font-semibold [&_[data-slot=table-head]]:uppercase [&_[data-slot=table-head]]:tracking-[0.08em] [&_[data-slot=table-head]]:text-muted-foreground',
  '[&_[data-slot=table-cell]]:py-3',
  '[&_[data-slot=table-body]_[data-slot=table-row]:hover]:bg-mint/40',
  // Cards: denser padding, a touch more lift, heading font for titles
  '[&_[data-slot=card]]:gap-4 [&_[data-slot=card]]:py-5 [&_[data-slot=card]]:shadow-[0_1px_3px_rgba(7,63,61,0.06)]',
  '[&_[data-slot=card-header]]:px-5 [&_[data-slot=card-content]]:px-5 [&_[data-slot=card-footer]]:px-5',
  '[&_[data-slot=card-title]]:font-heading [&_[data-slot=card-title]]:text-[15px]',
  '[&_[data-slot=card-description]]:text-[13px]',
  // Tabs: long tab rows scroll sideways on small screens instead of overflowing
  '[&_[data-slot=tabs-list]]:max-w-full [&_[data-slot=tabs-list]]:justify-start [&_[data-slot=tabs-list]]:overflow-x-auto',
].join(' ')

interface AdminShellProps {
  /** The signed-in admin (the activity log doesn't count their own changes as new) */
  userId: string
  email?: string
  role: AdminRole
  roleDisplayName: string
  hotelIds: string[] | null
  children: ReactNode
}

export function AdminShell({ userId, email, role, roleDisplayName, hotelIds, children }: AdminShellProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // The current section for the top bar
  const groups = visibleNavGroups(role)
  const currentGroup = groups.find((g) => g.items.some((item) => isNavItemActive(item, pathname)))
  const currentItem = currentGroup?.items.find((item) => isNavItemActive(item, pathname))

  // Close the phone menu on navigation and with Escape
  useEffect(() => setIsSidebarOpen(false), [pathname])
  useEffect(() => {
    if (!isSidebarOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsSidebarOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isSidebarOpen])

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav
        email={email}
        role={role}
        roleDisplayName={roleDisplayName}
        hotelIds={hotelIds}
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Toggle menu"
            className="-ml-1 rounded-full p-2 text-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            {currentGroup && (
              <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">
                {currentGroup.label}
              </p>
            )}
            <p className="mt-1 truncate font-heading text-base font-bold leading-none text-foreground">
              {currentItem?.name ?? 'Admin Panel'}
            </p>
          </div>
          {/* Activity log: super admins only (by request) */}
          {role === 'super_admin' && <ActivityLogButton userId={userId} />}
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground sm:inline-flex">
            <Shield className="h-3.5 w-3.5 text-gold" />
            {roleDisplayName}
          </span>
        </header>

        {/* Full width beside the sidebar; only very wide screens stop at 1680px */}
        <main className={cn('w-full max-w-[1680px] flex-1 px-4 py-5 sm:px-6 sm:py-6', CONTENT_STYLES)}>
          {children}
        </main>
      </div>

      {/* Toasts: "Saving changes…" / "Loading…" while the server works, "Changes saved", errors */}
      <AdminToaster />
    </div>
  )
}
