/**
 * MapPattern — a quiet decorative layer for coloured banners (booking details hero): faint
 * topographic contour rings in two corners and a soft light at the top centre, behind the
 * banner's icon and title. Nothing runs behind the centred text or buttons (the earlier grid,
 * dashed route and pins were removed by request). Absolutely positioned, so put it first inside
 * a `relative overflow-hidden` container; it scales to cover. Lines use the parent's text colour.
 */
import { cn } from '@/lib/utils'

/** One irregular closed contour around (cx, cy): an ellipse wobbled by a few sine terms */
function contour(cx: number, cy: number, r: number, seed: number) {
  const points: string[] = []
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2
    const rr = r * (1 + 0.1 * Math.sin(3 * t + seed) + 0.06 * Math.sin(5 * t + seed * 1.7) + 0.04 * Math.sin(7 * t + seed * 2.3))
    points.push(`${(cx + rr * Math.cos(t) * 1.3).toFixed(1)},${(cy + rr * Math.sin(t) * 0.8).toFixed(1)}`)
  }
  return `M${points.join('L')}Z`
}

/** Two "hills" of contour rings, tucked into the bottom-left and top-right corners of an 800×320 canvas */
const CONTOURS = [
  ...Array.from({ length: 5 }, (_, i) => contour(40, 330, 30 + i * 30, 1.3)),
  ...Array.from({ length: 5 }, (_, i) => contour(780, -10, 26 + i * 30, 4.1)),
]

export function MapPattern({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 text-white', className)}>
      {/* Soft light behind the icon and title */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(255,255,255,0.14),transparent_70%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid slice" fill="none">
        <g stroke="currentColor" strokeWidth="1" opacity="0.1">
          {CONTOURS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
    </div>
  )
}
