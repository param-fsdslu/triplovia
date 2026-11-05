import { Facebook, Instagram, Youtube, type LucideIcon } from '@/components/icons'
import { SOCIAL_LINKS } from '@/lib/config/contact'
import { cn } from '@/lib/utils'

const ICONS: Record<(typeof SOCIAL_LINKS)[number]['name'], LucideIcon> = {
  Instagram,
  Facebook,
  YouTube: Youtube,
}

/**
 * Triplovia's social profiles (`SOCIAL_LINKS` in lib/config/contact.ts) as round icon links.
 * `tone="dark"` for teal backgrounds (footer), `"light"` for tinted ones on white, `"plain"` for small
 * outlined icons on white (phone menu).
 */
export function SocialLinks({ tone = 'dark', className }: { tone?: 'dark' | 'light' | 'plain'; className?: string }) {
  const links = SOCIAL_LINKS.filter((s) => s.url)
  if (links.length === 0) return null
  return (
    <ul className={cn('flex items-center', tone === 'plain' ? 'gap-1.5' : 'gap-2', className)}>
      {links.map(({ name, url }) => {
        const Icon = ICONS[name]
        return (
          <li key={name}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Triplovia on ${name}`}
              title={name}
              className={cn(
                'flex items-center justify-center rounded-full transition-colors',
                tone === 'plain' ? 'h-8 w-8' : 'h-9 w-9',
                tone === 'dark' && 'bg-white/10 text-white hover:bg-gold hover:text-secondary',
                tone === 'light' && 'bg-mint text-primary hover:bg-primary hover:text-primary-foreground',
                tone === 'plain' && 'border border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
              )}
            >
              <Icon className={tone === 'plain' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
