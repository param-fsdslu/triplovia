'use client'

/**
 * Login / sign-up popup. Opened from anywhere with useUIStore's openAuth({ intent, redirectTo,
 * notice }); after sign-in it closes and refreshes the page, or goes to redirectTo.
 */
import { useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from '@/i18n/routing'
import { queryKeys } from '@/lib/hooks/use-auth-query'
import { useUIStore } from '@/lib/stores/use-ui-store'
import { safeRedirectPath } from '@/lib/utils/safe-redirect'
import { AuthPanel } from './AuthPanel'
import { AuthPromo } from './AuthPromo'
import { useAuthNavigate } from './use-auth-navigate'

/** The reCAPTCHA challenge renders outside the dialog; interacting with it must not close the popup */
function isRecaptchaElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  let node: Element | null = target
  while (node && node.parentElement && node.parentElement !== document.body) node = node.parentElement
  return !!node?.querySelector('iframe[src*="recaptcha"]')
}

export function AuthDialog() {
  const { dialog, closeAuth, bumpAuthVersion } = useUIStore(
    useShallow((s) => ({ dialog: s.authDialog, closeAuth: s.closeAuth, bumpAuthVersion: s.bumpAuthVersion }))
  )
  const router = useRouter()
  const navigate = useAuthNavigate()
  const queryClient = useQueryClient()
  const sessionStarted = useRef(false)

  const refreshAuthState = () => {
    sessionStarted.current = false
    bumpAuthVersion()
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.user })
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.session })
  }

  const onSignedIn = () => {
    closeAuth()
    refreshAuthState()
    if (dialog.redirectTo) navigate(safeRedirectPath(dialog.redirectTo))
    else router.refresh()
  }

  const onOpenChange = (open: boolean) => {
    if (open) return
    closeAuth()
    // Closed during the "almost there" step: the user is signed in all the same
    if (sessionStarted.current) {
      refreshAuthState()
      router.refresh()
    }
  }

  return (
    <Dialog open={dialog.open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 sm:max-w-[880px]"
        onInteractOutside={(e) => {
          if (isRecaptchaElement(e.target)) e.preventDefault()
        }}
        onOpenAutoFocus={(e) => {
          // Start in the mobile number field rather than on the country picker
          const input = document.getElementById('auth-phone')
          if (input && window.matchMedia('(min-width: 768px)').matches) {
            e.preventDefault()
            input.focus()
          }
        }}
      >
        <DialogTitle className="sr-only">{dialog.intent === 'signup' ? 'Create your account' : 'Login or sign up'}</DialogTitle>
        <DialogDescription className="sr-only">
          Continue with your mobile number, Google or email.
        </DialogDescription>
        <div className="grid max-h-[calc(100svh-2rem)] grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <AuthPromo className="hidden md:block" />
          <div className="flex min-h-0 flex-col overflow-y-auto">
            <AuthPromo compact className="shrink-0 md:hidden" />
            <AuthPanel
              key={dialog.open ? 'open' : 'closed'}
              intent={dialog.intent}
              notice={dialog.notice}
              onSignedIn={onSignedIn}
              onSessionStarted={() => {
                sessionStarted.current = true
              }}
              onNavigateAway={() => onOpenChange(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
