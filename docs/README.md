# Next.js Production Starter Kit

A production-ready Next.js 15 starter template with TypeScript, Tailwind CSS, shadcn/ui, Supabase authentication, internationalization (i18n), and TanStack Query.

## Features

### Core Stack
- **Next.js 15** - App Router with React Server Components
- **TypeScript** - Full type safety
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible component library
- **Supabase** - Backend as a Service (Auth, Database, Storage)
- **TanStack Query** - Powerful data synchronization
- **next-intl** - Enterprise-grade internationalization

### Authentication & Security
- ✅ Server-side authentication with Supabase
- ✅ Protected routes via middleware
- ✅ Server Actions for secure mutations
- ✅ Session management and refresh
- ✅ Email/password authentication
- ✅ Password reset flow
- ✅ Auth callback handling

### UI & UX
- ✅ shadcn/ui components (Button, Input, Label, Card, Alert, Form, Checkbox)
- ✅ Responsive design patterns
- ✅ Loading states and skeletons
- ✅ Error handling with alerts
- ✅ Form validation
- ✅ Accessible components (ARIA labels, keyboard navigation)

### Internationalization (i18n)
- ✅ Multi-language support (English, Spanish, French)
- ✅ Localized routing (`/en/`, `/es/`, `/fr/`)
- ✅ Translation management system
- ✅ Locale-aware navigation components
- ✅ All auth pages fully translated

### Data Management
- ✅ TanStack Query for server state
- ✅ Automatic caching and refetching
- ✅ Optimistic updates
- ✅ Query invalidation patterns
- ✅ React Query DevTools (dev mode)

### Developer Experience
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Organized project structure
- ✅ Reusable hooks and utilities
- ✅ Component composition patterns

## Quick Start

### 1. Environment Setup

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000`

### 4. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Set up your database schema (see [Database Schema](#database-schema))

## Project Structure

```
├── app/
│   ├── [locale]/                 # Internationalized routes
│   │   ├── auth/                 # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── callback/
│   │   ├── dashboard/            # Protected dashboard page
│   │   ├── profile/              # Protected profile page
│   │   └── layout.tsx            # Root layout with providers
│   └── globals.css               # Global styles
├── components/
│   ├── auth/                     # Auth-related components
│   │   ├── LoginForm.tsx
│   │   ├── SignUpForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   └── LogoutButton.tsx
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── actions/
│   │   └── auth.ts               # Server Actions for auth
│   ├── hooks/
│   │   └── use-supabase-query.ts # TanStack Query hooks
│   ├── providers/
│   │   └── query-provider.tsx    # QueryClient provider
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       ├── server.ts             # Server Supabase client
│       └── middleware.ts         # Middleware helper
├── i18n/
│   ├── routing.ts                # i18n routing config
│   └── request.ts                # i18n request handler
├── messages/
│   ├── en.json                   # English translations
│   ├── es.json                   # Spanish translations
│   └── fr.json                   # French translations
├── middleware.ts                 # Route protection & i18n
├── components.json               # shadcn/ui config
└── TANSTACK_QUERY_GUIDE.md      # TanStack Query best practices
```

## Authentication Flow

### Server Actions (Secure)

All auth operations use Server Actions for maximum security:

**File**: `lib/actions/auth.ts`

```typescript
'use server'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}
```

### Protected Routes

Routes are protected in `middleware.ts`:

```typescript
// Protected routes
const protectedRoutes = ['/dashboard', '/profile', '/settings']

// Redirect to login if unauthenticated
if (isProtectedRoute && !user) {
  return Response.redirect(new URL(`/${locale}/auth/login`, request.url))
}
```

### Auth Pages

All auth pages use shadcn/ui components with server actions:

- **Login**: `app/[locale]/auth/login/page.tsx`
- **Signup**: `app/[locale]/auth/signup/page.tsx`
- **Forgot Password**: `app/[locale]/auth/forgot-password/page.tsx`
- **Reset Password**: `app/[locale]/auth/reset-password/page.tsx`

## Internationalization

### Adding a New Language

1. **Add locale to routing config** (`i18n/routing.ts`):

```typescript
export const routing = defineRouting({
  locales: ['en', 'es', 'fr', 'de'], // Add 'de'
  defaultLocale: 'en',
})
```

2. **Create translation file** (`messages/de.json`):

```json
{
  "HomePage": {
    "title": "Willkommen"
  },
  "Auth": {
    "signIn": "Anmelden",
    "signUp": "Registrieren"
  }
}
```

3. **Update middleware** (`middleware.ts`):

```typescript
matcher: ['/', '/(en|es|fr|de)/:path*', '/((?!_next|_vercel|.*\\..*).*)']
```

### Using Translations

```typescript
import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations('HomePage')
  return <h1>{t('title')}</h1>
}
```

### Localized Navigation

```typescript
import { Link, useRouter } from '@/i18n/routing'

