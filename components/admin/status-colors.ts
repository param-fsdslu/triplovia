/**
 * One colour per booking / payment status across the admin (booking calendar bars, StatusPill
 * in tables and booking pages): solid fills with white text. Confirmed and paid use the brand green.
 */
export interface StatusColor {
  fill: string
  hover: string
  /** A darker edge, e.g. where a calendar bar starts */
  edge: string
  dot: string
}

const GREEN: StatusColor = { fill: 'bg-primary', hover: 'hover:bg-primary-hover', edge: 'border-secondary', dot: 'bg-primary' }
const AMBER: StatusColor = { fill: 'bg-amber-600', hover: 'hover:bg-amber-700', edge: 'border-amber-800', dot: 'bg-amber-600' }
const BLUE: StatusColor = { fill: 'bg-sky-600', hover: 'hover:bg-sky-700', edge: 'border-sky-800', dot: 'bg-sky-600' }
const GREY: StatusColor = { fill: 'bg-slate-500', hover: 'hover:bg-slate-600', edge: 'border-slate-700', dot: 'bg-slate-500' }
const RED: StatusColor = { fill: 'bg-red-600', hover: 'hover:bg-red-700', edge: 'border-red-800', dot: 'bg-red-600' }

const STATUS_COLORS: Record<string, StatusColor> = {
  // booking
  confirmed: GREEN,
  pending: AMBER,
  checked_in: BLUE,
  checked_out: GREY,
  completed: GREY,
  no_show: GREY,
  cancelled: RED,
  // payment
  paid: GREEN,
  success: GREEN, // payments.status of a captured payment
  processing: AMBER,
  refund_requested: AMBER,
  refunded: GREY,
  partially_refunded: GREY,
  failed: RED,
}

export const statusColor = (status: string): StatusColor => STATUS_COLORS[status] ?? GREY
