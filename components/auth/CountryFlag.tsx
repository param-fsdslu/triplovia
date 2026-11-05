/**
 * Small inline SVG flags for the phone country picker (emoji flags don't render on Windows).
 * Simplified to read clearly at ~20px. The svg carries a size-* class so parents like
 * SelectTrigger, which force size-4 on unsized icons, leave it alone.
 */
import { cn } from '@/lib/utils'

const UNION = (
  <>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
  </>
)

function FlagArt({ iso }: { iso: string }) {
  switch (iso) {
    case 'IN':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 30 20">
          <rect width="30" height="6.67" fill="#FF9933" />
          <rect y="6.67" width="30" height="6.67" fill="#fff" />
          <rect y="13.33" width="30" height="6.67" fill="#138808" />
          <circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" strokeWidth="0.7" />
          <circle cx="15" cy="10" r="0.6" fill="#000080" />
        </svg>
      )
    case 'AE':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 30 20">
          <rect width="30" height="6.67" fill="#00732F" />
          <rect y="6.67" width="30" height="6.67" fill="#fff" />
          <rect y="13.33" width="30" height="6.67" fill="#000" />
          <rect width="7.5" height="20" fill="#FF0000" />
        </svg>
      )
    case 'US':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 30 20">
          <rect width="30" height="20" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => (
            <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#B22234" />
          ))}
          <rect width="12" height={(20 / 13) * 7} fill="#3C3B6E" />
        </svg>
      )
    case 'GB':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 60 30">
          <rect width="60" height="30" fill="#012169" />
          {UNION}
        </svg>
      )
    case 'AU':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 60 30">
          <rect width="60" height="30" fill="#012169" />
          <g transform="scale(0.5)">{UNION}</g>
          <circle cx="15" cy="22.5" r="3" fill="#fff" />
          {[
            [45, 6],
            [52, 12.5],
            [45, 25],
            [38.5, 13],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="#fff" />
          ))}
        </svg>
      )
    case 'SG':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 30 20">
          <rect width="30" height="10" fill="#EF3340" />
          <rect y="10" width="30" height="10" fill="#fff" />
          <circle cx="7" cy="5" r="3.4" fill="#fff" />
          <circle cx="8.4" cy="5" r="3.2" fill="#EF3340" />
          {[
            [10.4, 3.1],
            [12.1, 4.3],
            [11.5, 6.3],
            [9.3, 6.3],
            [8.7, 4.3],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.55" fill="#fff" />
          ))}
        </svg>
      )
    case 'DE':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 30 20">
          <rect width="30" height="6.67" fill="#000" />
          <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
          <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
        </svg>
      )
    case 'FR':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 30 20">
          <rect width="10" height="20" fill="#0055A4" />
          <rect x="10" width="10" height="20" fill="#fff" />
          <rect x="20" width="10" height="20" fill="#EF4135" />
        </svg>
      )
    case 'ES':
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 30 20">
          <rect width="30" height="20" fill="#AA151B" />
          <rect y="5" width="30" height="10" fill="#F1BF00" />
        </svg>
      )
    default:
      return (
        <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 30 20">
          <rect width="30" height="20" fill="#E2E9E5" />
        </svg>
      )
  }
}

export function CountryFlag({ iso, className }: { iso: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10',
        className
      )}
    >
      <FlagArt iso={iso} />
    </span>
  )
}
