import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from '@/components/icons'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { createClient } from '@/lib/db/server'
import { getAdminRole } from '@/lib/utils/roles'

export const metadata: Metadata = { title: 'Sign in' }

/** The admin panel's own sign-in page, outside (panel) so its session check doesn't apply */
export default async function AdminLoginPage() {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()

  // Already signed in as an admin: straight to the panel
  if (getAdminRole(user)) redirect(ADMIN_PATH)

  const signedInAs = user ? user.email ?? user.user_metadata?.phone ?? 'another account' : null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-secondary px-4 py-10">
      <div className="w-full max-w-[420px] rounded-2xl bg-card p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="mb-6 space-y-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Sign in with your admin account.</p>
          </div>
        </div>

        {signedInAs && (
          <p className="mb-5 rounded-lg bg-muted px-3.5 py-2.5 text-sm text-foreground">
            You're signed in as <strong className="break-all">{signedInAs}</strong>, which has no admin
            access. Signing in here switches to your admin account.
          </p>
        )}

        <AdminLoginForm />
      </div>

      <a href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </a>
    </div>
  )
}
