'use client'

/**
 * AdminToaster — the admin panel's feedback, with nothing needed at the call sites (mounted once by
 * AdminShell). It watches the browser's requests while mounted:
 *
 * - While a server action (`Next-Action` header) or page load (`RSC` header, not prefetches) is in
 *   flight for over SHOW_AFTER_MS: a square loading box in the centre ("Saving changes…" / "Loading…").
 * - When an action that refreshed data (Next's `x-action-revalidated` header: revalidatePath / Tag)
 *   finishes and its result isn't `{ success: false }`: a "Changes saved" toast in the top-right corner.
 * - A failed request or network error: an error toast.
 * - The panel's older `alert(…)` messages show as toasts too (error-looking ones in red).
 *
 * Code can also call `toast.success / error / info` (lib/stores/use-toast-store.ts) for its own messages.
 */
import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { toast, useToastStore } from '@/lib/stores/use-toast-store'

const SHOW_AFTER_MS = 200
const ERROR_WORDS = /fail|error|could ?n[o']t|unable|invalid|not allowed|unauthori|forbidden|denied|required|please|cannot|can't|must|missing|exceed|too (large|big|many)/i
const SUCCESS_WORDS = /success|saved|updated|deleted|removed|added|created|uploaded|processed|archived/i

type Kind = 'save' | 'load'

function requestKind(input: RequestInfo | URL, init?: RequestInit): Kind | null {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  if (headers.has('Next-Action')) return 'save'
  if (headers.get('RSC') === '1' && !headers.has('Next-Router-Prefetch')) return 'load'
  return null
}

/** After a server action: "Changes saved" when it refreshed data and didn't report a failure */
async function reportAction(res: Response) {
  if (!res.ok) {
    toast.error('Something went wrong. Please try again.')
    return
  }
  let revalidated = false
  try {
    const parts = JSON.parse(res.headers.get('x-action-revalidated') || '[[],0,0]')
    revalidated = (Array.isArray(parts[0]) && parts[0].length > 0) || parts[1] === 1
  } catch {
    revalidated = false
  }
  if (!revalidated) return
  const body = await res.clone().text().catch(() => '')
  if (/"success":\s*false/.test(body)) return // the screen shows its own error
  // Give the screen a moment to show its own success message; then don't add a second one
  await new Promise((resolve) => setTimeout(resolve, 400))
  const recent = useToastStore.getState().toasts.some((t) => t.kind === 'success' && Date.now() - t.createdAt < 2000)
  if (!recent) toast.success('Changes saved')
}

export function AdminToaster() {
  const [pending, setPending] = useState({ save: 0, load: 0 })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const original = window.fetch
    // State changes are queued: the router can start a request while React is rendering
    const track = (kind: Kind, delta: number) =>
      queueMicrotask(() => setPending((p) => ({ ...p, [kind]: Math.max(0, p[kind] + delta) })))

    const watched: typeof window.fetch = async (input, init) => {
      const kind = requestKind(input, init)
      if (!kind) return original(input, init)
      track(kind, 1)
      try {
        const res = await original(input, init)
        if (kind === 'save') void reportAction(res)
        return res
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') toast.error('Network error. Check your connection and try again.')
        throw err
      } finally {
        track(kind, -1)
      }
    }
    window.fetch = watched

    // The panel's alert(…) messages as toasts instead of blocking pop-ups
    const originalAlert = window.alert
    window.alert = (message?: unknown) => {
      const text = String(message ?? '')
      if (ERROR_WORDS.test(text)) toast.error(text)
      else if (SUCCESS_WORDS.test(text)) toast.success(text)
      else toast.info(text)
    }

    return () => {
      if (window.fetch === watched) window.fetch = original
      window.alert = originalAlert
    }
  }, [])

  const working = pending.save + pending.load > 0
  useEffect(() => {
    if (!working) {
      setBusy(false)
      return
    }
    const timer = setTimeout(() => setBusy(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [working])

  return <Toaster busyLabel={busy ? (pending.save > 0 ? 'Saving changes…' : 'Loading…') : null} />
}
