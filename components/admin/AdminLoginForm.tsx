'use client'

/** Admin panel sign-in form (email + password); signInAdmin goes to the panel on success */
import { useActionState } from 'react'
import { Input } from '@/components/ui/input'
import { authInputClass, FieldLabelText, FormError, PasswordInput, PillButton } from '@/components/auth/auth-ui'
import { signInAdmin } from '@/lib/actions/auth'

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(signInAdmin, null)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <FieldLabelText htmlFor="admin-email">Email address</FieldLabelText>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          required
          autoFocus
          className={authInputClass}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <FieldLabelText htmlFor="admin-password">Password</FieldLabelText>
          {/* The reset flow lives on the guest site (full page load: another root layout) */}
          <a
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <PasswordInput id="admin-password" autoComplete="current-password" />
      </div>

      <FormError message={state?.error} />

      <PillButton type="submit" busy={pending}>
        Sign in
      </PillButton>
    </form>
  )
}
