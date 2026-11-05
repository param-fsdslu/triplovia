'use client'

/**
 * The login panel as a page (/auth/login, /auth/signup): used for deep links and redirects
 * (e.g. ?redirect=/bookings). Same layout as the popup.
 */
import type { AuthIntent } from '@/lib/stores/use-ui-store'
import { safeRedirectPath } from '@/lib/utils/safe-redirect'
import { AuthPanel } from './AuthPanel'
import { AuthPromo } from './AuthPromo'
import { useAuthNavigate } from './use-auth-navigate'

export function AuthPageCard({ intent, redirectTo }: { intent: AuthIntent; redirectTo?: string }) {
  const navigate = useAuthNavigate()

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_40px_-12px_rgba(7,63,61,0.18)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <AuthPromo className="hidden md:block" />
      <div className="flex flex-col">
        <AuthPromo compact className="md:hidden" />
        <AuthPanel
          intent={intent}
          notice={redirectTo ? 'Please sign in to continue.' : undefined}
          onSignedIn={() => navigate(safeRedirectPath(redirectTo))}
        />
      </div>
    </div>
  )
}
