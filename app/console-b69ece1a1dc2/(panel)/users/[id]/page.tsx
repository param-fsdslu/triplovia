import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  BadgeCheck,
  Bookmark,
  CalendarCheck,
  CreditCard,
  Heart,
  IndianRupee,
  KeyRound,
  LogIn,
  Mail,
  Phone,
  RotateCcw,
  Star,
  UserRound,
} from '@/components/icons'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getWebsiteUserDetails } from '@/lib/actions/website-users'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatCard } from '@/components/admin/StatCard'
import { StatusPill } from '@/components/admin/StatusPill'
import { WebsiteUserActions } from '@/components/admin/WebsiteUserActions'
import { SIGN_IN_LABELS, formatUserDate, formatUserTime, userStatus } from '@/components/admin/website-user-format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPhone } from '@/lib/utils/phone'
import { cn, formatRupees } from '@/lib/utils'

export const metadata = {
  title: 'User Profile - Admin Dashboard',
  description: 'A website user with their bookings, payments and saved hotels',
}

const TH = 'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'
const TD = 'px-4 py-3 align-top text-sm'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="font-medium text-foreground">{children ?? <span className="font-normal text-muted-foreground">Not given</span>}</div>
    </div>
  )
}

function SectionTitle({ icon: Icon, children }: { icon: typeof UserRound; children: ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      {children}
    </CardTitle>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export default async function WebsiteUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect(ADMIN_PATH)
  }

  const { id } = await params
  const result = await getWebsiteUserDetails(decodeURIComponent(id))
  if (!result.success) {
    if (result.notFound) notFound()
    if (result.vendor) redirect(`${ADMIN_PATH}/vendors`)
    return (
      <div className="space-y-6">
        <AdminPageHeader title="User Profile" backHref={`${ADMIN_PATH}/users`} backLabel="Back to Users" />
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading this user</p>
          <p className="text-sm">{result.error}</p>
        </div>
      </div>
    )
  }

  const { user, avatarUrl, profile, signIns, bookings, payments, refunds, wishlist, savedStays, reviews } = result.details
  const status = userStatus(user)
  const displayName = user.name || user.email || (user.phone && formatPhone(user.phone)) || 'Unnamed user'
  const initial = (user.name || user.email || '').charAt(0).toUpperCase()
  const refunded = refunds.filter((r) => r.status !== 'failed').reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={displayName}
        backHref={`${ADMIN_PATH}/users`}
        backLabel="Back to Users"
        description={<>Website user · joined {formatUserDate(user.createdAt, 'date unknown')}</>}
        actions={
          <>
            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', status.className)}>
              {status.label}
            </span>
            <WebsiteUserActions user={user} variant="page" />
          </>
        }
      />

      {/* Key figures */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Bookings"
          value={user.bookings}
          icon={CalendarCheck}
          hint={`${user.paidBookings} paid`}
        />
        <StatCard label="Total Paid" value={formatRupees(user.totalPaid)} icon={IndianRupee} hint="Paid bookings" tone="success" />
        <StatCard
          label="Refunded"
          value={formatRupees(refunded)}
          icon={RotateCcw}
          hint={plural(refunds.length, 'refund')}
          tone="warning"
        />
        <StatCard
          label="Last Sign In"
          value={formatUserDate(user.lastSignIn)}
          icon={LogIn}
          hint={user.lastSignIn ? formatUserTime(user.lastSignIn) : 'Has not signed in on the site'}
          tone="info"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <SectionTitle icon={UserRound}>Profile</SectionTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Google / storage photos from any host
                <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-border">
                  {initial ? (
                    <span className="text-xl font-medium text-muted-foreground">{initial}</span>
                  ) : (
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground">{user.name || 'No name yet'}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.methods.map((m) => (
                    <span key={m} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                      {SIGN_IN_LABELS[m]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
              <Field label="First name">{profile?.firstName || null}</Field>
              <Field label="Last name">{profile?.lastName || null}</Field>
              <Field label="Email">
                {user.email ? (
                  <span className="flex items-center gap-2 break-all">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {user.email}
                    {user.emailConfirmed && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Confirmed" />}
                  </span>
                ) : null}
              </Field>
              <Field label="Mobile">
                {user.phone ? (
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {formatPhone(user.phone)}
                  </span>
                ) : null}
              </Field>
              <Field label="Date of birth">{profile?.dateOfBirth ? formatUserDate(profile.dateOfBirth) : null}</Field>
              <Field label="Nationality">{profile?.nationality || null}</Field>
            </div>
            {profile?.bio && (
              <div className="border-t pt-4">
                <Field label="About">
                  <p className="whitespace-pre-line font-normal">{profile.bio}</p>
                </Field>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <SectionTitle icon={KeyRound}>Account &amp; Sign-in</SectionTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Signs in with</p>
              {signIns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sign-in method recorded</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {signIns.map((s) => (
                    <li key={s.method} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">{SIGN_IN_LABELS[s.method]}</span>
                      <span className="truncate text-muted-foreground">
                        {s.identifier ? (s.method === 'phone' ? formatPhone(s.identifier) : s.identifier) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
              <Field label="Status">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', status.className)}>
                  {status.label}
                </span>
              </Field>
              <Field label="Email confirmed">{user.email ? (user.emailConfirmed ? 'Yes' : 'No') : '—'}</Field>
              <Field label="Joined">
                {formatUserDate(user.createdAt, '—')}
                {user.createdAt && <span className="ml-1 font-normal text-muted-foreground">{formatUserTime(user.createdAt)}</span>}
              </Field>
              <Field label="Last sign-in">
                {formatUserDate(user.lastSignIn)}
                {user.lastSignIn && <span className="ml-1 font-normal text-muted-foreground">{formatUserTime(user.lastSignIn)}</span>}
              </Field>
              {profile?.updatedAt && <Field label="Profile updated">{formatUserDate(profile.updatedAt)}</Field>}
            </div>
            {user.incomplete && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Firebase signed this person in with Google or a mobile code, but the site never finished setting up
                their account, so there is no profile here yet.
              </p>
            )}
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{user.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings */}
      <Card>
        <CardHeader>
          <SectionTitle icon={CalendarCheck}>Bookings</SectionTitle>
          <CardDescription>
            {plural(bookings.length, 'booking')} made while signed in (guest checkouts count once claimed by a mobile sign-in)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <Empty>No bookings yet</Empty>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className={TH}>Booking</th>
                      <th className={TH}>Hotel</th>
                      <th className={TH}>Stay</th>
                      <th className={TH}>Guests</th>
                      <th className={cn(TH, 'text-right')}>Amount</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/60">
                        <td className={cn(TD, 'whitespace-nowrap')}>
                          <Link
                            href={`${ADMIN_PATH}/bookings/${encodeURIComponent(b.reference)}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {b.reference}
                          </Link>
                          <p className="text-xs text-muted-foreground">Booked {formatUserDate(b.createdAt, '—')}</p>
                          {b.invoiceNumber && <p className="text-xs text-muted-foreground">Invoice {b.invoiceNumber}</p>}
                        </td>
                        <td className={TD}>
                          <p className="font-medium text-foreground">{b.hotelName ?? 'Hotel removed'}</p>
                          <p className="text-xs text-muted-foreground">
                            {[b.roomType && `${b.roomType} × ${b.rooms}`, b.hotelCity].filter(Boolean).join(' · ')}
                          </p>
                          {b.specialRequests && (
                            <p className="mt-1 max-w-xs text-xs italic text-muted-foreground">“{b.specialRequests}”</p>
                          )}
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap')}>
                          <p className="text-foreground">
                            {formatUserDate(b.checkIn, '—')} → {formatUserDate(b.checkOut, '—')}
                          </p>
                          <p className="text-xs text-muted-foreground">{plural(b.nights, 'night')}</p>
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap text-muted-foreground')}>
                          {plural(b.adults, 'adult')}
                          {b.children > 0 && <>, {b.children} {b.children === 1 ? 'child' : 'children'}</>}
                          {b.withPets && <>, with pets</>}
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap text-right font-semibold text-foreground')}>
                          {formatRupees(b.total)}
                        </td>
                        <td className={TD}>
                          <div className="flex flex-col items-start gap-1">
                            <StatusPill status={b.bookingStatus} />
                            <StatusPill
                              status={b.paymentStatus}
                              label={b.paymentStatus === 'partially_refunded' ? 'Partial Refund' : undefined}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments & refunds */}
      <Card>
        <CardHeader>
          <SectionTitle icon={CreditCard}>Payments &amp; Refunds</SectionTitle>
          <CardDescription>
            {plural(payments.length, 'payment')} · {plural(refunds.length, 'refund')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {payments.length === 0 ? (
            <Empty>No payments yet</Empty>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className={TH}>Date</th>
                      <th className={TH}>Booking</th>
                      <th className={cn(TH, 'text-right')}>Amount</th>
                      <th className={TH}>Method</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Payment ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/60">
                        <td className={cn(TD, 'whitespace-nowrap')}>
                          {formatUserDate(p.paidAt, '—')}
                          <span className="block text-xs text-muted-foreground">{formatUserTime(p.paidAt)}</span>
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap')}>
                          {p.bookingReference ? (
                            <Link
                              href={`${ADMIN_PATH}/bookings/${encodeURIComponent(p.bookingReference)}`}
                              className="text-primary hover:underline"
                            >
                              {p.bookingReference}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap text-right font-semibold text-foreground')}>
                          {formatRupees(p.amount)}
                          {p.refundAmount > 0 && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {formatRupees(p.refundAmount)} refunded
                            </span>
                          )}
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap capitalize text-muted-foreground')}>{p.method ?? '—'}</td>
                        <td className={TD}>
                          <StatusPill status={p.status} />
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap font-mono text-xs text-muted-foreground')}>
                          {p.gatewayPaymentId ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {refunds.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Refunds</p>
              <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                      <tr>
                        <th className={TH}>Date</th>
                        <th className={TH}>Booking</th>
                        <th className={cn(TH, 'text-right')}>Refund</th>
                        <th className={cn(TH, 'text-right')}>Charge</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {refunds.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/60">
                          <td className={cn(TD, 'whitespace-nowrap')}>{formatUserDate(r.createdAt, '—')}</td>
                          <td className={cn(TD, 'whitespace-nowrap')}>
                            {r.bookingReference ? (
                              <Link
                                href={`${ADMIN_PATH}/bookings/${encodeURIComponent(r.bookingReference)}`}
                                className="text-primary hover:underline"
                              >
                                {r.bookingReference}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className={cn(TD, 'whitespace-nowrap text-right font-semibold text-foreground')}>
                            {formatRupees(r.amount)}
                          </td>
                          <td className={cn(TD, 'whitespace-nowrap text-right text-muted-foreground')}>
                            {formatRupees(r.cancellationCharge)}
                          </td>
                          <td className={TD}>
                            <StatusPill status={r.status} />
                          </td>
                          <td className={cn(TD, 'text-muted-foreground')}>{r.reason ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Wishlist */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Heart}>Wishlist</SectionTitle>
            <CardDescription>{plural(wishlist.length, 'saved hotel')}</CardDescription>
          </CardHeader>
          <CardContent>
            {wishlist.length === 0 ? (
              <Empty>Nothing in the wishlist</Empty>
            ) : (
              <ul className="divide-y rounded-lg border">
                {wishlist.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <Link href={`${ADMIN_PATH}/hotels/${w.hotelId}`} className="font-medium text-foreground hover:text-primary hover:underline">
                        {w.hotelName ?? 'Hotel removed'}
                      </Link>
                      {w.city && <p className="text-xs text-muted-foreground">{w.city}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">Added {formatUserDate(w.addedAt, '—')}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Saved rooms */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Bookmark}>Saved Rooms</SectionTitle>
            <CardDescription>Rooms picked but not paid for yet (one pick per hotel)</CardDescription>
          </CardHeader>
          <CardContent>
            {savedStays.length === 0 ? (
              <Empty>No saved rooms</Empty>
            ) : (
              <ul className="divide-y rounded-lg border">
                {savedStays.map((s) => (
                  <li key={s.id} className="space-y-1 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`${ADMIN_PATH}/hotels/${s.hotelId}`} className="font-medium text-foreground hover:text-primary hover:underline">
                        {s.hotelName ?? 'Hotel removed'}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">Updated {formatUserDate(s.updatedAt, '—')}</span>
                    </div>
                    <p className="text-muted-foreground">{s.rooms.map((r) => `${r.name} × ${r.qty}`).join(', ') || 'No rooms'}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.checkIn ? `${formatUserDate(s.checkIn)} → ${formatUserDate(s.checkOut, '—')}` : 'No dates'}
                      {' · '}
                      {plural(s.adults, 'adult')}
                      {s.children > 0 && `, ${s.children} ${s.children === 1 ? 'child' : 'children'}`}
                      {s.pets && ', with pets'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <SectionTitle icon={Star}>Reviews</SectionTitle>
          <CardDescription>{plural(reviews.length, 'review')} written</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <Empty>No reviews yet</Empty>
          ) : (
            <ul className="divide-y rounded-lg border">
              {reviews.map((r) => (
                <li key={r.id} className="space-y-1.5 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`${ADMIN_PATH}/hotels/${r.hotelId}`} className="font-medium text-foreground hover:text-primary hover:underline">
                      {r.hotelName ?? 'Hotel removed'}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Star className="h-4 w-4 fill-gold text-gold" />
                        {r.stars}/5
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                          r.status === 'approved'
                            ? 'bg-primary/10 text-secondary'
                            : r.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {r.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatUserDate(r.createdAt, '—')}</span>
                    </div>
                  </div>
                  {r.title && <p className="font-medium text-foreground">{r.title}</p>}
                  {r.comment && <p className="whitespace-pre-line text-muted-foreground">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
