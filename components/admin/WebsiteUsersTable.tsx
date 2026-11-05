'use client'

/**
 * Website users (guests with an account) for the admin Users page, in the Vendors list style:
 * search by name, email or mobile, filter by sign-in method, export, and per-user actions
 * (WebsiteUserActions). Clicking a row opens the user's profile. Panel accounts live under Vendors.
 */
import { useMemo, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Users as UsersIcon, X } from '@/components/icons'
import { Input } from '@/components/ui/input'
import { ExportButtons } from './ExportButtons'
import { WebsiteUserActions } from './WebsiteUserActions'
import { SIGN_IN_LABELS, formatUserDate, formatUserTime, userStatus } from './website-user-format'
import type { ExportColumn } from '@/lib/utils/export'
import type { SignInMethod, WebsiteUser } from '@/lib/actions/website-users'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { formatPhone } from '@/lib/utils/phone'
import { cn, formatRupees } from '@/lib/utils'

const FILTERS: Array<{ value: SignInMethod | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'phone', label: 'Mobile' },
  { value: 'google', label: 'Google' },
  { value: 'email', label: 'Email' },
]

const TH = 'px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'

const exportColumns: ExportColumn[] = [
  { header: 'Name', accessor: (u: WebsiteUser) => u.name ?? '' },
  { header: 'Email', accessor: (u: WebsiteUser) => u.email ?? '' },
  { header: 'Mobile', accessor: (u: WebsiteUser) => (u.phone ? formatPhone(u.phone) : '') },
  { header: 'Signs in with', accessor: (u: WebsiteUser) => u.methods.map((m) => SIGN_IN_LABELS[m]).join(', ') },
  { header: 'Joined', accessor: (u: WebsiteUser) => formatUserDate(u.createdAt) },
  { header: 'Last sign-in', accessor: (u: WebsiteUser) => formatUserDate(u.lastSignIn) },
  { header: 'Bookings', accessor: (u: WebsiteUser) => u.bookings },
  { header: 'Paid bookings', accessor: (u: WebsiteUser) => u.paidBookings },
  { header: 'Total paid', accessor: (u: WebsiteUser) => formatRupees(u.totalPaid) },
  { header: 'Status', accessor: (u: WebsiteUser) => userStatus(u).label },
]

const profileHref = (user: WebsiteUser) => `${ADMIN_PATH}/users/${encodeURIComponent(user.id)}`

/**
 * A click on the row itself opens the profile. Links and buttons keep their meaning, and clicks
 * in the actions menu or its dialog (portalled, so outside the row's DOM but still bubbling
 * through React) are ignored.
 */
const opensProfile = (e: MouseEvent<HTMLTableRowElement>) =>
  e.target instanceof Element && e.currentTarget.contains(e.target) && !e.target.closest('a, button')

export function WebsiteUsersTable({ users }: { users: WebsiteUser[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState<SignInMethod | 'all'>('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return users.filter((user) => {
      if (method !== 'all' && !user.methods.includes(method)) return false
      if (!q) return true
      return (
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        (digits.length >= 3 && user.phone?.replace(/\D/g, '').includes(digits))
      )
    })
  }, [users, query, method])

  if (users.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-12 text-center">
        <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No users yet</h3>
        <p className="text-muted-foreground">Guests show up here once they sign in on the website.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email or mobile..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-8 bg-white"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sign-in method">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={method === filter.value}
              onClick={() => setMethod(filter.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                method === filter.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-white text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto">
          <ExportButtons rows={rows} columns={exportColumns} filenamePrefix="website-users" title="Website Users" />
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className={TH}>User</th>
                <th className={TH}>Signs In With</th>
                <th className={TH}>Status</th>
                <th className={TH}>Bookings</th>
                <th className={TH}>Joined</th>
                <th className={TH}>Last Sign In</th>
                <th className={cn(TH, 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No users match this search
                  </td>
                </tr>
              ) : (
                rows.map((user) => {
                  const status = userStatus(user)
                  const initial = (user.name || user.email || '').charAt(0).toUpperCase()
                  return (
                    <tr
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={(e) => {
                        if (opensProfile(e)) router.push(profileHref(user))
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-border rounded-full flex items-center justify-center">
                            {initial ? (
                              <span className="text-muted-foreground font-medium text-sm">{initial}</span>
                            ) : (
                              <UsersIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="ml-4">
                            <Link
                              href={profileHref(user)}
                              className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {user.name || 'No name yet'}
                            </Link>
                            {user.email && <div className="text-sm text-muted-foreground">{user.email}</div>}
                            {user.phone && <div className="text-sm text-muted-foreground">{formatPhone(user.phone)}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.methods.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="flex gap-1">
                            {user.methods.map((m) => (
                              <span
                                key={m}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground"
                              >
                                {SIGN_IN_LABELS[m]}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', status.className)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.bookings === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          <>
                            <div className="text-foreground">
                              {user.paidBookings} paid
                              {user.bookings > user.paidBookings && (
                                <span className="text-muted-foreground"> of {user.bookings}</span>
                              )}
                            </div>
                            {user.totalPaid > 0 && (
                              <div className="text-muted-foreground">{formatRupees(user.totalPaid)}</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatUserDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div>{formatUserDate(user.lastSignIn)}</div>
                        {user.lastSignIn && <div className="text-xs">{formatUserTime(user.lastSignIn)}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <WebsiteUserActions user={user} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
