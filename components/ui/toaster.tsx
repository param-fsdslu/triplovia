'use client'

/**
 * Toaster (by request, 2026-11-05): success, error and info toasts from `toast`
 * (lib/stores/use-toast-store.ts) stack in the top-right corner and slide in from the right; an
 * optional busy label ("Saving changes…", "Loading…") shows as a small square loading box in the
 * centre of the screen. Neither blocks clicks. Each toast closes itself (errors stay longer) or with its ×.
 */
import { CheckCircle2, Info, X, XCircle } from '@/components/icons'
import { useToastStore, type ToastKind } from '@/lib/stores/use-toast-store'
import { cn } from '@/lib/utils'

const KIND: Record<ToastKind, { icon: typeof Info; iconCls: string; bar: string }> = {
  success: { icon: CheckCircle2, iconCls: 'text-primary', bar: 'bg-primary' },
  error: { icon: XCircle, iconCls: 'text-destructive', bar: 'bg-destructive' },
  info: { icon: Info, iconCls: 'text-secondary', bar: 'bg-secondary' },
}

export function Toaster({ busyLabel }: { busyLabel?: string | null }) {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  if (toasts.length === 0 && !busyLabel) return null

  return (
    <>
      {/* Toasts: top-right corner, newest at the bottom of the stack */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] flex-col items-end gap-2 sm:w-[360px]"
        >
          {toasts.map((t) => {
            const { icon: Icon, iconCls, bar } = KIND[t.kind]
            return (
              <div
                key={t.id}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto relative flex w-full items-start gap-2.5 overflow-hidden rounded-xl border border-border bg-card py-3 pl-4 pr-3 text-sm text-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8"
              >
                <span className={cn('absolute inset-y-0 left-0 w-1', bar)} />
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconCls)} />
                <p className="min-w-0 flex-1 whitespace-pre-line font-medium leading-snug">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="-mr-1 -mt-0.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Busy: a square loading box in the centre */}
      {busyLabel && (
        <div className="pointer-events-none fixed inset-0 z-[99] flex items-center justify-center">
          <div
            role="status"
            aria-live="polite"
            className="flex h-32 w-32 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/95 px-3 text-center shadow-[0_20px_50px_-12px_rgba(7,63,61,0.35)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
          >
            <span aria-hidden="true" className="relative h-10 w-10">
              <span className="absolute inset-0 rounded-full border-[3px] border-mint" />
              <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary border-r-primary" />
            </span>
            <p className="text-[13px] font-semibold leading-tight text-foreground">{busyLabel}</p>
          </div>
        </div>
      )}
    </>
  )
}
