import { create } from 'zustand'

/**
 * Small toasts (top-right corner): `toast.success('Saved')`, `toast.error('Could not save')`, `toast.info(…)`.
 * Rendered by components/ui/toaster.tsx (the admin panel mounts it through AdminToaster).
 */
export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  /** Date.now() when shown */
  createdAt: number
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastKind, message: string, durationMs?: number) => number
  dismiss: (id: number) => void
}

let nextId = 1
/** At most this many on screen; older ones go first */
const MAX_TOASTS = 4

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (kind, message, durationMs) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.message !== message), { id, kind, message, createdAt: Date.now() }].slice(-MAX_TOASTS) }))
    const ms = durationMs ?? (kind === 'error' ? 6000 : 3500)
    if (typeof window !== 'undefined') window.setTimeout(() => get().dismiss(id), ms)
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  info: (message: string) => useToastStore.getState().push('info', message),
}
