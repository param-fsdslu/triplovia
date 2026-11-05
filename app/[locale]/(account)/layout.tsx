import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AccountSidebar } from '@/components/account/AccountSidebar'
import { formatPhone } from '@/lib/utils/phone'

/** Signed-in guest area (profile, bookings, wishlist): site navbar on top, account sidebar on the left */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) redirect('/auth/login')

  const meta = user.user_metadata ?? {}
  const name = meta.full_name || [meta.first_name, meta.last_name].filter(Boolean).join(' ')
  const contact = user.email || (meta.phone ? formatPhone(meta.phone) : '')
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    : undefined
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar transparent={false} />

      <div className="flex-1 pt-16 sm:pt-[72px]">
        <div className="page-container py-6 sm:py-8 lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <AccountSidebar name={name} contact={contact} memberSince={memberSince} />
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <Footer />
    </div>
  )
}
