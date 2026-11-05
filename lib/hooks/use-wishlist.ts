import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserWishlist } from '@/lib/actions/wishlists'
import { useUser } from './use-auth-query'

const wishlistKeys = {
  all: ['wishlist'] as const,
  user: (userId: string) => ['wishlist', userId] as const,
}

async function fetchUserWishlist(): Promise<string[]> {
  const result = await getUserWishlist()
  if (!result.success) throw new Error(result.error)
  return result.data
}

export function useWishlist() {
  const { data: user } = useUser()
  return useQuery({
    queryKey: wishlistKeys.user(user?.id ?? ''),
    queryFn: fetchUserWishlist,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useToggleWishlist() {
  const queryClient = useQueryClient()
  const { data: user } = useUser()

  return useMutation({
    mutationFn: async (hotelId: string) => {
      const { toggleWishlist } = await import('@/lib/actions/wishlists')
      const result = await toggleWishlist(hotelId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onMutate: async (hotelId: string) => {
      if (!user?.id) return
      const key = wishlistKeys.user(user.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<string[]>(key)
      queryClient.setQueryData<string[]>(key, (old = []) =>
        old.includes(hotelId)
          ? old.filter((id) => id !== hotelId)
          : [...old, hotelId]
      )
      return { previous }
    },
    onError: (_err, _hotelId, context) => {
      if (user?.id && context?.previous) {
        queryClient.setQueryData(wishlistKeys.user(user.id), context.previous)
      }
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: wishlistKeys.user(user.id) })
      }
    },
  })
}
