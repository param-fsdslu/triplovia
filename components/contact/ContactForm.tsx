'use client'

/**
 * The Contact page form: name, mobile, optional email, topic, optional booking reference and the
 * message. "Send on WhatsApp" opens WhatsApp with it all filled in (like the About and package
 * enquiry forms); "Send by email" opens the guest's email app instead. Nothing is stored or sent
 * from our server.
 */
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, Mail, MessageCircle } from '@/components/icons'
import { CONTACT, whatsappUrl } from '@/lib/config/contact'
import { normalizeIndianMobile, normalizePhone } from '@/lib/utils/phone'

const TOPICS = [
  'Help with a booking',
  'Cancellation or refund',
  'Payment or invoice',
  'List my property',
  'Partnership',
  'Something else',
] as const

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name'),
  phone: z
    .string()
    .trim()
    .refine((v) => !!(normalizeIndianMobile(v) || normalizePhone(v)), 'Enter a valid mobile number'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  topic: z.enum(TOPICS),
  bookingRef: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(2000),
})

type ContactValues = z.infer<typeof schema>

function compose(values: ContactValues) {
  const phone = normalizeIndianMobile(values.phone) || normalizePhone(values.phone) || values.phone
  return {
    subject: `${values.topic}${values.bookingRef ? ` (${values.bookingRef})` : ''} — ${values.name}`,
    lines: [
      `Name: ${values.name}`,
      `Mobile: ${phone}`,
      values.email ? `Email: ${values.email}` : '',
      `Topic: ${values.topic}`,
      values.bookingRef ? `Booking reference: ${values.bookingRef}` : '',
      '',
      values.message,
    ].filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== '')),
  }
}

export function ContactForm() {
  const [sentVia, setSentVia] = useState<'whatsapp' | 'email' | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', topic: 'Help with a booking', bookingRef: '', message: '' },
  })

  const send = (via: 'whatsapp' | 'email') =>
    handleSubmit((values) => {
      const { subject, lines } = compose(values)
      if (via === 'whatsapp') {
        window.open(whatsappUrl([`*${subject}*`, '', ...lines].join('\n')), '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
      }
      setSentVia(via)
      reset()
    })

  return (
    <form onSubmit={send('whatsapp')} noValidate className="space-y-5">
      {sentVia && (
        <div className="flex gap-3 rounded-2xl border border-primary/20 bg-mint px-4 py-3 text-sm text-foreground" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            {sentVia === 'whatsapp'
              ? 'WhatsApp opened with your message. Press send there and we will reply as soon as we can.'
              : 'Your email app opened with your message. Press send there and we will reply as soon as we can.'}{' '}
            Didn&apos;t open? Call us on{' '}
            <a href={`tel:${CONTACT.phone}`} className="font-semibold text-primary hover:underline">
              {CONTACT.phoneDisplay}
            </a>
            .
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Name *</Label>
          <Input id="contact-name" autoComplete="name" placeholder="Your full name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">Mobile number *</Label>
          <Input id="contact-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...register('phone')} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Email (optional)</Label>
          <Input id="contact-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-topic">What is it about?</Label>
          <Controller
            control={control}
            name="topic"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="contact-topic" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-ref">Booking reference (optional)</Label>
        <Input id="contact-ref" placeholder="BK-20261101-AB12" className="uppercase placeholder:normal-case" {...register('bookingRef')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Message *</Label>
        <Textarea id="contact-message" rows={5} placeholder="How can we help?" {...register('message')} />
        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" className="h-12 gap-2 px-6 font-semibold sm:flex-1">
          <MessageCircle className="h-5 w-5" />
          Send on WhatsApp
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-12 gap-2 px-6 font-semibold sm:flex-1" onClick={send('email')}>
          <Mail className="h-5 w-5" />
          Send by email
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Both open in your own app with the message filled in, so nothing is sent until you press send there.
      </p>
    </form>
  )
}
