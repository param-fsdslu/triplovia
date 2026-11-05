/**
 * Creates an admin account in Firebase, or gives an existing account admin access: the
 * email/password user in Firebase Authentication (email marked confirmed, since unconfirmed
 * emails can't sign in), the role in `_auth_users.user_metadata` (what the admin guards read)
 * and the matching `profiles` row. A new account's password is asked for in the terminal, never
 * passed as an argument, so it stays out of shell history.
 *
 *   npm run admin:create -- you@example.com                          super admin
 *   npm run admin:create -- you@example.com --name="First Last"
 *   npm run admin:create -- owner@example.com --role=hotel_admin --hotels=<hotelId>,<hotelId>
 *   npm run admin:create -- you@example.com --new-password           also set a new password
 *
 * Safe to re-run: an existing account keeps its password (no prompt) unless --new-password is given.
 * Then sign in at <ADMIN_PATH>/login (the URL is printed at the end).
 */
import { createInterface } from 'node:readline'
import { ADMIN_PATH } from '../lib/config/admin-path'
import { DbClient } from '../lib/db/client'
import { FirestoreStore } from '../lib/db/firestore-store'
import type { DbResponse } from '../lib/db/types'
import { adminAuth, adminFirestore } from '../lib/firebase/admin'

const AUTH_USERS_COLLECTION = '_auth_users'
const ROLES = ['super_admin', 'hotel_admin'] as const
type Role = (typeof ROLES)[number]

const argv = process.argv.slice(2)
const flag = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const email = argv.find((a) => !a.startsWith('--'))?.trim().toLowerCase()
const role = (flag('role') ?? 'super_admin') as Role
const hotelIds = (flag('hotels') ?? '').split(',').map((id) => id.trim()).filter(Boolean)
const fullName = flag('name')?.trim()
const newPassword = argv.includes('--new-password')

function must<T>(result: DbResponse<T>, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message} (${result.error.code})`)
  return result.data
}

/** Reads a line without echoing it (for passwords) */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    let muted = false
    ;(rl as any)._writeToOutput = (text: string) => {
      if (!muted) process.stdout.write(text)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
    muted = true
  })
}

async function askPassword(existing: boolean): Promise<string | undefined> {
  if (existing && !newPassword) return undefined
  const password = await askHidden(existing ? 'New password: ' : 'Password: ')
  if (password.length < 8) throw new Error('The password must be at least 8 characters.')
  if ((await askHidden('Repeat the password: ')) !== password) throw new Error('The passwords do not match.')
  return password
}

async function findUser(address: string) {
  try {
    return await adminAuth().getUserByEmail(address)
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') return null
    throw err
  }
}

async function main() {
  if (!email || !email.includes('@')) {
    throw new Error('Usage: npm run admin:create -- you@example.com [--role=super_admin|hotel_admin] [--hotels=id,id] [--name="First Last"]')
  }
  if (!ROLES.includes(role)) throw new Error(`--role must be one of: ${ROLES.join(', ')}`)
  if (role === 'hotel_admin' && hotelIds.length === 0) throw new Error('A hotel_admin needs --hotels=<hotelId>,...')

  const existing = await findUser(email)
  console.log(existing ? `Found ${email} in Firebase Authentication.` : `Creating ${email} in Firebase Authentication.`)
  const password = await askPassword(!!existing)

  const record = existing
    ? await adminAuth().updateUser(existing.uid, { emailVerified: true, ...(password ? { password } : {}) })
    : await adminAuth().createUser({ email, password, emailVerified: true, displayName: fullName || undefined })

  // Role and names live in _auth_users.user_metadata, which only server code writes
  const ref = adminFirestore().collection(AUTH_USERS_COLLECTION).doc(record.uid)
  const current = (await ref.get()).data()
  const now = new Date().toISOString()
  const [firstName, ...rest] = (fullName ?? '').split(/\s+/).filter(Boolean)
  const meta: Record<string, any> = { ...(current?.user_metadata ?? {}), role }
  if (role === 'hotel_admin') meta.hotel_ids = hotelIds
  else delete meta.hotel_ids
  if (fullName) Object.assign(meta, { first_name: firstName, last_name: rest.join(' '), full_name: fullName })

  await ref.set({
    id: record.uid,
    email,
    user_metadata: meta,
    app_metadata: current?.app_metadata ?? { provider: 'email', providers: ['email'] },
    created_at: current?.created_at ?? new Date(record.metadata.creationTime).toISOString(),
    updated_at: now,
    last_sign_in_at: current?.last_sign_in_at ?? null,
    email_confirmed_at: current?.email_confirmed_at ?? now,
  })

  // Same profiles row the app keeps in step with _auth_users (lib/firebase/auth/users.ts)
  const db = new DbClient({
    store: new FirestoreStore(adminFirestore),
    resolveActor: async () => ({ kind: 'service' }),
    auth: null,
    storage: null,
  })
  const profile: Record<string, unknown> = { id: record.uid, email, role, hotel_ids: meta.hotel_ids ?? null }
  if (fullName) Object.assign(profile, { first_name: meta.first_name, last_name: meta.last_name })
  must(await db.from('profiles').upsert(profile, { onConflict: 'id' }), 'profile')

  console.log(`${email} is now ${role === 'super_admin' ? 'a super admin' : `a hotel admin for ${hotelIds.join(', ')}`}.`)
  console.log(`Sign in at ${ADMIN_PATH}/login with this email and password.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
