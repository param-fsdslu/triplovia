'use client'

import { useTranslations } from 'next-intl'
import { updatePassword } from '@/lib/actions/auth'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from '@/components/icons'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('Auth')

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t('updatingPassword') : t('updatePassword')}
    </Button>
  )
}

export default function ResetPasswordForm() {
  const t = useTranslations('Auth')
  const [state, formAction] = useActionState(updatePassword, null)

  return (
    <form className="space-y-6" action={formAction}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t('newPassword')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder={t('newPassword')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder={t('confirmPassword')}
          />
        </div>
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <SubmitButton />
    </form>
  )
}
