'use client'

/**
 * Activity log in the admin top bar (super admins only, by request): a clock button with a count
 * of new entries, opening a panel of recent changes to hotels, vendors, users, blogs and settings
 * (lib/services/activity-log.service.ts, via GET /api/panel/activity). "New" means after the last
 * time this browser opened the panel (localStorage) and made by someone else. Refreshes every
 * minute while the tab is visible, and on opening.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import {
  FileText,
  Hotel,
  Loader2,
  Settings,
  Shield,
  UserCircle,
  type LucideIcon,
} from '@/components/icons'
import { AdminPageHeader } from './AdminPageHeader'
import type { ActivityChange } from '@/lib/services/activity-log.service'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { cn } from '@/lib/utils'

type Entity = 'hotel' | 'vendor' | 'user' | 'blog' | 'settings'

interface Entry {
  id: string
  created_at: string
  actor_id: string | null
  actor_name: string
  actor_role: string | null
  entity_type: Entity
  action: string
  summary: string
  changes?: ActivityChange[]
  href: string | null
}

const PAGE = 40
const POLL_MS = 60_000
const SEEN_KEY = 'ht-admin-activity-seen'

const ENTITY: Record<Entity, { icon: LucideIcon; label: string; tone: string }> = {
  hotel: { icon: Hotel, label: 'Hotels', tone: 'bg-mint text-primary' },
  vendor: { icon: Shield, label: 'Vendors', tone: 'bg-amber-50 text-amber-700' },
  user: { icon: UserCircle, label: 'Users', tone: 'bg-sky-50 text-sky-700' },
  blog: { icon: FileText, label: 'Blogs', tone: 'bg-violet-50 text-violet-700' },
  settings: { icon: Settings, label: 'Settings', tone: 'bg-muted text-foreground' },
}

const FILTERS: Array<{ value: 'all' | Entity; label: string }> = [
  { value: 'all', label: 'All' },
  ...(Object.keys(ENTITY) as Entity[]).map((value) => ({ value, label: ENTITY[value].label })),
]

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) || ''
  } catch {
    return ''
  }
}

function timeAgo(iso: string) {
  const date = new Date(iso)
  if (Date.now() - date.getTime() < 60_000) return 'Just now'
  return `${formatDistanceToNowStrict(date)} ago`
}

export function ActivityLogView({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const paged = useRef(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<'all' | Entity>('all')
  const [seen, setSeen] = useState('')

  useEffect(() => setSeen(readSeen()), [])

  const load = useCallback(async (before?: string) => {
    const params = new URLSearchParams({ limit: String(PAGE) })
    if (before) params.set('before', before)
    const res = await fetch(`/api/panel/activity?${params}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('failed')
    const json = await res.json()
    return (json.data ?? []) as Entry[]
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const fresh = await load()
      setEntries((previous) => {
        const merged = new Map([...fresh, ...previous].map((entry) => [entry.id, entry]))
        return [...merged.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
      })
      if (!paged.current) setHasMore(fresh.length === PAGE)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [load])

  // First load, then every minute while the tab is visible
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [refresh])

  const loadMore = async () => {
    const last = entries[entries.length - 1]
    if (!last) return
    setLoadingMore(true)
    try {
      const older = await load(last.created_at)
      setEntries((list) => [...list, ...older.filter((e) => !list.some((x) => x.id === e.id))])
      paged.current = true
      setHasMore(older.length === PAGE)
    } catch {
      setError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const isNew = useCallback(
    (e: Entry) => e.actor_id !== userId && (!seen || e.created_at > seen),
    [seen, userId]
  )
  const newCount = useMemo(() => entries.filter(isNew).length, [entries, isNew])
  const shown = filter === 'all' ? entries : entries.filter((e) => e.entity_type === filter)

  const markSeen = () => {
    const latest = entries[0]?.created_at || new Date().toISOString()
    try {
      localStorage.setItem(SEEN_KEY, latest)
      window.dispatchEvent(new Event('activity-seen'))
    } catch {
      // private mode: the count just won't be remembered
    }
    setSeen(latest)
  }

  useEffect(() => {
    if (!entries[0]) return
    const latest = entries[0].created_at
    try { localStorage.setItem(SEEN_KEY, latest); window.dispatchEvent(new Event('activity-seen')) } catch {}
  }, [entries])

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Activity log" description="Recent changes across the panel." />
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        {newCount > 0 && <div className="flex justify-end border-b border-border px-4 py-2">
            <button type="button" onClick={markSeen} className="text-xs font-semibold text-primary hover:text-primary-hover">
              Mark all read
            </button>
        </div>}

        {/* Filters: underlined text tabs */}
        <div className="flex gap-4 overflow-x-auto border-b border-border px-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                '-mb-px shrink-0 border-b-2 py-2 text-xs font-semibold transition-colors',
                filter === f.value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div className="">
          {loading && entries.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading activity…
            </div>
          ) : error && entries.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Couldn’t load the activity. Try again in a moment.</p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map((e) => {
                const { icon: Icon, tone } = ENTITY[e.entity_type] ?? ENTITY.settings
                const fresh = isNew(e)
                const body = (
                  <>
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tone)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[13px] leading-snug text-foreground', fresh ? 'font-semibold' : 'font-medium')}>
                        {e.summary}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                        {e.actor_name} · <time dateTime={e.created_at} title={new Date(e.created_at).toLocaleString('en-IN')}>{timeAgo(e.created_at)}</time>
                      </span>
                    </span>
                    {fresh && <span aria-label="New" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </>
                )
                const rowClass = cn('flex items-start gap-3 px-4 py-3 transition-colors', fresh && 'bg-mint/40')
                return (
                  <li key={e.id}>
                    {e.href ? (
                      <Link href={`${ADMIN_PATH}${e.href}`}  className={cn(rowClass, 'hover:bg-muted/60')}>
                        {body}
                      </Link>
                    ) : (
                      <div className={rowClass}>{body}</div>
                    )}
                    {!!e.changes?.length && <details className="mx-4 mb-3 sm:ml-[60px]">
                      <summary className="w-fit cursor-pointer text-xs font-medium text-muted-foreground hover:text-primary">View changes</summary>
                      <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/60"><tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Before</th><th className="px-3 py-2">After</th></tr></thead>
                        <tbody>{e.changes.map((change, i) => <tr key={i} className="border-t border-border align-top"><th className="px-3 py-2 font-medium">{change.field}</th><td className="min-w-40 max-w-md whitespace-pre-wrap break-words px-3 py-2 text-muted-foreground">{change.from ?? '—'}</td><td className="min-w-40 max-w-md whitespace-pre-wrap break-words px-3 py-2">{change.to ?? '—'}</td></tr>)}</tbody>
                      </table>
                      </div>
                    </details>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {hasMore && entries.length > 0 && (
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold text-primary hover:bg-muted/60 disabled:opacity-60"
            >
              {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Show older activity
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
