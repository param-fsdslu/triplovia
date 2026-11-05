import { BadgeCheck, CalendarX2, Headset, ShieldCheck } from '@/components/icons'
import { PhoneBookingPromo } from '@/components/home/PhoneBookingPromo'

// Keep each text about two lines long so the cells stay even
const POINTS = [
  {
    icon: BadgeCheck,
    title: 'Curated stays',
    text: 'Hotels and homestays picked along the Honnavar coast.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    text: 'UPI, cards and net banking, secured by Razorpay.',
  },
  {
    icon: CalendarX2,
    title: 'Flexible cancellation',
    text: 'Cancellation and refund terms shown before you book.',
  },
  {
    icon: Headset,
    title: 'Local support',
    text: 'Real people in Honnavar, a call or WhatsApp away.',
  },
]

/**
 * Four reasons to book with Triplovia under the hero search, as one white strip of equal cells with
 * hairline dividers (the border colour shows through a 1px grid gap), then the book-on-your-phone promo.
 */
export function TrustBar() {
  return (
    <section className="pb-12 pt-10 sm:pb-16 sm:pt-12">
      <div className="page-container">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-[0_1px_3px_rgba(7,63,61,0.06)] sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3.5 bg-card p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold leading-tight text-foreground">{title}</h3>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-10">
          <PhoneBookingPromo />
        </div>
      </div>
    </section>
  )
}
