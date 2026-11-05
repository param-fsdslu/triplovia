'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { resetPasswordRequest } from '@/lib/actions/auth'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Mail, Loader2 } from '@/components/icons'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('Auth')

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? t('sendingResetLink') : t('sendResetLink')}
    </Button>
  )
}

export default function ForgotPasswordForm() {
  const t = useTranslations('Auth')
  const [state, formAction] = useActionState(resetPasswordRequest, null)

  const isSuccess = state && 'success' in state && state.success

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">
            {t('checkEmail')}
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground text-center">
          {t('resetLinkSent')}
        </p>
        <div className="text-center">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form className="space-y-5" action={formAction}>
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

      {state?.error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{state.error}</AlertDescription>
        </Alert>
      )}

      <SubmitButton />

      <div className="text-center">
        <Link
          href="/auth/login"
          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          {t('backToLogin')}
        </Link>
      </div>
    </form>
  )
}
