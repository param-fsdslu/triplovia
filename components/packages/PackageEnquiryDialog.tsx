'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, MessageCircle } from '@/components/icons'
import { cn } from '@/lib/utils'

const WHATSAPP_NUMBER = '919113887712'

const enquirySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Enter a valid phone number').max(13),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  numberOfPeople: z.string().min(1, 'Required').refine((v) => Number(v) >= 1, 'At least 1 person'),
  message: z.string().optional(),
})

type EnquiryForm = z.infer<typeof enquirySchema>

interface PackageEnquiryDialogProps {
  packageName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PackageEnquiryDialog({
  packageName,
  open,
  onOpenChange,
}: PackageEnquiryDialogProps) {
  const [preferredDate, setPreferredDate] = useState<Date | undefined>()
  const [dateOpen, setDateOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EnquiryForm>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      numberOfPeople: '1',
      message: '',
    },
  })

  const onSubmit = (data: EnquiryForm) => {
    const dateStr = preferredDate ? format(preferredDate, 'dd MMM yyyy') : 'Flexible'

    const text = [
      `*New Enquiry — ${packageName}*`,
      '',
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      `Email: ${data.email || 'Not provided'}`,
      `People: ${data.numberOfPeople}`,
      `Preferred Date: ${dateStr}`,
      '',
      `Message: ${data.message || 'No additional details'}`,
    ].join('\n')

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')

    reset()
    setPreferredDate(undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enquire — {packageName}</DialogTitle>
          <DialogDescription>
            Fill in your details and we&apos;ll connect with you on WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="Your full name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" placeholder="+91 91138 87712" {...register('phone')} />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="numberOfPeople">No. of People *</Label>
              <Input
                id="numberOfPeople"
                type="number"
                min={1}
                {...register('numberOfPeople')}
              />
              {errors.numberOfPeople && (
                <p className="text-xs text-destructive">{errors.numberOfPeople.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Preferred Date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !preferredDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {preferredDate ? format(preferredDate, 'dd MMM yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={preferredDate}
                    onSelect={(date) => {
                      setPreferredDate(date)
                      setDateOpen(false)
                    }}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Special Requirements</Label>
            <Textarea
              id="message"
              placeholder="Any specific requirements or questions..."
              rows={3}
              {...register('message')}
            />
          </div>

          <Button type="submit" className="w-full gap-2">
            <MessageCircle className="h-4 w-4" />
            Send via WhatsApp
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
