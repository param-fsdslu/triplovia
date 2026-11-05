'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { Eye, Check, X, Loader2, Star } from '@/components/icons'
import {
  approveHotelReview,
  rejectHotelReview,
  approveBoatReview,
  rejectBoatReview,
} from '@/lib/actions/admin-reviews'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HotelReview {
  id: string
  hotel_id: string
  booking_id: string
  user_id: string
  title: string | null
  comment: string | null
  overall_rating: number | null
  staff_rating: number | null
  facilities_rating: number | null
  cleanliness_rating: number | null
  comfort_rating: number | null
  value_rating: number | null
  location_rating: number | null
  free_wifi_rating: number | null
  status: string | null
  is_verified: boolean | null
  stayed_date: string | null
  created_at: string | null
  hotel: { id: string; name: string; slug: string } | null
  booking: { booking_reference: string } | null
}

interface BoatReview {
  id: string
  boat_id: string
  boat_booking_id: string
  user_id: string
  title: string | null
  comment: string | null
  overall_rating: number
  safety_rating: number | null
  crew_rating: number | null
  experience_rating: number | null
  value_rating: number | null
  status: string
  is_verified: boolean | null
  trip_date: string | null
  created_at: string | null
  boat: { id: string; name: string; slug: string } | null
  boat_booking: { booking_reference: string } | null
}

