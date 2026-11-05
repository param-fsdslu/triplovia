'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ZoomIn } from '@/components/icons';
import { PhotoLightbox, type LightboxPhoto } from '@/components/media/PhotoLightbox';

interface RoomImage {
  id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
}

interface RoomPanorama {
  id: string;
  image_url: string;
  title: string | null;
  display_order: number;
}

interface RoomImageGalleryProps {
  images: RoomImage[];
  /** The room's 360° photos: after the photos, played in the 360° viewer */
  panoramas?: RoomPanorama[];
  roomName: string;
  /** Index to open the lightbox at. Controlled externally so the room card
   *  primary image click can open at index 0 while the thumbnail strip
   *  opens at the clicked index (360° photos count after the photos).
   *  Pass -1 (default) to keep closed. */
  initialIndex?: number;
  /** Called when the lightbox closes, so the parent can reset the index. */
  onClose?: () => void;
  /** Whether to show the thumbnail strip inline (expanded panel). */
  showThumbnails?: boolean;
}

export function RoomImageGallery({
  images,
  panoramas = [],
  roomName,
  initialIndex = -1,
  onClose,
  showThumbnails = true,
}: RoomImageGalleryProps) {
  const sorted = [...images].sort((a, b) => a.display_order - b.display_order);
  const sortedPanoramas = [...panoramas].sort((a, b) => a.display_order - b.display_order);
  const items: LightboxPhoto[] = [
    ...sorted.map((img, i) => ({
      id: img.id,
      src: img.image_url,
      alt: img.alt_text || `${roomName} - photo ${i + 1}`,
      caption: img.alt_text,
    })),
    ...sortedPanoramas.map((pano) => ({
      id: pano.id,
      src: pano.image_url,
      alt: `${roomName} - 360° view${pano.title ? `: ${pano.title}` : ''}`,
      caption: pano.title ? `360° · ${pano.title}` : '360° view',
      panorama: true,
    })),
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Open when parent signals an initialIndex
  useEffect(() => {
    if (initialIndex >= 0) {
      setActiveIndex(initialIndex);
      setIsOpen(true);
    }
  }, [initialIndex]);

  const close = () => {
    setIsOpen(false);
    onClose?.();
  };

  const openAt = (index: number) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  if (items.length === 0) return null;

  return (
    <>
      {/* Inline thumbnail strip */}
      {showThumbnails && (
        <div>
          {/* Same heading style as "All amenities" above it */}
          <h4 className="mb-3 font-heading text-sm font-bold text-foreground">
            Room photos <span className="font-sans font-normal text-muted-foreground">({items.length})</span>
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {items.slice(0, 7).map((item, idx) => (
              <div
                key={item.id}
                className="relative h-24 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => openAt(idx)}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                {item.panorama && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35 font-heading text-sm font-extrabold text-white">
                    360°
                  </span>
                )}
                {/* "More" overlay on the last visible thumbnail */}
                {idx === 6 && items.length > 7 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">+{items.length - 7} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full-screen viewer */}
      <PhotoLightbox
        photos={items}
        open={isOpen}
        onOpenChange={(open) => { if (!open) close(); }}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        title={roomName}
      />
    </>
  );
}
