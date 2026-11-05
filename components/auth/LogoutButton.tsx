'use client'

import { useTranslations } from 'next-intl'
import { signOut } from '@/lib/actions/auth'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

function SignOutButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('Auth')

  return (
    <Button type="submit" disabled={pending} variant="default" size="sm">
      {t('signOut')}
    </Button>
  )
}

export default function LogoutButton() {
  return (
    <form action={signOut}>
      <SignOutButton />
    </form>
  )
}
