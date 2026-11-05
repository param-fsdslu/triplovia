'use client';

/**
 * Hotel page rooms list: one card per room type (photo, details, price, Select) and a
 * side-by-side comparison of up to 3 rooms picked with each card's Compare checkbox. Controls
 * here use small 6px corners (`rounded-md`), not pills, by request.
 *
 * MakeMyTrip-style booking: the party (adults, children, rooms) is picked up front, and each room
 * type shows how many of its rooms that party needs and their nightly price with extra beds
 * (lib/utils/occupancy.ts). Select goes straight to the review page with those rooms.
 */
import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Users,
  Bed,
  Maximize2,
  X,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ArrowRight,
  Rotate3d,
} from '@/components/icons';
import { cn, formatCurrency } from '@/lib/utils';
import { partyNightlyPrice, roomsForParty, type Party } from '@/lib/utils/occupancy';
import { RoomImageGallery } from './RoomImageGallery';
import { getAmenityIcon } from '@/lib/utils/amenityIcons';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  size_sqm?: number;
  max_occupancy: number;
  max_adults: number;
  max_children: number;
  standard_occupancy?: number;
  extra_bed_price?: number;
  child_price?: number | null;
  bed_configuration?: string;
  base_price: number;
  /** Effective per-night price for the selected stay dates (weekend/festival pricing applied), when dates are known. */
  current_price?: number;
  num_available_rooms: number;
  status: string;
  room_type_amenities?: Array<{
    id: string;
    amenity?: {
      id: string;
      name: string;
      icon?: string;
    };
  }>;
  room_amenities?: Array<{
    id: string;
    amenity?: {
      id: string;
      name: string;
      icon?: string;
    };
  }>;
  room_type_images?: Array<{
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }>;
  room_type_panoramas?: Array<{
    id: string;
    image_url: string;
    title: string | null;
    display_order: number;
  }>;
}

const MAX_COMPARE = 3;

