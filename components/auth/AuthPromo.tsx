'use client'

/**
 * Rotating offer / brand slides beside the login panel. Content lives in
 * lib/config/auth-promos.ts. `compact` is the short banner used above the form on phones.
 */
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AUTH_PROMOS } from '@/lib/config/auth-promos'
import { cn } from '@/lib/utils'

const SLIDE_MS = 5000

function useSlide(count: number) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => clearInterval(timer)
  }, [paused, count])

  return { index, setIndex, setPaused }
}

export function AuthPromo({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { index, setIndex, setPaused } = useSlide(AUTH_PROMOS.length)

  return (
    <div
      className={cn('relative overflow-hidden bg-secondary text-white', compact ? 'h-32' : 'min-h-[560px]', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {AUTH_PROMOS.map((promo, i) => (
        <div
          key={promo.title}
          aria-hidden={i !== index}
          className={cn('absolute inset-0 transition-opacity duration-700', i === index ? 'opacity-100' : 'opacity-0')}
        >
          <Image
            src={promo.image}
            alt=""
            fill
            sizes={compact ? '100vw' : '(min-width: 768px) 420px, 100vw'}
            className="object-cover"
            priority={i === 0}
          />
          <div
            className={cn(
              'absolute inset-0',
              compact
                ? 'bg-linear-to-r from-secondary/95 via-secondary/75 to-secondary/30'
                : 'bg-linear-to-t from-secondary via-secondary/55 to-secondary/10'
            )}
          />
          <div className={cn('absolute', compact ? 'inset-y-0 left-0 flex max-w-[78%] flex-col justify-center px-5' : 'inset-x-0 bottom-0 p-8 pb-14')}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">{promo.eyebrow}</p>
            <h3 className={cn('mt-1.5 font-bold leading-snug text-white', compact ? 'text-base' : 'text-2xl')}>
              {promo.title}
            </h3>
            {!compact && <p className="mt-2 text-sm leading-relaxed text-white/75">{promo.text}</p>}
          </div>
        </div>
      ))}

      {!compact && (
        <div className="absolute left-8 top-7 flex items-center gap-2">
          <Image src="/company-logo-only.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <Image
            src="/company-logo-text-only.svg"
            alt="Triplovia"
            width={104}
            height={24}
            className="h-5 w-auto brightness-0 invert"
          />
        </div>
      )}

      <div className={cn('absolute flex gap-1.5', compact ? 'bottom-3 right-4' : 'bottom-7 left-8')}>
        {AUTH_PROMOS.map((promo, i) => (
          <button
            key={promo.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}`}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === index ? 'w-6 bg-gold' : 'w-1.5 bg-white/45 hover:bg-white/70'
            )}
          />
        ))}
      </div>
    </div>
  )
}
