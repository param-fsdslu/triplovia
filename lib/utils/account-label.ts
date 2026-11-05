import { formatPhone } from '@/lib/utils/phone'

interface AccountLike {
  email?: string | null
  user_metadata?: Record<string, any> | null
}

/** The account holder's name from their metadata ("" when none is saved) */
export function accountName(user: AccountLike): string {
  const meta = user.user_metadata ?? {}
  return (meta.full_name || [meta.first_name, meta.last_name].filter(Boolean).join(' ') || '').trim()
}

/**
 * How the navbar's account menus name who's signed in (by request): the name when there is one,
 * else the mobile number, else the email.
 */
export function accountLabel(user: AccountLike): string {
  const meta = user.user_metadata ?? {}
  return accountName(user) || (meta.phone ? formatPhone(meta.phone) : '') || user.email || 'My account'
}