/** "2 adults, 1 child" (no child places of its own: children take adult places) */
function guestMix(room: RoomType): string {
  const adults = `${room.max_adults} ${room.max_adults === 1 ? 'adult' : 'adults'}`;
  return room.max_children > 0 ? `${adults}, ${room.max_children} ${room.max_children === 1 ? 'child' : 'children'}` : adults;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "2 adults · 1 child" */
export function partyLabel(party: Party) {
  return [plural(party.adults, 'adult'), party.children > 0 ? plural(party.children, 'child', 'children') : null]
    .filter(Boolean)
    .join(' · ');
}

function amenitiesOf(room: RoomType) {
  return room.room_type_amenities || room.room_amenities || [];
}

interface RoomComparisonProps {
  rooms: RoomType[];
  /** The guests and rooms picked up front (search box / StayGuestsPicker) */
  party: Party;
  /** Book this room type: the rooms the party needs, straight to the review page */
  onSelectRoom: (roomId: string, rooms: number) => void;
}

export function RoomComparison({ rooms, party, onSelectRoom }: RoomComparisonProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{ roomId: string; index: number } | null>(null);

  // What each room type means for this party: rooms needed (or why it can't be booked) and a night's price
  const quoteOf = (room: RoomType) => {
    const soldOut = room.status !== 'available' || room.num_available_rooms === 0;
    const fit = roomsForParty(room, party);
    const error = soldOut ? 'Sold out' : fit.error;
    return { ...fit, error, price: partyNightlyPrice(room, fit.rooms, party) };
  };
  const sortedRooms = [...rooms].sort((a, b) => {
    const qa = quoteOf(a);
    const qb = quoteOf(b);
    return Number(!!qa.error) - Number(!!qb.error) || qa.price.total - qb.price.total;
  });
  const cheapestId = sortedRooms.find((room) => !quoteOf(room).error)?.id;

  const toggleExpand = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const toggleCompare = (roomId: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else if (next.size < MAX_COMPARE) next.add(roomId);
      return next;
    });
  };

  const selectedRooms = sortedRooms.filter((room) => selectedForCompare.has(room.id));

  const allAmenities = new Set<string>();
  selectedRooms.forEach((room) => {
    amenitiesOf(room).forEach((amenity: any) => {
      if (amenity.amenity?.name) {
        allAmenities.add(amenity.amenity.name);
      }
    });
  });

  /** Select (the rooms this party needs), or why it can't be booked: the same on the cards and in the comparison */
  const selectControl = (room: RoomType, fullWidth = false) => {
    const quote = quoteOf(room);
    const label = quote.error
      ? quote.error === 'Sold out'
        ? 'Sold out'
        : 'Not available'
      : quote.rooms > 1
        ? `Select ${quote.rooms} rooms`
        : 'Select room';
    return (
      <Button
        onClick={() => onSelectRoom(room.id, quote.rooms)}
        disabled={!!quote.error}
        className={cn('gap-2 rounded-md px-5', fullWidth && 'w-full')}
      >
        {label}
        {!quote.error && <ArrowRight className="w-4 h-4" />}
      </Button>
    );
  };

  /** A night for the rooms this party needs, incl. taxes & fees and extra beds */
  const priceBlock = (room: RoomType, large = true) => {
    const quote = quoteOf(room);
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn('font-bold text-primary', large ? 'text-3xl' : 'text-xl')}>
            {formatCurrency(quote.price.total)}
          </span>
          <span className="text-sm text-muted-foreground">/ night</span>
          {large && room.current_price != null && room.current_price !== room.base_price && (
            <Badge variant="outline" className="rounded-md text-[10px]">For selected dates</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          For {plural(quote.rooms, 'room')} · {partyLabel(party)} · incl. taxes &amp; fees
        </p>
        {quote.price.extraBeds > 0 && (
          <p className="text-xs text-muted-foreground">
            Incl. {formatCurrency(quote.price.extraBeds)} for {plural(quote.price.extraGuests, 'extra guest')} (extra bed / child rate)
          </p>
        )}
        {quote.error && quote.error !== 'Sold out' && (
          <p className="text-xs font-medium text-destructive">{quote.error}</p>
        )}
      </div>
    );
  };

  // Comparison rows; a row every picked room leaves empty is left out
  const compareRows: { label: string; render: (room: RoomType) => ReactNode }[] = [
    {
      label: 'Price per night',
      render: (room) => priceBlock(room, false),
    },
    {
      label: 'Guests',
      render: (room) => (
        <>
          Up to {room.max_occupancy}
          <span className="block text-xs text-muted-foreground">{guestMix(room)}</span>
        </>
      ),
    },
    ...(selectedRooms.some((room) => room.bed_configuration)
      ? [{ label: 'Beds', render: (room: RoomType) => room.bed_configuration || '—' }]
      : []),
    ...(selectedRooms.some((room) => room.size_sqm)
      ? [{ label: 'Room size', render: (room: RoomType) => (room.size_sqm ? `${room.size_sqm} m²` : '—') }]
      : []),
    {
      label: 'Availability',
      render: (room) =>
        room.num_available_rooms === 0 ? (
          <span className="font-medium text-destructive">Sold out</span>
        ) : (
          <span className={cn('font-medium', room.num_available_rooms <= 3 ? 'text-destructive' : 'text-primary')}>
            {room.num_available_rooms} {room.num_available_rooms === 1 ? 'room' : 'rooms'} left
          </span>
        ),
    },
    ...(selectedRooms.some((room) => room.description)
      ? [
          {
            label: 'About the room',
            render: (room: RoomType) => (
              <span className="text-muted-foreground">{room.description || '—'}</span>
            ),
          },
        ]
      : []),
    ...(allAmenities.size > 0
      ? [
          {
            label: 'Amenities',
            render: (room: RoomType) => (
              <ul className="space-y-1.5">
                {Array.from(allAmenities).map((amenityName) => {
                  const hasAmenity = amenitiesOf(room).some((a: any) => a.amenity?.name === amenityName);
                  const Icon = getAmenityIcon(amenityName);
                  return (
                    <li key={amenityName} className="flex items-start gap-2 text-xs">
                      {hasAmenity ? (
                        <Icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                      )}
                      <span className={hasAmenity ? 'text-foreground' : 'text-muted-foreground line-through'}>
                        {amenityName}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-xl font-bold text-foreground">Available Rooms & Prices</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Prices for {partyLabel(party)}, with the rooms each type needs
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {rooms.length} room {rooms.length === 1 ? 'type' : 'types'}
        </p>
      </div>

      {/* Compare bar: shows once a room is ticked */}
      {selectedForCompare.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/25 bg-mint px-4 py-3">
          <p className="text-sm text-secondary">
            <span className="font-semibold">
              {selectedForCompare.size} of {MAX_COMPARE} rooms picked.
            </span>{' '}
            {selectedForCompare.size < 2 ? 'Tick one more to compare.' : 'Ready to compare side by side.'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedForCompare(new Set())}
              className="rounded-md text-muted-foreground"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCompareDialog(true)}
              disabled={selectedForCompare.size < 2}
              className="rounded-md"
            >
              Compare {selectedForCompare.size} rooms
            </Button>
          </div>
        </div>
      )}

      {/* Room Cards */}
      <div className="space-y-4">
        {sortedRooms.map((room) => {
          const isExpanded = expandedRooms.has(room.id);
          const isSelectedForCompare = selectedForCompare.has(room.id);
          const compareFull = !isSelectedForCompare && selectedForCompare.size >= MAX_COMPARE;
          const isCheapest = room.id === cheapestId;
          const primaryImage = room.room_type_images?.[0];
          const roomImages = room.room_type_images ?? [];
          // 360° photos follow the photos in the room's photo viewer
          const roomPanoramas = room.room_type_panoramas ?? [];
          const hasMedia = roomImages.length > 0 || roomPanoramas.length > 0;
          const isLightboxOpen = lightbox?.roomId === room.id;
          const amenities = amenitiesOf(room);

          return (
            <Card
              key={room.id}
              id={`room-${room.id}`}
              className={cn(
                'gap-0 overflow-hidden rounded-md py-0 transition-all duration-300',
                isCheapest && 'border-primary border-2'
              )}
            >
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                  {/* Room Image */}
                  <div
                    className="relative h-48 md:h-full min-h-40 rounded-md overflow-hidden cursor-pointer group"
                    onClick={() => hasMedia && setLightbox({ roomId: room.id, index: 0 })}
                  >
                    {primaryImage ? (
                      <>
                        <Image
                          src={primaryImage.image_url}
                          alt={primaryImage.alt_text || room.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
                          <div className="bg-white/90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <ZoomIn className="w-5 h-5 text-foreground" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-border flex items-center justify-center">
                        <Bed className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                      {roomImages.length > 1 && (
                        <div className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md">
                          1 / {roomImages.length}
                        </div>
                      )}
                      {roomPanoramas.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightbox({ roomId: room.id, index: roomImages.length });
                          }}
                          aria-label={`${room.name}: 360° view`}
                          className="flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-black/75"
                        >
                          <Rotate3d className="w-3.5 h-3.5" />
                          360°
                        </button>
                      )}
                    </div>
                    {/* "Best Value": a gold ribbon tight across the photo's top-left corner (the photo clips its
                        ends). Its centre sits on the corner's diagonal (34px in, 34px down: 144px wide, 24px
                        tall), so the words are centred on the visible part with room at both ends */}
                    {isCheapest && (
                      <span
                        className="pointer-events-none absolute -left-[38px] top-[22px] z-10 flex h-6 w-36 -rotate-45 items-center justify-center
                                   bg-gold bg-linear-to-b from-white/25 to-transparent text-[10px] font-extrabold uppercase leading-none
                                   tracking-wider text-primary shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
                      >
                        Best Value
                      </span>
                    )}
                    {/* Rooms left: top-right corner */}
                    {room.num_available_rooms <= 3 && (
                      <span className="pointer-events-none absolute right-2 top-2 z-10 rounded-md bg-destructive px-2 py-1 text-[11px] font-bold leading-none text-white shadow-sm">
                        Only {room.num_available_rooms} left!
                      </span>
                    )}
                  </div>

                  {/* Room Details */}
                  <div className="@container md:col-span-2 min-w-0 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-bold text-foreground mb-1">{room.name}</h3>
                        <label
                          title={compareFull ? `You can compare up to ${MAX_COMPARE} rooms` : undefined}
                          className={cn(
                            'mt-1 flex shrink-0 select-none items-center gap-2 text-sm text-muted-foreground',
                            compareFull ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-foreground'
                          )}
                        >
                          <Checkbox
                            checked={isSelectedForCompare}
                            onCheckedChange={() => toggleCompare(room.id)}
                            disabled={compareFull}
                          />
                          Compare
                        </label>
                      </div>
                      {room.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
                      )}
                    </div>

                    {/* Room facts, then its first amenities: icon + text in rows, no chips (by request) */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-foreground/80">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 shrink-0 text-primary" />
                        Up to {room.max_occupancy} guests ({guestMix(room)})
                      </span>
                      {room.bed_configuration && (
                        <span className="inline-flex items-center gap-1.5">
                          <Bed className="h-4 w-4 shrink-0 text-primary" />
                          {room.bed_configuration}
                        </span>
                      )}
                      {room.size_sqm && (
                        <span className="inline-flex items-center gap-1.5">
                          <Maximize2 className="h-4 w-4 shrink-0 text-primary" />
                          {room.size_sqm} m²
                        </span>
                      )}
                    </div>

                    {amenities.length > 0 && (
                      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
                        {amenities.slice(0, 4).map((amenity: any) => {
                          const name = amenity.amenity?.name || 'Amenity';
                          const Icon = getAmenityIcon(name);
                          return (
                            <li key={amenity.id} className="inline-flex items-center gap-1.5">
                              <Icon className="h-[18px] w-[18px] shrink-0 text-primary" />
                              {name}
                            </li>
                          );
                        })}
                        {amenities.length > 4 && (
                          <li>
                            <button
                              type="button"
                              onClick={() => toggleExpand(room.id)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {isExpanded ? 'Show less' : `+${amenities.length - 4} more`}
                            </button>
                          </li>
                        )}
                      </ul>
                    )}

                    {/* Price for this party, and Select: buttons at the right, beside the price when the
                        details column is wide enough (container query), else under it */}
                    <div className="flex flex-col gap-3 border-t pt-3 @md:flex-row @md:items-end @md:justify-between">
                      <div className="min-w-0">{priceBlock(room)}</div>

                      <div className="flex shrink-0 items-center justify-end gap-2 self-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(room.id)}
                          className="gap-1 rounded-md"
                        >
                          {isExpanded ? (
                            <>Less <ChevronUp className="w-4 h-4" /></>
                          ) : (
                            <>More details <ChevronDown className="w-4 h-4" /></>
                          )}
                        </Button>
                        {selectControl(room)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="space-y-5 border-t bg-background px-4 pb-5 pt-4">
                    {amenities.length > 0 && (
                      <div>
                        <h4 className="mb-3 font-heading text-sm font-bold text-foreground">
                          All amenities <span className="font-sans font-normal text-muted-foreground">({amenities.length})</span>
                        </h4>
                        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                          {amenities.map((amenity: any) => {
                            const name = amenity.amenity?.name || 'Amenity';
                            const Icon = getAmenityIcon(name);
                            return (
                              <li key={amenity.id} className="flex min-w-0 items-center gap-2.5 text-sm text-foreground/80">
                                <Icon className="h-5 w-5 shrink-0 text-primary" />
                                <span className="truncate">{name}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {hasMedia && (
                      <RoomImageGallery
                        images={roomImages}
                        panoramas={roomPanoramas}
                        roomName={room.name}
                        initialIndex={isLightboxOpen ? lightbox!.index : -1}
                        onClose={() => setLightbox(null)}
                        showThumbnails={true}
                      />
                    )}
                  </div>
                )}

                {hasMedia && !isExpanded && isLightboxOpen && (
                  <RoomImageGallery
                    images={roomImages}
                    panoramas={roomPanoramas}
                    roomName={room.name}
                    initialIndex={lightbox!.index}
                    onClose={() => setLightbox(null)}
                    showThumbnails={false}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Comparison: the picked rooms side by side (the label column stays put when phones scroll sideways) */}
      <Dialog open={showCompareDialog && selectedRooms.length > 1} onOpenChange={setShowCompareDialog}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-md p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-5 py-4 text-left">
            <DialogTitle className="text-xl">Compare rooms</DialogTitle>
            <DialogDescription>
              {selectedRooms.length} rooms side by side · prices for {partyLabel(party)}, incl. taxes &amp; fees
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto">
            {/* Fixed layout: every room column gets the same width, whatever its text */}
            <table
              className="w-full table-fixed border-collapse text-sm"
              style={{ minWidth: `${7 + selectedRooms.length * 12}rem` }}
            >
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-10 w-28 border-r border-border bg-card p-3 sm:w-36" />
                  {selectedRooms.map((room) => {
                    const photo = room.room_type_images?.[0];
                    const hasMedia = (room.room_type_images?.length ?? 0) + (room.room_type_panoramas?.length ?? 0) > 0;
                    return (
                      <th key={room.id} className="p-3 text-left align-top font-normal">
                        <button
                          type="button"
                          disabled={!hasMedia}
                          onClick={() => setLightbox({ roomId: room.id, index: 0 })}
                          aria-label={`${room.name} photos`}
                          className="relative block h-28 w-full overflow-hidden rounded-md bg-border disabled:cursor-default"
                        >
                          {photo ? (
                            <Image src={photo.image_url} alt="" fill sizes="280px" className="object-cover" />
                          ) : (
                            <Bed className="absolute inset-0 m-auto w-10 h-10 text-muted-foreground" />
                          )}
                        </button>
                        <div className="mt-2 flex items-start justify-between gap-2">
                          <span className="font-heading text-base font-bold leading-snug text-foreground">{room.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleCompare(room.id)}
                            className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                          >
                            Remove
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.label} className="border-b border-border">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r border-border bg-card p-3 text-left align-top font-medium text-muted-foreground"
                    >
                      {row.label}
                    </th>
                    {selectedRooms.map((room) => (
                      <td key={room.id} className="p-3 align-top text-foreground">
                        {row.render(room)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-border bg-card p-3 text-left align-top font-medium text-muted-foreground"
                  >
                    Book
                  </th>
                  {selectedRooms.map((room) => (
                    <td key={room.id} className="p-3 align-top">
                      {selectControl(room, true)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