// Automatically handles locale prefix
<Link href="/dashboard">Dashboard</Link>
```

## TanStack Query

### Creating Query Hooks

**File**: `lib/hooks/use-supabase-query.ts`

```typescript
export function useUser() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

### Using in Components

```typescript
'use client'

import { useUser } from '@/lib/hooks/use-supabase-query'

export default function UserProfile() {
  const { data: user, isLoading } = useUser()

  if (isLoading) return <div>Loading...</div>

  return <div>Welcome, {user?.email}</div>
}
```

See `TANSTACK_QUERY_GUIDE.md` for detailed patterns and best practices.

## Supabase Setup

### Required Tables

Create these tables in your Supabase project:

```sql
-- Profiles table (optional, extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);
```

### Email Templates

Configure email templates in Supabase Dashboard:
- **Authentication** > **Email Templates**
- Customize: Confirm signup, Reset password, Magic link

### Auth Settings

- **Site URL**: `http://localhost:3000` (dev) or your production URL
- **Redirect URLs**: Add allowed callback URLs
  - `http://localhost:3000/*/auth/callback`
  - `https://yourdomain.com/*/auth/callback`

## Database Schema

### Example Schema for Your App

```sql
-- Example: Tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table tasks enable row level security;

-- Policies
create policy "Users can view own tasks"
  on tasks for select
  using (auth.uid() = user_id);

create policy "Users can create tasks"
  on tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on tasks for delete
  using (auth.uid() = user_id);

-- Index for performance
create index tasks_user_id_idx on tasks(user_id);
```

## Adding shadcn/ui Components

```bash
# Add individual components
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog

# Add multiple at once
pnpm dlx shadcn@latest add button card dialog form
```

Components are added to `components/ui/` and can be customized.

## Best Practices

### 1. Server Actions for Mutations

Always use server actions for data mutations:

```typescript
'use server'

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  // Perform mutation
  revalidatePath('/dashboard')
}
```

### 2. Client Components for Interactivity

Use `'use client'` only when needed:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function InteractiveComponent() {
  const [count, setCount] = useState(0)
  return <Button onClick={() => setCount(count + 1)}>{count}</Button>
}
```

### 3. Query Key Management

Use a query key factory:

```typescript
export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    byId: (id: string) => ['tasks', id] as const,
    byStatus: (status: string) => ['tasks', 'status', status] as const,
  },
}
```

### 4. Error Handling

Always handle loading and error states:

```typescript
const { data, isLoading, isError, error } = useQuery(...)

if (isLoading) return <Skeleton />
if (isError) return <Alert>{error.message}</Alert>
return <div>{data}</div>
```

### 5. Type Safety

Define types for your data:

```typescript
export type Task = {
  id: string
  title: string
  completed: boolean
  user_id: string
  created_at: string
}
```

## Scripts

```bash
# Development
pnpm dev          # Start dev server with Turbopack

# Production
pnpm build        # Build for production
pnpm start        # Start production server

# Linting
pnpm lint         # Run ESLint
```

## Environment Variables

Required variables in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Environment Variables on Vercel

Add these in Project Settings > Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Update Supabase redirect URLs to include your production domain.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui |
| Backend | Supabase |
| Data Fetching | TanStack Query v5 |
| i18n | next-intl |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [next-intl Documentation](https://next-intl-docs.vercel.app)
- [TanStack Query Guide](TANSTACK_QUERY_GUIDE.md) (this project)

## License

MIT

---

**Happy Building! 🚀**
