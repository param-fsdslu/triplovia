'use client';

/**
 * HotelDetailsClient — client component that renders the full hotel detail page.
 *
 * Data: uses useHotelBySlug (TanStack Query) to fetch hotel with all relations.
 *
 * Scroll spy: a passive scroll event listener updates activeTab as the user scrolls
 * through the overview / rooms / policies / reviews sections. The tab highlight
 * follows the section currently in the viewport (detected by getBoundingClientRect).
 *
 * scrollToSection: smooth-scrolls to a section and accounts for the sticky navbar
 * height (80px) plus the tabs bar height so sections aren't hidden under them.
 *
 * Booking, MakeMyTrip-style: the guests and rooms come from the search box (or StayGuestsPicker
 * beside the dates), each room type shows the rooms that party needs and their price with extra
 * beds (RoomComparison, lib/utils/occupancy.ts), and Select goes straight to the review page.
 * Anyone can book: without a session the review page takes a name and mobile number.
 */
import { CancellationPolicyMatrix } from './CancellationPolicyMatrix'
import { isHotelCancellationPolicy } from '@/lib/config/hotel-cancellation-policy'
import { useHotelBySlug } from '@/lib/hooks/use-hotels';
import Image from 'next/image';
import { ImageGallery } from './ImageGallery';
import { hotelPanoramaViews } from '@/lib/utils/panorama';
import { RoomComparison } from './RoomComparison';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/routing';
import { useSearchStore } from '@/lib/stores/use-search-store';
import { format } from 'date-fns';
import { Fragment, useEffect, useState, useRef, useCallback } from 'react';
import {
  MapPin,
  Star,
  Shield,
  CheckCircle2,
  Clock,
  User,
  MessageSquare,
} from '@/components/icons';
import { getAmenityIcon } from '@/lib/utils/amenityIcons';
import { FREE_CANCELLATION_HOURS } from '@/lib/config/cancellation-policy';
import { Button } from '@/components/ui/button';
import { RoomAvailabilityCard } from './RoomAvailabilityCard';
import { SimilarStays } from './SimilarStays';
import { NearbyPlaces } from './NearbyPlaces';
import { nearestPlaces } from '@/lib/utils/nearby-places';
import { Footer } from '@/components/Footer';
import { cn, formatCurrency } from '@/lib/utils';
import { applyCartStay, upcomingCartDates, useCartStore } from '@/lib/stores/use-cart-store';
import { childAgesParam, partyNightlyPrice, roomsForParty, type Party } from '@/lib/utils/occupancy';

interface HotelDetailsClientProps {
  slug: string;
}

