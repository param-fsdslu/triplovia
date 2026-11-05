import Image from 'next/image'
import { Check, CheckCircle2, ShieldCheck, Smartphone } from '@/components/icons'

/** Two Indian travellers laughing at a phone among palms and bougainvillea (Unsplash). Portrait crop
 * centred right of the middle so both faces and the phone stay in frame. */
const PERSON_PHOTO =
  'https://images.unsplash.com/photo-1625463006115-09f08489f591?auto=format&fit=crop&crop=focalpoint&fp-x=0.64&fp-y=0.5&w=900&h=1100&q=80'
const STAY_PHOTO = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&h=260&q=75'

const POINTS = [
  'Sign in with just your mobile number',
  'Pay with UPI, cards or net banking',
  'Your booking is confirmed the moment you pay',
]

/**
 * Homepage promo under the trust points: booking from a phone. A deep-teal panel with the pitch and
 * three points on the left, and on the right a photo of two travellers on a phone with a phone mockup of a
 * confirmed booking (illustrative: no real hotel, dates or price) and a "Secure UPI checkout" chip.
 */
export function PhoneBookingPromo() {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-secondary text-white">
      {/* Soft glows for depth */}
      <div className="absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
      <div className="absolute -bottom-32 right-1/3 -z-10 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />

      <div className="grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:p-14">
        {/* ── The pitch ───────────────────────────────── */}
        <div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-gold">
            <Smartphone className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            Book your coastal stay in a few taps
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">
            Find a room, check the price for your dates and pay, all from your phone. No app to install.
          </p>

          <ul className="mt-6 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-white/90 sm:text-base">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Person + phone mockup ───────────────────── */}
        <div className="relative mx-auto w-full max-w-md pb-6 pl-10 sm:pl-24 lg:mr-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-white/15">
            <Image
              src={PERSON_PHOTO}
              alt="Two travellers laughing as they look at a phone together"
              fill
              sizes="(min-width: 1024px) 420px, 90vw"
              className="object-cover"
            />
          </div>

          {/* Chip, top right */}
          <div className="absolute -right-2 top-6 flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 text-xs font-semibold text-foreground shadow-xl sm:right-[-1.25rem] sm:text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Secure UPI checkout
          </div>

          {/* Phone mockup, overlapping the photo's lower left */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 w-[150px] rounded-[2rem] border-[5px] border-foreground bg-foreground shadow-2xl sm:w-[190px]"
          >
            <div className="relative overflow-hidden rounded-[1.6rem] bg-background">
              <div className="absolute left-1/2 top-1.5 h-4 w-14 -translate-x-1/2 rounded-full bg-foreground" />
              <div className="px-3 pb-4 pt-8 sm:px-3.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary sm:text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Booking confirmed
                </div>
                <div className="relative mt-2.5 h-16 overflow-hidden rounded-xl sm:h-20">
                  <Image src={STAY_PHOTO} alt="" fill sizes="190px" className="object-cover" />
                </div>
                <p className="mt-2 font-heading text-xs font-bold leading-tight text-foreground sm:text-sm">Sea-view room</p>
                <p className="text-[9px] text-muted-foreground sm:text-[11px]">Honnavar, Karnataka</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-center">
                  <div className="rounded-lg bg-mint px-1 py-1.5">
                    <p className="text-[8px] uppercase tracking-wide text-muted-foreground sm:text-[9px]">Nights</p>
                    <p className="text-[11px] font-bold text-foreground sm:text-xs">2</p>
                  </div>
                  <div className="rounded-lg bg-mint px-1 py-1.5">
                    <p className="text-[8px] uppercase tracking-wide text-muted-foreground sm:text-[9px]">Guests</p>
                    <p className="text-[11px] font-bold text-foreground sm:text-xs">2</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-[9px] sm:text-[11px]">
                  <span className="text-muted-foreground">Paid via UPI</span>
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <div className="mt-2.5 rounded-full bg-primary py-1.5 text-center text-[10px] font-semibold text-primary-foreground sm:text-xs">
                  View booking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