interface ReviewsTableProps {
  hotelReviews: HotelReview[]
  boatReviews: BoatReview[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string | null) {
  const s = status ?? 'pending'
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    pending:  { variant: 'outline',     label: 'Pending' },
    approved: { variant: 'default',     label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  }
  const info = map[s] ?? { variant: 'secondary', label: s }
  return <Badge variant={info.variant}>{info.label}</Badge>
}

/** Converts 0-10 DB scale → display stars string (e.g. 8 → "4.0 ★") */
function displayRating(val: number | null) {
  if (val == null) return '—'
  return `${(val / 2).toFixed(1)} ★`
}

function RatingRow({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium flex items-center gap-1">
        <Star className="h-3 w-3 fill-gold text-gold" />
        {(value / 2).toFixed(1)}
      </span>
    </div>
  )
}

// ─── Hotel Reviews tab ────────────────────────────────────────────────────────

function HotelReviewsTab({ reviews }: { reviews: HotelReview[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<HotelReview | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handle = async (
    id: string,
    action: 'approve' | 'reject'
  ) => {
    setProcessing(id)
    const fn = action === 'approve' ? approveHotelReview : rejectHotelReview
    startTransition(async () => {
      try {
        const result = await fn(id)
        if (result.success) {
          router.refresh()
        } else {
          alert(result.error || `Failed to ${action} review`)
        }
      } catch (err: any) {
        alert(err?.message || `Failed to ${action} review`)
      } finally {
        setProcessing(null)
      }
    })
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hotel</TableHead>
              <TableHead>Booking Ref</TableHead>
              <TableHead>Overall</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hotel reviews found
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium max-w-[140px] truncate">
                    {review.hotel?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {review.booking?.booking_reference ?? '—'}
                  </TableCell>
                  <TableCell>
                    {review.overall_rating != null ? (
                      <span className="flex items-center gap-1 font-medium">
                        <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                        {(review.overall_rating / 2).toFixed(1)}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {review.title && (
                      <p className="font-medium text-sm truncate">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-xs text-muted-foreground truncate">{review.comment}</p>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(review.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {review.created_at ? format(new Date(review.created_at), 'MMM dd, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelected(review)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {review.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            disabled={processing === review.id}
                            onClick={() => handle(review.id, 'approve')}
                          >
                            {processing === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><Check className="h-4 w-4 mr-1" />Approve</>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={processing === review.id}
                            onClick={() => handle(review.id, 'reject')}
                          >
                            <X className="h-4 w-4 mr-1" />Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hotel Review</DialogTitle>
            <DialogDescription>
              {selected?.hotel?.name} · {selected?.booking?.booking_reference}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {statusBadge(selected.status)}
                {selected.is_verified && (
                  <span className="text-xs text-green-600 font-medium">Verified Stay</span>
                )}
              </div>

              {selected.title && (
                <p className="font-semibold text-foreground">{selected.title}</p>
              )}
              {selected.comment && (
                <p className="text-sm text-foreground leading-relaxed">{selected.comment}</p>
              )}

              <div className="space-y-1.5 border rounded-lg p-3 bg-background">
                <RatingRow label="Overall"     value={selected.overall_rating} />
                <RatingRow label="Staff"       value={selected.staff_rating} />
                <RatingRow label="Facilities"  value={selected.facilities_rating} />
                <RatingRow label="Cleanliness" value={selected.cleanliness_rating} />
                <RatingRow label="Comfort"     value={selected.comfort_rating} />
                <RatingRow label="Value"       value={selected.value_rating} />
                <RatingRow label="Location"    value={selected.location_rating} />
                <RatingRow label="Free Wi-Fi"  value={selected.free_wifi_rating} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Stayed</p>
                  <p>{selected.stayed_date ? format(new Date(selected.stayed_date), 'MMM dd, yyyy') : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p>{selected.created_at ? format(new Date(selected.created_at), 'MMM dd, yyyy') : '—'}</p>
                </div>
              </div>

              {selected.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    disabled={processing === selected.id}
                    onClick={() => handle(selected.id, 'approve')}
                  >
                    {processing === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" />Approve</>}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={processing === selected.id}
                    onClick={() => handle(selected.id, 'reject')}
                  >
                    <X className="h-4 w-4 mr-1" />Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Boat Reviews tab ─────────────────────────────────────────────────────────

function BoatReviewsTab({ reviews }: { reviews: BoatReview[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<BoatReview | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handle = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    const fn = action === 'approve' ? approveBoatReview : rejectBoatReview
    startTransition(async () => {
      try {
        const result = await fn(id)
        if (result.success) {
          router.refresh()
        } else {
          alert(result.error || `Failed to ${action} review`)
        }
      } catch (err: any) {
        alert(err?.message || `Failed to ${action} review`)
      } finally {
        setProcessing(null)
      }
    })
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boat</TableHead>
              <TableHead>Booking Ref</TableHead>
              <TableHead>Overall</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No boat reviews found
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium max-w-[140px] truncate">
                    {review.boat?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {review.boat_booking?.booking_reference ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 font-medium">
                      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                      {(review.overall_rating / 2).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {review.title && (
                      <p className="font-medium text-sm truncate">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-xs text-muted-foreground truncate">{review.comment}</p>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(review.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {review.created_at ? format(new Date(review.created_at), 'MMM dd, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelected(review)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {review.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            disabled={processing === review.id}
                            onClick={() => handle(review.id, 'approve')}
                          >
                            {processing === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><Check className="h-4 w-4 mr-1" />Approve</>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={processing === review.id}
                            onClick={() => handle(review.id, 'reject')}
                          >
                            <X className="h-4 w-4 mr-1" />Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Boat Review</DialogTitle>
            <DialogDescription>
              {selected?.boat?.name} · {selected?.boat_booking?.booking_reference}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {statusBadge(selected.status)}
                {selected.is_verified && (
                  <span className="text-xs text-green-600 font-medium">Verified Trip</span>
                )}
              </div>

              {selected.title && (
                <p className="font-semibold text-foreground">{selected.title}</p>
              )}
              {selected.comment && (
                <p className="text-sm text-foreground leading-relaxed">{selected.comment}</p>
              )}

              <div className="space-y-1.5 border rounded-lg p-3 bg-background">
                <RatingRow label="Overall"    value={selected.overall_rating} />
                <RatingRow label="Safety"     value={selected.safety_rating} />
                <RatingRow label="Crew"       value={selected.crew_rating} />
                <RatingRow label="Experience" value={selected.experience_rating} />
                <RatingRow label="Value"      value={selected.value_rating} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Trip Date</p>
                  <p>{selected.trip_date ? format(new Date(selected.trip_date), 'MMM dd, yyyy') : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p>{selected.created_at ? format(new Date(selected.created_at), 'MMM dd, yyyy') : '—'}</p>
                </div>
              </div>

              {selected.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    disabled={processing === selected.id}
                    onClick={() => handle(selected.id, 'approve')}
                  >
                    {processing === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" />Approve</>}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={processing === selected.id}
                    onClick={() => handle(selected.id, 'reject')}
                  >
                    <X className="h-4 w-4 mr-1" />Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ReviewsTable({ hotelReviews, boatReviews }: ReviewsTableProps) {
  const pendingHotel = hotelReviews.filter((r) => r.status === 'pending').length
  const pendingBoat  = boatReviews.filter((r) => r.status === 'pending').length

  return (
    <Tabs defaultValue="hotel">
      <TabsList className="mb-4">
        <TabsTrigger value="hotel" className="flex items-center gap-2">
          Hotel Reviews
          {pendingHotel > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[11px]">
              {pendingHotel}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="boat" className="flex items-center gap-2">
          Boat Reviews
          {pendingBoat > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[11px]">
              {pendingBoat}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="hotel">
        <HotelReviewsTab reviews={hotelReviews} />
      </TabsContent>
      <TabsContent value="boat">
        <BoatReviewsTab reviews={boatReviews} />
      </TabsContent>
    </Tabs>
  )
}
