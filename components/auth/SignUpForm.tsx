'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { signUp } from '@/lib/actions/auth'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Mail, Lock, Loader2, Check, X } from '@/components/icons'
import { Progress } from '@/components/ui/progress'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('Auth')

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? t('creatingAccount') : t('signUp')}
    </Button>
  )
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const getPasswordStrength = (pass: string) => {
    let strength = 0
    const checks = {
      length: pass.length >= 8,
      hasLowercase: /[a-z]/.test(pass),
      hasUppercase: /[A-Z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecial: /[^A-Za-z0-9]/.test(pass),
    }

    if (checks.length) strength += 20
    if (checks.hasLowercase) strength += 20
    if (checks.hasUppercase) strength += 20
    if (checks.hasNumber) strength += 20
    if (checks.hasSpecial) strength += 20

    return { strength, checks }
  }

  if (!password) return null

  const { strength, checks } = getPasswordStrength(password)

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-red-500'
    if (strength < 60) return 'bg-orange-500'
    if (strength < 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (strength < 40) return 'Weak'
    if (strength < 60) return 'Fair'
    if (strength < 80) return 'Good'
    return 'Strong'
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={`font-medium ${
          strength < 40 ? 'text-red-600' :
          strength < 60 ? 'text-orange-600' :
          strength < 80 ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {getStrengthText()}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${getStrengthColor()}`}
          style={{ width: `${strength}%` }}
        />
      </div>
      <div className="space-y-1 text-xs">
        <div className={`flex items-center gap-1 ${checks.length ? 'text-green-600' : 'text-muted-foreground'}`}>
          {checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          <span>At least 8 characters</span>
        </div>
        <div className={`flex items-center gap-1 ${checks.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
          {checks.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          <span>Contains uppercase letter</span>
        </div>
        <div className={`flex items-center gap-1 ${checks.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
          {checks.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          <span>Contains number</span>
        </div>
      </div>
    </div>
  )
}

export default function SignUpForm() {
  const t = useTranslations('Auth')
  const [state, formAction] = useActionState(signUp, null)
  const [password, setPassword] = useState('')

  const isSuccess = state && 'success' in state && state.success

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">{t('checkEmail')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-green-700">
              {t('confirmationSent')}
            </CardDescription>
          </CardContent>
        </Card>
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
    <div className="space-y-6">
      <form className="space-y-4" action={formAction}>
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
          <Label htmlFor="password">{t('password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <PasswordStrengthIndicator password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
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
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">{t('haveAccount')} </span>
        <Link
          href="/auth/login"
          className="font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          {t('signIn')}
        </Link>
      </div>
    </div>
  )
}
