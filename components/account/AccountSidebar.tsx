'use client'

import { LogOut, Phone } from '@/components/icons'
import { Link, usePathname } from '@/i18n/routing'
import { signOut } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import { ACCOUNT_LINKS } from './account-links'

interface AccountSidebarProps {
  name: string
  /** Email, or the mobile number for phone-only accounts */
  contact: string
  /** e.g. "Oct 2026" */
  memberSince?: string
}

/** Account navigation (Profile → My Bookings → Wishlist): a sticky sidebar from `lg`, underlined tabs below that */
export function AccountSidebar({ name, contact, memberSince }: AccountSidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const initial = (name || contact || 'U').charAt(0).toUpperCase()

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col gap-4 sticky top-[88px]">
        <div className="rounded-2xl border border-border bg-card p-3">
          {/* Who is signed in */}
          <div className="flex items-center gap-3 px-2 pt-1 pb-4 mb-2 border-b border-border">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-base font-bold text-white ring-2 ring-gold/40">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-bold text-foreground">{name || 'My account'}</p>
              {contact && <p className="truncate text-xs text-muted-foreground">{contact}</p>}
              {memberSince && <p className="mt-0.5 text-[11px] font-medium text-gold">Member since {memberSince}</p>}
            </div>
          </div>

          <nav className="space-y-0.5" aria-label="Account">
            {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-mint text-primary font-semibold' : 'text-foreground/70 hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary" />}
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              Sign out
            </button>
          </div>
        </div>

        {/* Help with a booking */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-heading text-sm font-bold text-foreground">Need help with a booking?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Call or WhatsApp us and we'll sort it out.
          </p>
          <a
            href="tel:+919113887712"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
          >
            <Phone className="h-4 w-4" />
            +91 91138 87712
          </a>
        </div>
      </aside>

      {/* Phones and tablets: underlined tabs, three equal columns, no pills (by request), like My Bookings' tabs */}
      <nav aria-label="Account" className="mb-6 grid grid-cols-3 border-b border-border lg:hidden">
        {ACCOUNT_LINKS.map(({ href, label, shortLabel, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={cn(
                '-mb-px flex min-w-0 items-center justify-center gap-1.5 border-b-2 px-1 pb-3 pt-1 text-[15px] font-semibold transition-colors',
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{shortLabel}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
