'use client'

/**
 * BookingCartBar — the stay picked last, pinned to the bottom of the page by FloatingCartBar
 * (every page but the hotel, review and payment pages), with the hotel's name. The summary goes
 * back to the hotel's rooms, the button to checkout. Small 6px corners, not pills, by request.
 */
import { ArrowRight, BedDouble, CloudCheck, X } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { formatCurrency, getInclusivePrice } from '@/lib/utils'

interface CartRoom {
  id: string
  name: string
  base_price: number
  current_price?: number
}

interface BookingCartBarProps {
  rooms: CartRoom[]
  /** roomId → qty */
  cart: Map<string, number>
  /** e.g. "21 Oct – 22 Oct · 2 guests" */
  staySummary?: string
  /** Signed in: the selection is kept on the account (lib/actions/saved-stays.ts) */
  savedToAccount?: boolean
  /** Shown off the hotel page, where the bar has to say which hotel the rooms are at */
  hotelName?: string
  onEdit: () => void
  onClear: () => void
  onCheckout: () => void
}

export function BookingCartBar({ rooms, cart, staySummary, savedToAccount, hotelName, onEdit, onClear, onCheckout }: BookingCartBarProps) {
  const lines = Array.from(cart.entries()).flatMap(([roomId, qty]) => {
    const room = rooms.find((r) => r.id === roomId)
    return room ? [{ room, qty }] : []
  })
  if (lines.length === 0) return null

  const roomCount = lines.reduce((sum, { qty }) => sum + qty, 0)
  const nightlyTotal = lines.reduce(
    (sum, { room, qty }) => sum + getInclusivePrice(room.current_price ?? room.base_price) * qty,
    0
  )
  const roomsLabel = `${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}`
  const itemsLabel = lines.map(({ room, qty }) => `${room.name} × ${qty}`).join(', ')

  return (
    <div
      role="region"
      aria-label="Your booking"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-16px_rgba(7,63,61,0.35)] backdrop-blur-md animate-in slide-in-from-bottom duration-300"
    >
      <div className="page-container flex items-center gap-3 py-3 lg:gap-6">
        {/* Selected rooms: tap to go back to the rooms list */}
        <button
          type="button"
          onClick={onEdit}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="relative hidden h-11 w-11 shrink-0 items-center justify-center rounded-md bg-mint text-primary sm:flex">
            <BedDouble className="h-5 w-5" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {roomCount}
            </span>
          </span>
          <span className="min-w-0">
            {/* Phones lead with the price; desktop shows it beside the button */}
            <span className="block font-heading text-lg font-extrabold leading-tight text-foreground lg:hidden">
              {formatCurrency(nightlyTotal)}
              <span className="ml-1 font-sans text-xs font-medium text-muted-foreground">/ night</span>
            </span>
            <span className="hidden truncate text-sm font-semibold text-foreground lg:block">
              {hotelName ? `${roomsLabel} at ${hotelName}` : `${roomsLabel} added to your booking`}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              <span className="lg:hidden">{hotelName ? `${roomsLabel} at ${hotelName}` : roomsLabel} · </span>
              {itemsLabel}
              {staySummary && <span className="hidden lg:inline"> · {staySummary}</span>}
            </span>
            <span className="hidden items-center gap-3 text-xs lg:flex">
              <span className="font-semibold text-primary group-hover:underline">Change rooms</span>
              {savedToAccount && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CloudCheck className="h-3.5 w-3.5 text-primary" />
                  Saved to your account
                </span>
              )}
            </span>
          </span>
        </button>

        <div className="hidden shrink-0 text-right lg:block">
          <p className="font-heading text-xl font-extrabold leading-tight text-foreground">
            {formatCurrency(nightlyTotal)}
            <span className="ml-1 font-sans text-xs font-medium text-muted-foreground">/ night</span>
          </p>
          <p className="text-xs text-muted-foreground">incl. taxes &amp; fees</p>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            aria-label="Clear selected rooms"
            className="rounded-md text-muted-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" onClick={onClear} className="hidden rounded-md text-muted-foreground lg:inline-flex">
            Clear
          </Button>
          <Button type="button" onClick={onCheckout} className="h-11 gap-2 rounded-md px-5 font-bold sm:px-6">
            <span className="sm:hidden">Book now</span>
            <span className="hidden sm:inline">Proceed to checkout</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
