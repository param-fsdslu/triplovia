'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { History } from '@/components/icons'
import { ADMIN_PATH } from '@/lib/config/admin-path'

export function ActivityLogButton({ userId }: { userId: string }) {
  const [count, setCount] = useState(0)
  const pathname = usePathname()
  useEffect(() => {
    let disposed = false
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/panel/activity?limit=100', { cache: 'no-store' })
        if (!res.ok) return
        const { data = [] } = await res.json()
        let seen = ''
        try { seen = localStorage.getItem('ht-admin-activity-seen') || '' } catch {}
        if (!disposed) setCount(pathname === ADMIN_PATH + '/activity' ? 0 : data.filter((entry: { actor_id: string; created_at: string }) => entry.actor_id !== userId && entry.created_at > seen).length)
      } catch { /* Retry on the next poll. */ }
    }
    void refresh()
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('activity-seen', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { disposed = true; clearInterval(timer); window.removeEventListener('activity-seen', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [userId, pathname])
  return <Link href={ADMIN_PATH + '/activity'} aria-label={count ? 'Activity log, ' + count + ' new' : 'Activity log'} title="Activity log" className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted">
    <History className="h-5 w-5" />
    {count > 0 && <span className="absolute right-0 top-0 rounded-full bg-destructive px-1 text-[10px] font-bold text-white">{count > 9 ? '9+' : count}</span>}
  </Link>
}
