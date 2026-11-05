'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { resetPasswordRequest } from '@/lib/actions/auth'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Loader2, KeyRound } from '@/components/icons'

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

export default function ModernForgotPasswordForm() {
  const t = useTranslations('Auth')
  const [state, formAction] = useActionState(resetPasswordRequest, null)

  const isSuccess = state && 'success' in state && state.success

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">{t('checkEmail')}</h3>
                <p className="text-sm text-green-800">{t('resetLinkSent')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="text-center">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-primary hover:text-primary-hover transition-colors underline underline-offset-4"
          >
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" action={formAction}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-2">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">{t('resetPassword')}</h1>
                <p className="text-muted-foreground text-balance text-sm">
                  {t('resetPasswordDescription')}
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
              </Field>

              {state?.error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{state.error}</AlertDescription>
                </Alert>
              )}

              <Field>
                <SubmitButton />
              </Field>

              <FieldDescription className="text-center">
                Remember your password? <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">{t('signIn')}</Link>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="bg-muted relative hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80"
              alt="Hotel security"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        We'll send you a link to reset your password.
      </FieldDescription>
    </div>
  )
}
