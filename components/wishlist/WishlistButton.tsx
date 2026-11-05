'use client'

import { Heart } from '@/components/icons'
import { useUser } from '@/lib/hooks/use-auth-query'
import { useWishlist, useToggleWishlist } from '@/lib/hooks/use-wishlist'
import { useUIStore } from '@/lib/stores/use-ui-store'
import { cn } from '@/lib/utils'

interface WishlistButtonProps {
  hotelId: string
  className?: string
}

export function WishlistButton({ hotelId, className }: WishlistButtonProps) {
  const { data: user } = useUser()
  const { data: wishlistIds = [] } = useWishlist()
  const toggleMutation = useToggleWishlist()
  const openAuth = useUIStore((s) => s.openAuth)

  const isWishlisted = wishlistIds.includes(hotelId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      openAuth({ intent: 'login', notice: 'Sign in to save stays to your wishlist.' })
      return
    }

    toggleMutation.mutate(hotelId)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-sm',
        className
      )}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        className={cn(
          'h-5 w-5 transition-colors',
          isWishlisted
            ? 'fill-red-500 text-red-500'
            : 'text-muted-foreground hover:text-red-500'
        )}
      />
    </button>
  )
}
