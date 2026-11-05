/**
 * The admin dashboard's layout (the page fetches, this renders): key figures, the booking
 * calendar (hotel admins only: `calendarHotels`), then recent bookings as a table beside a
 * panel of today's / pending / confirmed bookings.
 */
import type { ReactNode } from 'react'
import { format } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Hotel,
  TrendingUp,
  Users,
  type LucideIcon,
} from '@/components/icons'
import { AdminPageHeader } from './AdminPageHeader'
import { BookingCalendar, type CalendarLoader } from './BookingCalendar'
import { StatCard, TONES, type StatTone } from './StatCard'
import { StatusPill } from './StatusPill'
import { cn } from '@/lib/utils'

export interface DashboardStats {
  totalHotels: number
  totalBookings: number
  totalRevenue: number
  totalUsers: number
  bookingsToday: number
  pendingBookings: number
  confirmedBookings: number
}

export interface DashboardActivity {
  id: string
  guest_first_name?: string | null
  guest_last_name?: string | null
  booking_status: string
  payment_status: string
  booking_reference: string
  created_at: string
  total_amount: number
  hotel?: { name?: string | null } | null
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

/** A titled white panel */
function Panel({
  title,
  description,
  className,
  children,
}: {
  title: string
  description?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(7,63,61,0.06)]',
        className
      )}
    >
      <header className="border-b border-border px-5 py-3.5">
        <h2 className="font-heading text-[15px] font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  )
}

interface DashboardViewProps {
  stats: DashboardStats
  activities: DashboardActivity[]
  /** The hotel admin's hotels: shows the booking calendar (null/undefined: not shown) */
  calendarHotels?: { id: string; name: string }[] | null
  /** Overrides how the calendar loads a month (design previews) */
  calendarLoad?: CalendarLoader
}

export function DashboardView({ stats, activities, calendarHotels, calendarLoad }: DashboardViewProps) {
  const keyFigures: { title: string; value: string | number; icon: LucideIcon; description: string; tone: StatTone }[] = [
    { title: 'Total Hotels', value: stats.totalHotels, icon: Hotel, description: 'Active hotels in the system', tone: 'primary' },
    { title: 'Total Bookings', value: stats.totalBookings, icon: Calendar, description: 'All time bookings', tone: 'info' },
    { title: 'Total Revenue', value: rupees(stats.totalRevenue), icon: DollarSign, description: 'From paid bookings', tone: 'violet' },
    { title: 'Total Users', value: stats.totalUsers, icon: Users, description: 'Registered users', tone: 'warning' },
  ]

  const bookingFigures: { title: string; value: number; icon: LucideIcon; description: string; tone: StatTone }[] = [
    { title: 'Bookings Today', value: stats.bookingsToday, icon: TrendingUp, description: 'New bookings today', tone: 'info' },
    { title: 'Pending Bookings', value: stats.pendingBookings, icon: Clock, description: 'Awaiting confirmation', tone: 'warning' },
    { title: 'Confirmed Bookings', value: stats.confirmedBookings, icon: CheckCircle2, description: 'Active reservations', tone: 'success' },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Admin Dashboard" description="Overview of your hotel booking platform" />

      {/* Key figures */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {keyFigures.map((stat) => (
          <StatCard
            key={stat.title}
            label={stat.title}
            value={stat.value}
            icon={stat.icon}
            hint={stat.description}
            tone={stat.tone}
          />
        ))}
      </div>

      {calendarHotels && <BookingCalendar hotels={calendarHotels} load={calendarLoad} />}

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Recent Activity */}
        <Panel title="Recent Bookings" description="Latest booking activity" className="xl:col-span-2">
          {activities.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Guest</th>
                    <th className="px-3 py-2.5 font-semibold">Hotel</th>
                    <th className="px-3 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="transition-colors hover:bg-mint/40">
                      <td className="whitespace-nowrap px-5 py-3">
                        <p className="font-semibold text-foreground">
                          {activity.guest_first_name} {activity.guest_last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Ref: {activity.booking_reference}</p>
                      </td>
                      <td className="max-w-[240px] px-3 py-3">
                        <p className="truncate text-foreground/90">{activity.hotel?.name}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusPill status={activity.booking_status} />
                          <StatusPill status={activity.payment_status} />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-heading font-bold text-foreground">
                        {rupees(activity.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Booking figures */}
        <Panel title="Bookings" className="self-start">
          <div className="divide-y divide-border">
            {bookingFigures.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.title} className="flex items-center gap-3 px-5 py-4">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONES[stat.tone])}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{stat.title}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                  <p className="font-heading text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </div>
  )
}
