'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { useBookingStore, useBookingHydration } from '@/lib/stores/use-booking-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RazorpayButton } from '@/components/payment/RazorpayButton'
import {
  CalendarIcon,
  User,
  Mail,
  Phone,
  Users,
  Baby,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Clock,
  Ship,
} from '@/components/icons'
import { format, addDays } from 'date-fns'
import { cn, isValidPhone, getMaxBookableDate } from '@/lib/utils'

interface TripType {
  id: string
  name: string
  description?: string
  duration_minutes: number
  max_passengers: number
  min_passengers?: number
  pricing_model: 'per_person' | 'per_boat'
  price_per_person?: number
  price_per_boat?: number
  child_price_per_person?: number
  includes_text?: string
  what_to_bring_text?: string
}

interface Boat {
  id: string
  name: string
  departure_point?: string
  city: string
  state: string
  phone?: string
}

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
  label?: string
  spots_remaining: number
}

interface BoatBookingFormProps {
  boat: Boat
  tripType: TripType
  userId?: string
  userEmail?: string
  userName?: string
}

export function BoatBookingForm({ boat, tripType, userId, userEmail, userName }: BoatBookingFormProps) {
  const router = useRouter()
  const savedGuest = useBookingStore((s) => s.guestDetails)
  const setGuestDetails = useBookingStore((s) => s.setGuestDetails)
  const hydrated = useBookingHydration()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guest Details — auth props take priority, then stored guest details
  const [firstName, setFirstName] = useState(userName?.split(' ')[0] || '')
  const [lastName, setLastName] = useState(userName?.split(' ').slice(1).join(' ') || '')
  const [email, setEmail] = useState(userEmail || '')
  const [phone, setPhone] = useState('')

  // Hydrate from persisted guest details only after localStorage rehydration completes
  useEffect(() => {
    if (!hydrated) return
    if (!firstName && savedGuest.firstName) setFirstName(savedGuest.firstName)
    if (!lastName && savedGuest.lastName) setLastName(savedGuest.lastName)
    if (!email && savedGuest.email) setEmail(savedGuest.email)
    if (!phone && savedGuest.phone) setPhone(savedGuest.phone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // Booking Details
  const [tripDate, setTripDate] = useState<Date>()
  const [selectedSlotId, setSelectedSlotId] = useState<string>('')
  const [numAdults, setNumAdults] = useState(1)
  const [numChildren, setNumChildren] = useState(0)
  const [specialRequests, setSpecialRequests] = useState('')

  // Available slots
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Fetch available slots when date changes
  useEffect(() => {
    if (!tripDate) {
      setAvailableSlots([])
      setSelectedSlotId('')
      return
    }

    const fetchSlots = async () => {
      setLoadingSlots(true)
      setSelectedSlotId('')
      try {
        const dateStr = format(tripDate, 'yyyy-MM-dd')
        const res = await fetch(`/api/boats/availability?tripTypeId=${tripType.id}&date=${dateStr}`)
        const data = await res.json()
        if (data.slots) {
          setAvailableSlots(data.slots)
        }
      } catch {
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [tripDate, tripType.id])

  // Calculate pricing
  const calculateSubtotal = () => {
    if (tripType.pricing_model === 'per_person') {
      const adultTotal = (tripType.price_per_person || 0) * numAdults
      const childTotal = (tripType.child_price_per_person || 0) * numChildren
      return adultTotal + childTotal
    }
    return tripType.price_per_boat || 0
  }

  const subtotal = calculateSubtotal()
  const taxAmount = subtotal * 0.12
  const totalAmount = subtotal + taxAmount

  const selectedSlot = availableSlots.find(s => s.id === selectedSlotId)
  const totalPassengers = numAdults + numChildren

  const [bookingCreated, setBookingCreated] = useState<{
    bookingId: string
    bookingReference: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!isValidPhone(phone)) throw new Error('Please enter a valid 10-digit Indian mobile number')
      if (!tripDate) throw new Error('Please select a trip date')
      if (!selectedSlotId) throw new Error('Please select a time slot')
      if (numAdults < 1) throw new Error('At least one adult is required')
      if (tripType.min_passengers && totalPassengers < tripType.min_passengers) {
        throw new Error(`Minimum ${tripType.min_passengers} passengers required`)
      }
      if (totalPassengers > tripType.max_passengers) {
        throw new Error(`Maximum ${tripType.max_passengers} passengers allowed`)
      }
      if (selectedSlot && totalPassengers > selectedSlot.spots_remaining) {
        throw new Error(`Only ${selectedSlot.spots_remaining} spots remaining for this time slot`)
      }

      const bookingData = {
        userId,
        boatId: boat.id,
        tripTypeId: tripType.id,
        timeSlotId: selectedSlotId,
        tripDate: format(tripDate, 'yyyy-MM-dd'),
        numAdults,
        numChildren,
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
        guestPhone: phone,
        pricingModel: tripType.pricing_model,
        pricePerPerson: tripType.price_per_person,
        pricePerBoat: tripType.price_per_boat,
        childPricePerPerson: tripType.child_price_per_person,
        subtotal,
        taxAmount,
        taxPercentage: 12,
        totalAmount,
        specialRequests,
      }

      const response = await fetch('/api/boat-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }

      // Save guest details for future bookings
      setGuestDetails({ firstName, lastName, email, phone })

      setBookingCreated({
        bookingId: result.bookingId,
        bookingReference: result.bookingReference,
      })
      setIsSubmitting(false)
    } catch (err: any) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Booking Form */}
      <div className="lg:col-span-2 order-2 lg:order-1">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Guest Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Guest Details
                </CardTitle>
                <CardDescription>Enter the guest information for this booking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@example.com"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 91138 87712"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trip Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Trip Details
                </CardTitle>
                <CardDescription>Select your trip date and time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Trip Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !tripDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tripDate ? format(tripDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tripDate}
                        onSelect={setTripDate}
                        disabled={(date) => date < new Date() || date > getMaxBookableDate()}
                        toDate={getMaxBookableDate()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Slot */}
                <div className="space-y-2">
                  <Label>Time Slot *</Label>
                  {!tripDate ? (
                    <p className="text-sm text-muted-foreground">Select a date first to see available time slots</p>
                  ) : loadingSlots ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading available slots...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>No time slots available for this date</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => slot.spots_remaining > 0 && setSelectedSlotId(slot.id)}
                          disabled={slot.spots_remaining <= 0}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all',
                            selectedSlotId === slot.id
                              ? 'border-primary bg-primary/5 ring-2 ring-primary'
                              : slot.spots_remaining > 0
                                ? 'border-border hover:border-primary/50'
                                : 'border-border bg-muted opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                            </span>
                          </div>
                          {slot.label && (
                            <p className="text-xs text-muted-foreground">{slot.label}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {slot.spots_remaining > 0
                              ? `${slot.spots_remaining} spots left`
                              : 'Fully booked'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Passengers */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numAdults">Adults *</Label>
                    <Select value={numAdults.toString()} onValueChange={(v) => setNumAdults(parseInt(v))}>
                      <SelectTrigger id="numAdults">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: tripType.max_passengers }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {num} {num === 1 ? 'Adult' : 'Adults'}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numChildren">Children</Label>
                    <Select value={numChildren.toString()} onValueChange={(v) => setNumChildren(parseInt(v))}>
                      <SelectTrigger id="numChildren">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: Math.max(tripType.max_passengers - numAdults + 1, 1) }, (_, i) => i).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            <div className="flex items-center gap-2">
                              <Baby className="h-4 w-4" />
                              {num} {num === 1 ? 'Child' : 'Children'}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Maximum {tripType.max_passengers} passengers per trip
                    {tripType.min_passengers && ` (minimum ${tripType.min_passengers})`}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Special Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Special Requests</CardTitle>
                <CardDescription>Optional - Any special requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any dietary requirements, accessibility needs, etc."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-sm text-foreground/80">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Secure Booking</p>
                      <p className="text-xs text-muted-foreground">Your information is protected with bank-level encryption</p>
                    </div>
                  </div>

                  {!bookingCreated ? (
                    <>
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isSubmitting || !tripDate || !selectedSlotId}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Booking...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Create Booking
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        By clicking create booking, you agree to the boat&apos;s cancellation policy
                      </p>
                    </>
                  ) : (
                    <>
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Booking created successfully! Reference: <strong>{bookingCreated.bookingReference}</strong>
                        </AlertDescription>
                      </Alert>

                      <RazorpayButton
                        bookingId={bookingCreated.bookingId}
                        amount={totalAmount}
                        bookingReference={bookingCreated.bookingReference}
                        guestName={`${firstName} ${lastName}`}
                        guestEmail={email}
                        guestPhone={phone}
                        bookingType="boat"
                      />

                      <p className="text-xs text-center text-muted-foreground">
                        Click the payment button above to complete your booking
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>

      {/* Booking Summary Sidebar */}
      <div className="lg:col-span-1 order-1 lg:order-2">
        <div className="sticky top-20">
          <Card>
            <CardHeader className="bg-linear-to-br from-primary/10 to-primary/5">
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Boat & Trip */}
              <div>
                <h3 className="font-semibold text-foreground mb-1">{boat.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {boat.departure_point && `${boat.departure_point}, `}{boat.city}
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold text-foreground mb-2">{tripType.name}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  <span>{tripType.duration_minutes} minutes</span>
                </div>
                {tripType.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{tripType.description}</p>
                )}
              </div>

              {tripDate && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trip Date</span>
                      <span className="font-medium">{format(tripDate, 'MMM dd, yyyy')}</span>
                    </div>
                    {selectedSlot && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">
                          {selectedSlot.start_time?.slice(0, 5)} - {selectedSlot.end_time?.slice(0, 5)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Passengers</span>
                      <span className="font-medium">
                        {numAdults} {numAdults === 1 ? 'Adult' : 'Adults'}
                        {numChildren > 0 && `, ${numChildren} ${numChildren === 1 ? 'Child' : 'Children'}`}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Pricing */}
              <Separator />
              <div className="space-y-2 text-sm">
                {tripType.pricing_model === 'per_person' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        ₹{(tripType.price_per_person || 0).toLocaleString('en-IN')} × {numAdults} adult{numAdults > 1 ? 's' : ''}
                      </span>
                      <span className="font-medium">
                        ₹{((tripType.price_per_person || 0) * numAdults).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {numChildren > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          ₹{(tripType.child_price_per_person || 0).toLocaleString('en-IN')} × {numChildren} child{numChildren > 1 ? 'ren' : ''}
                        </span>
                        <span className="font-medium">
                          ₹{((tripType.child_price_per_person || 0) * numChildren).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Boat (flat rate)</span>
                    <span className="font-medium">
                      ₹{(tripType.price_per_boat || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (12%)</span>
                  <span className="font-medium">
                    ₹{Math.round(taxAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold">Total</span>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    ₹{Math.round(totalAmount).toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground">Including all taxes</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Instant confirmation</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Best price guarantee</span>
                </div>
                {tripType.what_to_bring_text && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Bring: {tripType.what_to_bring_text}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
