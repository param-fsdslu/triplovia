'use client'

/**
 * The actions menu for one website user (Users list rows and the user's profile page): view
 * profile / bookings, email, WhatsApp, disable or enable sign-in, delete, with a confirmation
 * for the last three.
 */
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Ban,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Mail,
  MessageCircle,
  MoreVertical,
  Trash2,
  UserRound,
} from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteWebsiteUser, setWebsiteUserDisabled, type WebsiteUser } from '@/lib/actions/website-users'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { formatPhone } from '@/lib/utils/phone'

type Pending = 'delete' | 'disable' | 'enable'

const COPY: Record<Pending, { title: string; confirm: string }> = {
  delete: { title: 'Delete User', confirm: 'Delete User' },
  disable: { title: 'Disable Sign-in', confirm: 'Disable Sign-in' },
  enable: { title: 'Enable Sign-in', confirm: 'Enable Sign-in' },
}

interface WebsiteUserActionsProps {
  user: WebsiteUser
  /** `row`: ⋮ icon in the Users list. `page`: an "Actions" button on the profile page */
  variant?: 'row' | 'page'
}

export function WebsiteUserActions({ user, variant = 'row' }: WebsiteUserActionsProps) {
  const router = useRouter()
  const [pending, setPending] = useState<Pending | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const profileHref = `${ADMIN_PATH}/users/${encodeURIComponent(user.id)}`
  const whatsapp = user.phone?.replace(/\D/g, '')
  const displayName = user.name || user.email || (user.phone && formatPhone(user.phone)) || 'this user'

  const handleConfirm = async () => {
    if (!pending) return
    setIsWorking(true)
    const result =
      pending === 'delete'
        ? await deleteWebsiteUser(user.id)
        : await setWebsiteUserDisabled(user.id, pending === 'disable')

    if (result.success) {
      setPending(null)
      if (pending === 'delete' && variant === 'page') router.push(`${ADMIN_PATH}/users`)
      else router.refresh()
    } else {
      alert(result.error || 'Something went wrong')
    }
    setIsWorking(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === 'row' ? (
            <Button variant="ghost" size="icon" aria-label={`Actions for ${displayName}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="bg-card">
              Actions
              <ChevronDown className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {variant === 'row' && (
            <DropdownMenuItem asChild>
              <Link href={profileHref}>
                <UserRound className="h-4 w-4 mr-2" />
                View Profile
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild disabled={user.bookings === 0}>
            <Link href={`${ADMIN_PATH}/bookings?userId=${encodeURIComponent(user.id)}`}>
              <CalendarCheck className="h-4 w-4 mr-2" />
              View Bookings
            </Link>
          </DropdownMenuItem>
          {user.email && (
            <DropdownMenuItem asChild>
              <a href={`mailto:${user.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </a>
            </DropdownMenuItem>
          )}
          {whatsapp && (
            <DropdownMenuItem asChild>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {user.disabled ? (
            <DropdownMenuItem onClick={() => setPending('enable')}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Enable Sign-in
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setPending('disable')}>
              <Ban className="h-4 w-4 mr-2" />
              Disable Sign-in
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setPending('delete')} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !isWorking && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending && COPY[pending].title}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending === 'delete' ? (
                <>
                  Delete the account of <strong>{displayName}</strong>? This cannot be undone. Their bookings stay
                  (for accounts and invoices) but are no longer linked to an account; their wishlist and saved rooms
                  are removed.
                </>
              ) : pending === 'disable' ? (
                <>
                  <strong>{displayName}</strong> will be signed out and can&apos;t sign in until you enable them again.
                  Their bookings are not affected.
                </>
              ) : (
                <>
                  Let <strong>{displayName}</strong> sign in again?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWorking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirm()
              }}
              disabled={isWorking}
              className={pending === 'enable' ? undefined : 'bg-red-600 hover:bg-red-700'}
            >
              {isWorking ? 'Working...' : pending && COPY[pending].confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
