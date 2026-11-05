'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { signIn } from '@/lib/actions/auth'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Mail, Lock, Loader2 } from '@/components/icons'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('Auth')

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? t('signingIn') : t('signIn')}
    </Button>
  )
}

export default function LoginForm() {
  const t = useTranslations('Auth')
  const [state, formAction] = useActionState(signIn, null)

  return (
    <form className="space-y-5" action={formAction}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="your@email.com"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('password')}</Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{state.error}</AlertDescription>
        </Alert>
      )}

      <SubmitButton />
    </form>
  )
}
