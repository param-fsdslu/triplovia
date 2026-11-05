'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { HERO_SLIDES } from '@/lib/config/hero-slides'

const SLIDE_MS = 6500
const FADE_MS = 1400

interface HeroSlideshowProps {
  /** Sizing for the slideshow box (height etc.) */
  className?: string
  /** Layout for the copy layer (container, alignment, padding) */
  contentClassName?: string
  /** Positioning for the slide indicators */
  dotsClassName?: string
}

/**
 * Full-bleed crossfading photos with a slow zoom, a neutral scrim for legibility, slide indicators,
 * and each slide's own copy (title and text from lib/config/hero-slides.ts). The copy of
 * every slide sits in the same grid cell, so the block keeps the height of the longest one and the
 * page never jumps; only the current one is visible. Pointing at the copy pauses the slideshow.
 */
export function HeroSlideshow({ className, contentClassName, dotsClassName }: HeroSlideshowProps) {
  const [index, setIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [paused, setPaused] = useState(false)
  const count = HERO_SLIDES.length

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  // Restarts on every change, so a slide picked by hand gets a full turn
  useEffect(() => {
    if (reduceMotion || paused || count < 2) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, reduceMotion, paused, count])

  return (
    <div className={cn('relative overflow-clip bg-secondary', className)}>
      {HERO_SLIDES.map((slide, i) => {
        const active = i === index
        return (
          <div
            key={slide.image}
            aria-hidden={!active}
            className="absolute inset-0"
            style={{
              opacity: active ? 1 : 0,
              transform: active && !reduceMotion ? 'scale(1.08)' : 'scale(1)',
              // Zoom in while showing; reset only once the slide has faded out
              transition: active
                ? `opacity ${FADE_MS}ms ease-in-out, transform ${SLIDE_MS + FADE_MS}ms ease-out`
                : `opacity ${FADE_MS}ms ease-in-out, transform 0ms linear ${FADE_MS}ms`,
            }}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              quality={85}
              className="object-cover object-center"
            />
          </div>
        )
      })}

      {/* Neutral scrim: keeps white copy readable on bright photos, darker at the top for the navbar
          and on the left behind the copy */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/45 via-black/15 to-transparent lg:w-3/4" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />

      <div className={cn('relative z-10 h-full', contentClassName)}>
        <div
          className="grid max-w-2xl [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {HERO_SLIDES.map((slide, i) => {
            const active = i === index
            const Title = active ? 'h1' : 'p'
            return (
              <div
                key={slide.image}
                aria-hidden={!active}
                className={cn('[grid-area:1/1] self-center', !active && 'invisible opacity-0')}
                // Setting the animation when a slide becomes current replays it
                style={active ? { animation: 'ht-hero-enter 0.7s ease-out both' } : undefined}
              >
                <Title className="text-[2.25rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[4rem]">
                  {slide.title}
                </Title>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:mt-5 sm:text-lg">{slide.text}</p>
              </div>
            )
          })}
        </div>
      </div>

      {count > 1 && (
        <div className={cn('absolute z-10 flex items-center gap-2', dotsClassName)}>
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1} of ${count}: ${slide.title}`}
              aria-current={i === index}
              className="group flex h-6 items-center"
            >
              <span
                className={cn(
                  'block h-[3px] rounded-full transition-all duration-500',
                  i === index ? 'w-9 bg-white' : 'w-4 bg-white/45 group-hover:bg-white/75'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
