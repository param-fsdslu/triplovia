'use client'

import { useTranslations } from 'next-intl'
import { updatePassword } from '@/lib/actions/auth'
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
import { AlertCircle, Info, Loader2, ShieldCheck } from '@/components/icons'
import { Link } from '@/i18n/routing'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('Auth')

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? t('updatingPassword') : t('updatePassword')}
    </Button>
  )
}

export default function ModernResetPasswordForm() {
  const t = useTranslations('Auth')
  const [state, formAction] = useActionState(updatePassword, null)

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" action={formAction}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">{t('setNewPassword')}</h1>
                <p className="text-muted-foreground text-balance text-sm">
                  Choose a strong password for your Triplovia account.
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-mint px-3.5 py-3 text-sm text-secondary">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>You&apos;re in password recovery mode. You&apos;ll be signed out automatically after updating your password.</p>
              </div>

              <Field>
                <FieldLabel htmlFor="password">{t('newPassword')}</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">{t('confirmPassword')}</FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  minLength={8}
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
                Remember your password?{' '}
                <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
                  {t('signIn')}
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="bg-muted relative hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80"
              alt="Hotel resort"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        Your new password must be at least 8 characters long.
      </FieldDescription>
    </div>
  )
}
