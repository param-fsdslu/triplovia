'use client'

/**
 * Admin sidebar: brand, navigation in groups (role- and feature-filtered), and the signed-in
 * admin with sign-out. Fixed on desktop; slides in on phones (AdminShell owns `open`).
 */
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutAdmin } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import {
  History,
  LayoutDashboard,
  Hotel,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  DollarSign,
  Users,
  Shield,
  FileText,
  X,
  Ship,
  Anchor,
  Star,
  Store,
  type LucideIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/button'
import type { AdminRole } from '@/lib/utils/roles'
import { isFeatureEnabled, type FeatureName } from '@/lib/config/features'
import { ADMIN_PATH } from '@/lib/config/admin-path'

export interface AdminNavItem {
  name: string
  href: string
  icon: LucideIcon
  roles: AdminRole[]
  feature?: FeatureName
}

const BOTH: AdminRole[] = ['super_admin', 'hotel_admin']

const NAV_GROUPS: { label: string; items: AdminNavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: ADMIN_PATH, icon: LayoutDashboard, roles: BOTH },
      // Only super admins see global analytics
      { name: 'Analytics', href: `${ADMIN_PATH}/analytics`, icon: BarChart3, roles: ['super_admin'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Bookings', href: `${ADMIN_PATH}/bookings`, icon: Calendar, roles: BOTH, feature: 'hotels' },
      { name: 'Hotels', href: `${ADMIN_PATH}/hotels`, icon: Hotel, roles: BOTH, feature: 'hotels' },
      { name: 'Boats', href: `${ADMIN_PATH}/boats`, icon: Ship, roles: BOTH, feature: 'boats' },
      { name: 'Boat Bookings', href: `${ADMIN_PATH}/boat-bookings`, icon: Anchor, roles: BOTH, feature: 'boats' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Payments', href: `${ADMIN_PATH}/payments`, icon: CreditCard, roles: BOTH },
      { name: 'Refunds', href: `${ADMIN_PATH}/refunds`, icon: DollarSign, roles: BOTH },
    ],
  },
  {
    label: 'Content',
    items: [
      { name: 'Reviews', href: `${ADMIN_PATH}/reviews`, icon: Star, roles: BOTH },
      // Only super admins manage blog
      { name: 'Blog', href: `${ADMIN_PATH}/blogs`, icon: FileText, roles: ['super_admin'], feature: 'blogs' },
    ],
  },
  {
    label: 'System',
    items: [
      // Only super admins see website users and manage vendors (panel accounts)
      { name: 'Activity log', href: `${ADMIN_PATH}/activity`, icon: History, roles: ['super_admin'] },
      { name: 'Users', href: `${ADMIN_PATH}/users`, icon: Users, roles: ['super_admin'] },
      { name: 'Vendors', href: `${ADMIN_PATH}/vendors`, icon: Store, roles: ['super_admin'] },
      { name: 'Settings', href: `${ADMIN_PATH}/settings`, icon: Settings, roles: BOTH },
    ],
  },
]

/** The groups this admin may see (role + enabled features), empty groups dropped */
export function visibleNavGroups(role: AdminRole) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role) && (!item.feature || isFeatureEnabled(item.feature))),
  })).filter((group) => group.items.length > 0)
}

/** Dashboard only on its own page; every other item also on its sub-pages (e.g. a hotel's edit page) */
export function isNavItemActive(item: AdminNavItem, pathname: string) {
  return item.href === ADMIN_PATH ? pathname === ADMIN_PATH : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

interface AdminNavProps {
  email?: string
  role: AdminRole
  roleDisplayName: string
  hotelIds: string[] | null
  open: boolean
  onClose: () => void
}

export function AdminNav({ email, role, roleDisplayName, hotelIds, open, onClose }: AdminNavProps) {
  const pathname = usePathname()
  const groups = visibleNavGroups(role)
  const initial = (email?.trim()[0] ?? 'A').toUpperCase()

  return (
    <>
      {/* Overlay for mobile */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-secondary/40 backdrop-blur-[2px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-5">
          <Link href={ADMIN_PATH} onClick={onClose} className="flex min-w-0 items-center gap-2.5">
            <Image src="/company-logo-only.svg" alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
            <span className="truncate font-heading text-[17px] font-bold text-foreground">Admin Panel</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Toggle menu"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = isNavItemActive(item, pathname)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-mint font-semibold text-primary'
                          : 'font-medium text-foreground/75 hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {isActive && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary" />}
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0',
                          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-sm font-bold text-white">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 shrink-0 text-gold" />
                <p className="truncate text-sm font-semibold text-foreground">{roleDisplayName}</p>
              </div>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
              {role === 'hotel_admin' && hotelIds && hotelIds.length > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Managing {hotelIds.length} {hotelIds.length === 1 ? 'hotel' : 'hotels'}
                </p>
              )}
            </div>
            <form action={signOutAdmin}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-card hover:text-destructive"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
