import { create } from 'zustand'

export type AuthIntent = 'login' | 'signup'

export interface AuthDialogOptions {
  intent?: AuthIntent
  /** Where to go after signing in; without it the current page just refreshes */
  redirectTo?: string
  /** Short message above the form, e.g. why sign-in is needed */
  notice?: string
}

interface UIStateData {
  mobileMenuOpen: boolean
  /** Login / sign-up popup (components/auth/AuthDialog.tsx) */
  authDialog: AuthDialogOptions & { open: boolean }
  /** Bumped after sign-in so components holding the current user re-read it */
  authVersion: number
}

interface UIActions {
  setMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
  openAuth: (options?: AuthDialogOptions) => void
  closeAuth: () => void
  bumpAuthVersion: () => void
}

export type UIState = UIStateData & UIActions

export const useUIStore = create<UIState>()((set) => ({
  mobileMenuOpen: false,
  authDialog: { open: false },
  authVersion: 0,
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  openAuth: (options = {}) => set({ authDialog: { intent: 'login', ...options, open: true } }),
  closeAuth: () => set((state) => ({ authDialog: { ...state.authDialog, open: false } })),
  bumpAuthVersion: () => set((state) => ({ authVersion: state.authVersion + 1 })),
}))