/** image_urls may come back as a real array or a JSON-stringified array depending on column type. */
function parseReviewImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string' && v.length > 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function HotelDetailsClient({ slug }: HotelDetailsClientProps) {
  const router = useRouter();
  const searchCheckIn = useSearchStore((s) => s.checkIn);
  const searchCheckOut = useSearchStore((s) => s.checkOut);
  const { data: hotel, isLoading, error } = useHotelBySlug(
    slug,
    searchCheckIn ? format(searchCheckIn, 'yyyy-MM-dd') : undefined,
    searchCheckOut ? format(searchCheckOut, 'yyyy-MM-dd') : undefined
  );
  const searchAdults = useSearchStore((s) => s.adults);
  const searchChildren = useSearchStore((s) => s.children);
  const searchPets = useSearchStore((s) => s.pets);
  const searchRooms = useSearchStore((s) => s.rooms);
  const searchChildAges = useSearchStore((s) => s.childAges);
  const party: Party = { adults: searchAdults, children: searchChildren, rooms: searchRooms, childAges: searchChildAges };
  const [activeTab, setActiveTab] = useState('overview');
  const tabsRef = useRef<HTMLDivElement>(null);

  // Scroll spy: update active tab based on scroll position
  useEffect(() => {
    const sectionIds = ['overview', 'rooms', 'policies', 'reviews'];
    const handleScroll = () => {
      const tabsHeight = tabsRef.current?.offsetHeight || 60;
      const offset = 80 + tabsHeight; // navbar + tabs height
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.getBoundingClientRect().top <= offset + 10) {
          setActiveTab(sectionIds[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // The stay picked last (lib/stores/use-cart-store.ts, kept by the review page) comes back with
  // its dates and guests when the search box has no dates (e.g. after a reload)
  useEffect(() => {
    const kept = useCartStore.getState();
    if (kept.hotel?.slug === slug && upcomingCartDates(kept) && !useSearchStore.getState().checkIn) applyCartStay();
  }, [slug]);

  // Phones: the bottom "Select rooms" bar hides while the rooms list is on screen
  const [roomsInView, setRoomsInView] = useState(false);
  const hotelLoaded = !!hotel;
  useEffect(() => {
    const el = document.getElementById('rooms');
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setRoomsInView(entry.isIntersecting), {
      rootMargin: '-120px 0px -80px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hotelLoaded]);

  const scrollToSection = useCallback((sectionId: string) => {
    setActiveTab(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      const tabsHeight = tabsRef.current?.offsetHeight || 60;
      const offset = 80 + tabsHeight; // navbar + tabs
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  // "Back to hotel" (review page) and the floating cart land on the rooms list (#rooms), once per
  // visit. Read late: Next.js writes the new URL after this page's effects have run.
  const roomsHashHandled = useRef(false);
  useEffect(() => {
    if (!hotelLoaded || roomsHashHandled.current) return;
    const timer = setTimeout(() => {
      roomsHashHandled.current = true;
      if (window.location.hash === '#rooms') scrollToSection('rooms');
    }, 150);
    return () => clearTimeout(timer);
  }, [hotelLoaded, scrollToSection]);

  if (isLoading) {
    return (
      <div className="page-container py-8 pt-20 sm:pt-24">
        <Skeleton className="h-[250px] sm:h-[350px] md:h-[400px] w-full rounded-lg mb-8" />
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="page-container py-20 pt-32">
        <div className="text-center">
          <h1
            className="text-3xl font-bold text-foreground mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Hotel Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The hotel you're looking for doesn't exist or has been removed.
          </p>
          <a
            href="/"
            className="text-primary hover:underline font-semibold"
          >
            Return to home
          </a>
        </div>
      </div>
    );
  }

  // Cheapest stay for this party (the rooms each type needs, extra beds, the dates' pricing), all-inclusive
  const partyPrices = (hotel.room_types ?? []).flatMap((room: any) => {
    const fit = roomsForParty(room, party);
    return fit.error || room.status !== 'available' ? [] : [partyNightlyPrice(room, fit.rooms, party).total];
  });
  const startingPrice = partyPrices.length ? Math.min(...partyPrices) : undefined;
  // Every 360° photo of the hotel (its own, then each room's), played inside the photo viewer
  const panoramaViews = hotelPanoramaViews(hotel.hotel_panoramas, hotel.room_types);
  const amenityNames: string[] = (hotel.hotel_amenities ?? []).map((item: any) => item.amenity?.name).filter(Boolean);
  const highlights = amenityNames.slice(0, 4);
  const propertyType = hotel.property_type
    ? hotel.property_type.charAt(0).toUpperCase() + hotel.property_type.slice(1)
    : null;
  const reviewCount = hotel.review_count ?? 0;
  const avgRating = hotel.avg_rating ? Number(hotel.avg_rating) : 0;
  const guestCount = searchAdults + searchChildren;
  const stayLabel =
    searchCheckIn && searchCheckOut
      ? `${format(searchCheckIn, 'EEE d MMM')} – ${format(searchCheckOut, 'EEE d MMM')} · ${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}`
      : undefined;
  const staySummary =
    searchCheckIn && searchCheckOut
      ? `${format(searchCheckIn, 'd MMM')} – ${format(searchCheckOut, 'd MMM')} · ${searchAdults + searchChildren} guests`
      : 'Add dates for exact prices';

  // Select: the rooms this party needs of one room type, straight to the review page (no sign-in needed).
  // Children's ages price the stay and the review page doesn't ask them: a missing one opens the
  // guests picker (StayGuestsPicker, at the top) first.
  const selectRoom = (roomId: string, rooms: number) => {
    if (searchChildren > 0 && searchChildAges.some((age) => age == null)) {
      document.getElementById('stay-guests')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      useSearchStore.getState().setIsGuestOpen(true);
      return;
    }
    const params = new URLSearchParams();
    if (rooms === 1) params.set('roomId', roomId);
    else params.set('rooms', `${roomId}:${rooms}`);
    if (searchCheckIn) params.set('checkIn', format(searchCheckIn, 'yyyy-MM-dd'));
    if (searchCheckOut) params.set('checkOut', format(searchCheckOut, 'yyyy-MM-dd'));
    params.set('adults', String(searchAdults));
    if (searchChildren) params.set('children', String(searchChildren));
    const ages = searchChildren ? childAgesParam(searchChildAges) : undefined;
    if (ages) params.set('ages', ages);
    if (searchPets) params.set('pets', '1');
    router.push(`/hotels/${slug}/book?${params.toString()}`);
  };

  return (
    <div className="bg-background pt-16 sm:pt-[72px]">
      <div className="page-container py-6 space-y-4">
        {/* Compact Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">Home</a>
          <span className="text-border">/</span>
          <a href="/hotels" className="hover:text-primary">Hotels</a>
          <span className="text-border">/</span>
          <span className="text-foreground">{hotel.city}</span>
        </nav>

        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            {/* Stars and stay type as plain text (no pills), like the search results cards */}
            {(hotel.star_rating || propertyType) && (
              <div className="mb-1.5 flex items-center gap-2 text-sm">
                {!!hotel.star_rating && (
                  <span className="inline-flex items-center gap-0.5" aria-hidden>
                    {Array.from({ length: hotel.star_rating }, (_, i) => (
                      <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                    ))}
                  </span>
                )}
                <span className="font-bold text-foreground">
                  {hotel.star_rating ? `${hotel.star_rating} Star ${propertyType || 'Property'}` : propertyType}
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
              {hotel.name}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">
                {[hotel.address_line_1, hotel.city, hotel.state].filter(Boolean).join(', ')}
              </span>
            </p>
            {/* Highlights: this property's own amenities, icon + name in a row (no chips) */}
            {highlights.length > 0 && (
              <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground/80">
                {highlights.map((name) => {
                  const Icon = getAmenityIcon(name);
                  return (
                    <li key={name} className="inline-flex items-center gap-2">
                      <Icon className="h-5 w-5 shrink-0 text-primary" />
                      {name}
                    </li>
                  );
                })}
                {amenityNames.length > highlights.length && (
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('overview')}
                      className="font-semibold text-primary hover:underline"
                    >
                      +{amenityNames.length - highlights.length} more
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Guest rating (or "New" until the first review) */}
          {avgRating > 0 ? (
            <button
              type="button"
              onClick={() => scrollToSection('reviews')}
              className="group flex shrink-0 items-center gap-3 self-start text-left"
            >
              <span className="rounded-lg rounded-bl-none bg-primary px-2.5 py-1.5 font-heading text-lg font-bold text-white">
                {avgRating.toFixed(1)}
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold text-foreground group-hover:text-primary">
                  {avgRating >= 4.5 ? 'Excellent' : avgRating >= 4 ? 'Very good' : avgRating >= 3.5 ? 'Good' : 'Rated'}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                </span>
              </span>
            </button>
          ) : (
            <span className="shrink-0 self-start text-sm font-bold text-primary">New on Triplovia</span>
          )}
        </div>
      </div>

      {/* Hero: photos left, room availability right (stacked below lg) */}
      <div className="page-container">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
          {(hotel.hotel_images?.length > 0 || panoramaViews.length > 0) && (
            <ImageGallery
              images={hotel.hotel_images ?? []}
              hotelName={hotel.name}
              panoramas={panoramaViews}
              className="lg:h-full lg:min-h-[450px]"
            />
          )}
          {hotel.room_types && hotel.room_types.length > 0 && (
            <RoomAvailabilityCard
              className="lg:col-start-2"
              rooms={hotel.room_types}
              party={party}
              stayLabel={stayLabel}
              onSelectRoom={(roomId) => scrollToSection(`room-${roomId}`)}
              onViewAll={() => scrollToSection('rooms')}
            />
          )}
        </div>
      </div>

      {/* Sticky Tab Navigation */}
      <div ref={tabsRef} className="sticky top-16 sm:top-[72px] z-30 mt-6 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="page-container">
          <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'rooms', label: `Rooms${hotel.room_types?.length ? ` (${hotel.room_types.length})` : ''}` },
              { id: 'policies', label: 'Property Rules' },
              { id: 'reviews', label: `Reviews${reviewCount ? ` (${reviewCount})` : ''}` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 min-w-0 space-y-6">
            {/* Overview Section */}
            <div id="overview">
              {/* Description */}
              {hotel.description && (
                <Card>
                  <CardContent className="px-5 sm:px-6">
                    <h2
                      className="text-lg font-bold text-foreground mb-3"
                    >
                      About This Property
                    </h2>
                    <p className="text-foreground/75 text-sm leading-relaxed whitespace-pre-line">
                      {hotel.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Amenities */}
              {hotel.hotel_amenities && hotel.hotel_amenities.length > 0 && (
                <Card className="mt-6">
                  <CardContent className="px-5 sm:px-6">
                    <h2 className="text-lg font-bold text-foreground mb-3">
                      All Amenities
                    </h2>
                    {/* Bigger icons (24px), by request */}
                    <ul className="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
                      {hotel.hotel_amenities.map((item: any) => {
                        const name = item.amenity?.name || 'Amenity';
                        const Icon = getAmenityIcon(name);
                        return (
                          <li key={item.id} className="flex min-w-0 items-center gap-3 text-sm text-foreground/80">
                            <Icon className="h-6 w-6 shrink-0 text-primary" />
                            {/* "Kitchen/Kitchenette" may wrap after the slash on phones, not mid-word */}
                            <span className="min-w-0 [overflow-wrap:break-word]">
                              {name.split('/').map((part: string, i: number) => (
                                <Fragment key={i}>
                                  {i > 0 && (
                                    <>
                                      /<wbr />
                                    </>
                                  )}
                                  {part}
                                </Fragment>
                              ))}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Nearby places & connectivity, nearest first (set in the admin hotel form) */}
              {nearestPlaces(hotel.nearby_places).length > 0 && (
                <Card className="mt-6">
                  <CardContent className="px-5 sm:px-6">
                    <h2 className="text-lg font-bold text-foreground mb-3">Nearby &amp; Connectivity</h2>
                    <NearbyPlaces places={hotel.nearby_places} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Rooms Section */}
            <div id="rooms">
              {hotel.room_types && hotel.room_types.length > 0 && (
                <RoomComparison
                  rooms={hotel.room_types}
                  party={party}
                  onSelectRoom={selectRoom}
                />
              )}
            </div>

            {/* Policies Section */}
            <div id="policies">
              {(hotel.check_in_from_time || hotel.check_out_time || hotel.cancellation_policy_text) && (
                <Card>
                  <CardContent className="px-5 sm:px-6">
                    <h2
                      className="text-xl font-bold text-foreground mb-3"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Property Rules
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {hotel.check_in_from_time && (
                        <div className="flex items-start gap-3 rounded-xl bg-mint/50 p-3.5">
                          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Check-in</h3>
                            <p className="mt-1 text-sm text-muted-foreground">From {hotel.check_in_from_time.slice(0, 5)}</p>
                          </div>
                        </div>
                      )}
                      {hotel.check_out_time && (
                        <div className="flex items-start gap-3 rounded-xl bg-mint/50 p-3.5">
                          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Check-out</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Until {hotel.check_out_time.slice(0, 5)}</p>
                          </div>
                        </div>
                      )}
                      {(hotel.cancellation_policy || hotel.cancellation_policy_text) && (
                        <div className="flex items-start gap-3 rounded-xl bg-mint/50 p-4 sm:col-span-2 sm:p-5">
                          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-3 text-sm font-semibold leading-5 text-foreground">Cancellation</h3>
                            {isHotelCancellationPolicy(hotel.cancellation_policy) ? <CancellationPolicyMatrix policy={hotel.cancellation_policy} /> : <p className="text-sm leading-relaxed text-muted-foreground">{hotel.cancellation_policy_text}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* User Reviews Section */}
            <div id="reviews">
              <Card>
                <CardContent className="px-5 sm:px-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground">User Reviews</h2>
                    {hotel.avg_rating != null && hotel.review_count != null && hotel.review_count > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 rounded-md">
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span className="text-sm font-bold">{hotel.avg_rating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {hotel.review_count} {hotel.review_count === 1 ? 'review' : 'reviews'}
                        </span>
                      </div>
                    )}
                  </div>

                  {(hotel as any).reviews && (hotel as any).reviews.length > 0 ? (
                    <div className="space-y-4">
                      {(hotel as any).reviews
                        .filter((r: any) => r.status === 'approved')
                        .map((review: any) => (
                        <div key={review.id} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {review.reviewer_name || 'Guest'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(review.created_at), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-gold/10 text-gold px-2 py-0.5 rounded-full text-xs font-semibold">
                              <Star className="w-3 h-3 fill-gold text-gold" />
                              {(review.overall_rating / 2).toFixed(1)}
                            </div>
                          </div>
                          {review.title && (
                            <p className="text-sm font-semibold text-foreground mb-1">
                              {review.title}
                            </p>
                          )}
                          {review.comment && (
                            <p className="text-sm text-foreground/75 leading-relaxed">
                              {review.comment}
                            </p>
                          )}
                          {(() => {
                            const photos = parseReviewImageUrls(review.image_urls)
                            if (photos.length === 0) return null
                            return (
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {photos.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative w-16 h-16 rounded-md overflow-hidden border border-border shrink-0"
                                  >
                                    <Image
                                      src={url}
                                      alt={`Review photo ${idx + 1}`}
                                      fill
                                      className="object-cover"
                                      sizes="64px"
                                    />
                                  </a>
                                ))}
                              </div>
                            )
                          })()}
                          {/* Review Response */}
                          {review.review_response && review.review_response.length > 0 && (
                            <div className="mt-3 ml-6 bg-muted/40 rounded-xl p-3">
                              <div className="flex items-center gap-1.5 mb-1">
                                <MessageSquare className="w-3 h-3 text-primary" />
                                <span className="text-xs font-medium text-foreground">Hotel Response</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {review.review_response[0].response_text}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No reviews yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Be the first to review this property</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 min-w-0">
            <div className="sticky top-36 space-y-4">
              {/* Contact Information — commented out for future use */}
              {/*
              <Card>
                <CardContent className="px-5 sm:px-6 space-y-3">
                  <h3 className="font-bold text-foreground text-base">Contact</h3>
                  <Separator />
                  {hotel.phone && (
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs mb-1">Phone</p>
                        <a
                          href={`tel:${hotel.phone}`}
                          className="text-primary hover:underline font-medium text-sm"
                        >
                          {hotel.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {hotel.email && (
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs mb-1">Email</p>
                        <a
                          href={`mailto:${hotel.email}`}
                          className="text-primary hover:underline font-medium break-all text-sm"
                        >
                          {hotel.email}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              */}

              {/* Location Card */}
              {((hotel as any).maps_embed_url || (hotel.latitude && hotel.longitude)) && (
                <Card>
                  <CardContent className="px-5 sm:px-6">
                    <h3 className="font-bold text-foreground text-sm mb-2">Location</h3>
                    <div className="rounded-lg overflow-hidden mb-2">
                      <iframe
                        title="Hotel location"
                        width="100%"
                        height="160"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={
                          (hotel as any).maps_embed_url ||
                          `https://maps.google.com/maps?q=${hotel.latitude},${hotel.longitude}&z=15&output=embed`
                        }
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {hotel.address_line_1}
                      {hotel.address_line_2 && `, ${hotel.address_line_2}`}
                      <br />
                      {hotel.city}, {hotel.state} {hotel.postal_code}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Why Book With Us */}
              <Card className="bg-mint border-transparent shadow-none">
                <CardContent className="px-5 sm:px-6">
                  <h3 className="font-bold text-foreground text-base mb-3">Why book with Triplovia</h3>
                  <ul className="space-y-2.5 text-sm text-foreground/80">
                    {[
                      'Instant booking confirmation',
                      'Secure payment via Razorpay',
                      isHotelCancellationPolicy(hotel.cancellation_policy) ? `Cancellation policy: ${hotel.cancellation_policy}. See the refund matrix above.` : `Cancel up to ${FREE_CANCELLATION_HOURS} hours before check-in for a refund (minus the gateway fee)`,
                      'Local support in Honnavar',
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <SimilarStays hotelId={hotel.id} city={hotel.city} />

      {/* The bottom padding keeps the footer clear of the phones' Select rooms bar */}
      <Footer className="pb-20 lg:pb-0" />

      {/* Phones / tablets: the party's cheapest stay + Select rooms always at hand (hidden over the rooms list) */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md transition-transform duration-300 lg:hidden',
          roomsInView ? 'translate-y-full' : 'translate-y-0'
        )}
      >
        <div className="page-container flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            {startingPrice ? (
              <p className="font-heading text-lg font-extrabold leading-tight text-foreground">
                {formatCurrency(startingPrice)}
                <span className="ml-1 font-sans text-xs font-medium text-muted-foreground">/ night</span>
              </p>
            ) : null}
            <p className="truncate text-xs text-muted-foreground">{staySummary}</p>
          </div>
          <Button type="button" onClick={() => scrollToSection('rooms')} className="h-11 shrink-0 rounded-md px-6 font-bold">
            Select rooms
          </Button>
        </div>
      </div>
    </div>
  );
}
