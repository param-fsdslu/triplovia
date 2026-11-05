import { redirect } from '@/i18n/routing'

/** The dashboard was retired: its bookings list (cancel, review, invoice) now lives on My Bookings. Old links land there. */
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect({ href: '/bookings', locale })
}
