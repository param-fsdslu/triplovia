import type { SVGProps } from 'react'

/** Bold, solid suitcase for "My Trips" / bookings (uses currentColor) */
export function TripsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {/* Handle */}
      <path
        d="M8.75 6.5V4.75A1.75 1.75 0 0 1 10.5 3h3a1.75 1.75 0 0 1 1.75 1.75V6.5"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      {/* Case with two strap slots cut out */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M5.75 5.75h12.5a3.25 3.25 0 0 1 3.25 3.25v8a3.25 3.25 0 0 1-3.25 3.25H5.75A3.25 3.25 0 0 1 2.5 17V9a3.25 3.25 0 0 1 3.25-3.25ZM7.6 8.6h1.3v8.8H7.6V8.6Zm7.5 0h1.3v8.8h-1.3V8.6Z"
      />
      {/* Wheels */}
      <circle cx="7.25" cy="21.75" r="1.35" fill="currentColor" />
      <circle cx="16.75" cy="21.75" r="1.35" fill="currentColor" />
    </svg>
  )
}
