import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection'

export default async function ProfilePage() {
  const db = await createClient()

  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await db
    .from('profiles')
    .select(
      'first_name, last_name, phone, profile_image, date_of_birth, gender, nationality, bio, address_line_1, address_line_2, city, state, postal_code, country, emergency_contact_name, emergency_contact_phone, id_type, id_number'
    )
    .eq('id', user.id)
    .single()

  return (
    <div>

      {/* ── Page header ─────────────────────────────────── */}
      <div className="mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your details, address and the ID you show at check-in
        </p>
      </div>

      <div className="space-y-4">
        <ProfileEditForm
          email={user.email || ''}
          profile={profile}
        />
        <DeleteAccountSection />
      </div>
    </div>
  )
}
