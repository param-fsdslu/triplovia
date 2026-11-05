# TanStack Query Integration Guide

This project uses TanStack Query (React Query) for efficient data fetching, caching, and state management with Supabase.

## Setup

The QueryClient is configured in [`lib/providers/query-provider.tsx`](lib/providers/query-provider.tsx) with optimal defaults:

- **Stale Time**: 5 minutes (data stays fresh)
- **Cache Time**: 10 minutes (unused data retention)
- **Retry**: 2 attempts with exponential backoff
- **Devtools**: Enabled in development mode

## Query Keys Convention

Use the query keys factory pattern for consistency:

```typescript
export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },
  profile: {
    all: ['profile'] as const,
    byId: (id: string) => ['profile', id] as const,
  },
}
```

## Best Practices

### 1. Use Custom Hooks

Create dedicated hooks for each data operation:

```typescript
export function useUser() {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

### 2. Optimistic Updates

For better UX, update UI before server confirmation:

```typescript
export function useToggleTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, completed }) => {
      // Server update
    },
    onMutate: async ({ id, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() })

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData(todoKeys.lists())

      // Optimistically update
      queryClient.setQueryData(todoKeys.lists(), (old) =>
        old?.map((todo) =>
          todo.id === id ? { ...todo, completed } : todo
        )
      )

      return { previousTodos }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      queryClient.setQueryData(todoKeys.lists(), context.previousTodos)
    },
  })
}
```

### 3. Automatic Cache Invalidation

Invalidate related queries after mutations:

```typescript
export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input) => {
      // Create todo
    },
    onSuccess: () => {
      // Refetch todos list
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}
```

### 4. Conditional Queries

Only run queries when data is available:

```typescript
export function useProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.profile.byId(userId!),
    queryFn: async () => {
      // Fetch profile
    },
    enabled: !!userId, // Only run if userId exists
  })
}
```

### 5. Loading and Error States

Handle all query states in your components:

```typescript
function TodoList() {
  const { data, isLoading, isError, error } = useTodos()

  if (isLoading) {
    return <Loader2 className="animate-spin" />
  }

  if (isError) {
    return <Alert variant="destructive">{error.message}</Alert>
  }

  return <div>{/* Render todos */}</div>
}
```

## Example Hooks

### Query Hook (Read)

```typescript
export function useTodos() {
  const supabase = createClient()

  return useQuery({
    queryKey: todoKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}
```

### Mutation Hook (Write)

```typescript
export function useCreateTodo() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTodoInput) => {
      const { data, error } = await supabase
        .from('todos')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}
```

## Component Usage

```typescript
'use client'

import { useTodos, useCreateTodo } from '@/lib/hooks/use-todos'

export default function TodoList() {
  const { data: todos, isLoading } = useTodos()
  const createTodo = useCreateTodo()

  const handleCreate = async (title: string) => {
    try {
      await createTodo.mutateAsync({ title })
    } catch (error) {
      console.error('Failed to create:', error)
    }
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {todos?.map((todo) => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  )
}
```

## Performance Optimizations

### 1. Prefetching

Prefetch data before user interaction:

```typescript
const queryClient = useQueryClient()

queryClient.prefetchQuery({
  queryKey: todoKeys.detail(id),
  queryFn: () => fetchTodo(id),
})
```

### 2. Background Refetching

Data refetches automatically on:
- Window focus (production only)
- Network reconnection
- Component remount

### 3. Stale-While-Revalidate

Show cached data immediately while fetching fresh data:

```typescript
useQuery({
  queryKey: todoKeys.lists(),
  queryFn: fetchTodos,
  staleTime: 30 * 1000, // Consider fresh for 30s
  gcTime: 5 * 60 * 1000, // Keep in cache for 5min
})
```

## Devtools

Access React Query Devtools in development:
- Bottom-right corner of the screen
- View all queries, mutations, and cache
- Inspect query states and refetch manually
- Debug stale/fresh data

## File Structure

```
lib/
├── providers/
│   └── query-provider.tsx          # QueryClient setup
├── hooks/
│   ├── use-supabase-query.ts       # Auth & generic hooks
│   └── use-todos.ts                # Example CRUD hooks
└── supabase/
    ├── client.ts                   # Browser client
    └── server.ts                   # Server client

components/
└── examples/
    └── TodoList.tsx                # Example component
```

## Migration Guide

To add TanStack Query to existing code:

1. **Wrap with QueryProvider** (already done in root layout)
2. **Create query keys** for your data
3. **Replace fetch calls** with `useQuery`
4. **Replace mutations** with `useMutation`
5. **Handle loading/error states** in UI

## Additional Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Supabase + React Query](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
- Example: [`components/examples/TodoList.tsx`](components/examples/TodoList.tsx)
- Hooks: [`lib/hooks/use-todos.ts`](lib/hooks/use-todos.ts)
