'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageCircle } from '@/components/icons'

const WHATSAPP_NUMBER = '919113887712'

const PROPERTY_TYPES = [
  'Hotel',
  'Homestay',
  'Resort',
  'Villa',
  'Guesthouse',
  'Apartment',
] as const

const listingSchema = z.object({
  propertyName: z.string().min(2, 'Property name is required'),
  ownerName: z.string().min(2, 'Your name is required'),
  phone: z.string().min(10, 'Enter a valid phone number').max(13),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  location: z.string().min(2, 'Location is required'),
  numberOfRooms: z.string().optional(),
  message: z.string().optional(),
})

type ListingForm = z.infer<typeof listingSchema>

interface ListPropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ListPropertyDialog({ open, onOpenChange }: ListPropertyDialogProps) {
  const [propertyType, setPropertyType] = useState('Hotel')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      propertyName: '',
      ownerName: '',
      phone: '',
      email: '',
      location: '',
      numberOfRooms: '',
      message: '',
    },
  })

  const onSubmit = (data: ListingForm) => {
    const text = [
      '*New Property Listing Request*',
      '',
      `Property: ${data.propertyName}`,
      `Type: ${propertyType}`,
      `Location: ${data.location}`,
      `Rooms: ${data.numberOfRooms || 'Not specified'}`,
      '',
      `Owner: ${data.ownerName}`,
      `Phone: ${data.phone}`,
      `Email: ${data.email || 'Not provided'}`,
      '',
      `Details: ${data.message || 'No additional details'}`,
    ].join('\n')

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')

    reset()
    setPropertyType('Hotel')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>List Your Property</DialogTitle>
          <DialogDescription>
            Interested in listing your property on Triplovia? Fill in your details and we&apos;ll connect with you on WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="propertyName">Property Name *</Label>
            <Input id="propertyName" placeholder="e.g. Sea View Homestay" {...register('propertyName')} />
            {errors.propertyName && (
              <p className="text-xs text-destructive">{errors.propertyName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numberOfRooms">No. of Rooms</Label>
              <Input
                id="numberOfRooms"
                type="number"
                min={1}
                placeholder="e.g. 10"
                {...register('numberOfRooms')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Property Location *</Label>
            <Input id="location" placeholder="e.g. Honnavar, Karnataka" {...register('location')} />
            {errors.location && (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ownerName">Your Name *</Label>
              <Input id="ownerName" placeholder="Full name" {...register('ownerName')} />
              {errors.ownerName && (
                <p className="text-xs text-destructive">{errors.ownerName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" placeholder="+91 91138 87712" {...register('phone')} />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Additional Details</Label>
            <Textarea
              id="message"
              placeholder="Tell us about your property, amenities, etc."
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
