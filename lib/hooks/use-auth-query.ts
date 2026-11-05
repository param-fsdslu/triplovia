/**
 * TanStack Query hooks for the signed-in user and their profile.
 *
 * Auth state lives in an httpOnly Firebase session cookie, so these hooks read it through
 * server actions (lib/actions/session.ts) instead of a browser SDK.
 *
 * queryKeys: Centralized key factory — use these instead of raw string arrays to ensure
 * consistent invalidation across the app. Typed as `const` for inference safety.
 *
 * useInvalidatingMutation: Generic wrapper around useMutation that auto-invalidates
 * specified query keys on success. Use this for write operations that should refresh
 * related cached data (e.g. updating a profile should refetch useProfile).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCurrentUser, getProfile, updateProfileFields } from '@/lib/actions/session'

/**
 * Centralized query key factory for TanStack Query.
 * Using factory functions (byId, byStatus) ensures type-safe key construction
 * and makes it easy to invalidate all keys under a namespace (e.g. queryKeys.profile.all).
 */
export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },
  profile: {
    all: ['profile'] as const,
    byId: (id: string) => ['profile', id] as const,
  },
  // Add more query keys as needed for your app
  todos: {
    all: ['todos'] as const,
    byId: (id: string) => ['todos', id] as const,
    byStatus: (status: string) => ['todos', 'status', status] as const,
  },
} as const

/**
 * Returns the current user (null if unauthenticated): { id, email, user_metadata }.
 * Cached for 5 minutes so auth state is shared across the component tree.
 */
export function useUser() {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: () => getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Returns `{ user }` while signed in, otherwise null. Session tokens are httpOnly and
 * never exposed to the browser; use useUser() for most auth checks.
 */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async () => {
      const user = await getCurrentUser()
      return user ? { user } : null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetches a user's profile from the profiles table. Cached for 2 minutes.
 * Query is disabled until userId is provided. The profile row is created together
 * with the auth user (lib/firebase/auth/users.ts).
 */
export function useProfile(userId?: string) {
  return useQuery({
    queryKey: userId ? queryKeys.profile.byId(userId) : queryKeys.profile.all,
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required')

      const { data, error } = await getProfile(userId)
      if (error) throw new Error(error)
      return data
    },
    enabled: !!userId, // Only run query if userId exists
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Generic TanStack Query mutation wrapper. After a successful mutation, automatically
 * invalidates the specified query keys so dependent useQuery hooks refetch fresh data.
 *
 * Example usage:
 *   const mutation = useInvalidatingMutation({
 *     mutationFn: ({ id, updates }) => updateProfileFields(id, updates),
 *     invalidateKeys: [queryKeys.profile.all],
 *   })
 */
export function useInvalidatingMutation<TData = unknown, TVariables = unknown>({
  mutationFn,
  invalidateKeys,
  onSuccessCallback,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>
  invalidateKeys?: readonly (readonly string[])[]
  onSuccessCallback?: (data: TData) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      // Invalidate specified queries
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key as string[] })
        })
      }

      // Call custom success callback
      if (onSuccessCallback) {
        onSuccessCallback(data)
      }
    },
  })
}

/**
 * Mutation hook to update a user's profile row (editable fields only).
 * Invalidates queryKeys.profile.all on success so useProfile refetches.
 */
export function useUpdateProfile() {
  return useInvalidatingMutation<any, { userId: string; updates: Record<string, any> }>({
    mutationFn: async ({ userId, updates }) => {
      const { data, error } = await updateProfileFields(userId, updates)
      if (error) throw new Error(error)
      return data
    },
    invalidateKeys: [queryKeys.profile.all] as const,
  })
}
