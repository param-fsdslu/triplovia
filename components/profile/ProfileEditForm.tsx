'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, CheckCircle2, IdCard, Loader2, MapPin, Phone, UserCircle, type LucideIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { compressImage } from '@/lib/utils/image-compression'
import { updateProfile } from '@/lib/actions/profile'
import { uploadUserImage } from '@/lib/actions/uploads'
import {
  GENDERS,
  ID_TYPES,
  profileDetailsSchema,
  profileToForm,
  type ProfileDetails,
} from '@/lib/utils/profile-details'
import { cn } from '@/lib/utils'

interface ProfileEditFormProps {
  email: string
  /** The profiles row (first_name, phone, address_line_1, id_type, …) */
  profile: Record<string, any> | null
}

/** A titled card of fields */
function Section({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** Label + control + hint or error */
function Field({ id, label, error, hint, wide, children }: { id: string; label: string; error?: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn('space-y-1.5', wide && 'sm:col-span-2')}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/**
 * My Profile: photo, then personal details, contact, home address and the ID shown at check-in,
 * saved together by `updateProfile` (the photo saves on its own as soon as it's uploaded).
 */
export function ProfileEditForm({ email, profile }: ProfileEditFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileImage, setProfileImage] = useState<string | null>(profile?.profile_image || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileDetails>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: profileToForm(profile),
  })

  const idType = watch('idType')
  const bioLength = watch('bio')?.length ?? 0
  const firstName = watch('firstName')
  const lastName = watch('lastName')
  const displayName = [firstName, lastName].filter(Boolean).join(' ')
  const initial = (firstName || email || 'U').charAt(0).toUpperCase()
  const today = new Date().toISOString().slice(0, 10)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only JPEG, PNG, and WebP images are allowed.' })
      return
    }

    setUploadingImage(true)
    setMessage(null)

    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
      const uploaded = await uploadUserImage('profile-images', formData)

      if (!uploaded.url) {
        setMessage({ type: 'error', text: 'Failed to upload image.' })
        return
      }

      setProfileImage(uploaded.url)
      // Saved at once, on its own (the rest of the form is untouched)
      const result = await updateProfile({ profileImage: uploaded.url })
      if (!result.success) {
        setMessage({ type: 'error', text: result.error || 'Failed to save image.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload image.' })
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (details: ProfileDetails) => {
    setSaving(true)
    setMessage(null)
    const result = await updateProfile({ details })
    setMessage(
      result.success
        ? { type: 'success', text: 'Profile saved.' }
        : { type: 'error', text: result.error || 'Failed to update profile.' }
    )
    setSaving(false)
  }

  const idTypeInfo = ID_TYPES.find((t) => t.value === idType)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* ── Photo and name ── */}
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-5 text-center sm:flex-row sm:p-6 sm:text-left">
        <div className="group relative">
          <Avatar className="h-20 w-20 border-4 border-white shadow-[0_4px_16px_rgba(16,127,120,0.15)]">
            {profileImage ? <AvatarImage src={profileImage} alt="Profile photo" /> : null}
            <AvatarFallback className="bg-primary font-heading text-2xl font-bold text-white">{initial}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            aria-label="Change profile photo"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {uploadingImage ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageUpload}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg font-bold text-foreground">{displayName || 'Your name'}</p>
          <p className="truncate text-sm text-muted-foreground">{email || profile?.phone || ''}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
        >
          {uploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {profileImage ? 'Change photo' : 'Add photo'}
        </Button>
      </section>

      {/* ── Personal details ── */}
      <Section icon={UserCircle} title="Personal details" description="Use your name as it appears on your ID.">
        <Field id="firstName" label="First name" error={errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" placeholder="First name" {...register('firstName')} />
        </Field>
        <Field id="lastName" label="Last name" error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" placeholder="Last name" {...register('lastName')} />
        </Field>
        <Field id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth?.message}>
          <Input id="dateOfBirth" type="date" max={today} autoComplete="bday" {...register('dateOfBirth')} />
        </Field>
        <Field id="gender" label="Gender" error={errors.gender?.message}>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id="nationality" label="Nationality" error={errors.nationality?.message}>
          <Input id="nationality" placeholder="e.g. Indian" {...register('nationality')} />
        </Field>
        <Field id="bio" label="About you" error={errors.bio?.message} hint={`${bioLength}/500 · optional`} wide>
          <Textarea
            id="bio"
            rows={3}
            maxLength={500}
            placeholder="A line or two about how you like to travel"
            {...register('bio')}
          />
        </Field>
      </Section>

      {/* ── Contact ── */}
      <Section icon={Phone} title="Contact" description="How we can reach you about your bookings.">
        <Field id="email" label="Email" hint={email ? 'Used to sign in, so it can’t be changed here.' : undefined}>
          <Input id="email" value={email || 'Not added'} disabled className="cursor-not-allowed bg-muted" />
        </Field>
        <Field id="phone" label="Mobile number" error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...register('phone')} />
        </Field>
        <Field id="emergencyContactName" label="Emergency contact" error={errors.emergencyContactName?.message}>
          <Input id="emergencyContactName" placeholder="Name" {...register('emergencyContactName')} />
        </Field>
        <Field id="emergencyContactPhone" label="Emergency contact number" error={errors.emergencyContactPhone?.message}>
          <Input id="emergencyContactPhone" type="tel" placeholder="+91 98765 43210" {...register('emergencyContactPhone')} />
        </Field>
      </Section>

      {/* ── Address ── */}
      <Section icon={MapPin} title="Address" description="Your home address. Hotels often ask for it at check-in.">
        <Field id="addressLine1" label="Address line 1" error={errors.addressLine1?.message} wide>
          <Input id="addressLine1" autoComplete="address-line1" placeholder="House / flat, street" {...register('addressLine1')} />
        </Field>
        <Field id="addressLine2" label="Address line 2" error={errors.addressLine2?.message} hint="Optional" wide>
          <Input id="addressLine2" autoComplete="address-line2" placeholder="Area, landmark" {...register('addressLine2')} />
        </Field>
        <Field id="city" label="City / town" error={errors.city?.message}>
          <Input id="city" autoComplete="address-level2" placeholder="City or town" {...register('city')} />
        </Field>
        <Field id="state" label="State" error={errors.state?.message}>
          <Input id="state" autoComplete="address-level1" placeholder="e.g. Karnataka" {...register('state')} />
        </Field>
        <Field id="postalCode" label="PIN code" error={errors.postalCode?.message}>
          <Input id="postalCode" inputMode="numeric" autoComplete="postal-code" placeholder="6-digit PIN" {...register('postalCode')} />
        </Field>
        <Field id="country" label="Country" error={errors.country?.message}>
          <Input id="country" autoComplete="country-name" placeholder="Country" {...register('country')} />
        </Field>
      </Section>

      {/* ── ID for check-in ── */}
      <Section
        icon={IdCard}
        title="ID for check-in"
        description="Hotels ask for a photo ID at check-in. Keep its details here, and carry the original."
      >
        <Field id="idType" label="ID type" error={errors.idType?.message}>
          <Controller
            control={control}
            name="idType"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="idType" className="w-full">
                  <SelectValue placeholder="Select an ID" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field
          id="idNumber"
          label="ID number"
          error={errors.idNumber?.message}
          hint={idType === 'aadhaar' ? 'Only the last 4 digits are saved.' : undefined}
        >
          <Input
            id="idNumber"
            autoComplete="off"
            placeholder={idTypeInfo?.placeholder ?? 'Pick the ID type first'}
            disabled={!idType}
            className="uppercase placeholder:normal-case"
            {...register('idNumber')}
          />
        </Field>
      </Section>

      {/* ── Save ── */}
      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-[0_8px_30px_-12px_rgba(7,63,61,0.25)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:pl-5">
        {message ? (
          <p
            role="status"
            className={cn('flex items-center gap-2 text-sm', message.type === 'success' ? 'text-primary' : 'text-destructive')}
          >
            {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
            {message.text}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Only you and Triplovia support can see these details.</p>
        )}
        <Button
          type="submit"
          disabled={saving || uploadingImage}
          className="rounded-full bg-primary px-6 font-semibold shadow-none hover:bg-primary-hover"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </form>
  )
}
