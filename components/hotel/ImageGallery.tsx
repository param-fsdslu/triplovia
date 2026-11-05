'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Grid3x3, Rotate3d } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { PhotoLightbox } from '@/components/media/PhotoLightbox';
import { cn } from '@/lib/utils';
import type { PanoramaView } from '@/lib/utils/panorama';

interface HotelImage {
  id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

interface ImageGalleryProps {
  images: HotelImage[];
  hotelName: string;
  /** The hotel's 360° photos (hotelPanoramaViews): after the photos in the viewer, with their own button */
  panoramas?: PanoramaView[];
  /** Extra classes for the photo grid (e.g. to stretch it beside the availability card) */
  className?: string;
}

export function ImageGallery({ images, hotelName, panoramas = [], className }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  const mainImage = sortedImages[0];
  const sideImages = sortedImages.slice(1, 5);

  // Grid by photo count so there are never empty cells: 1 → full width, 2 → halves,
  // 3 → large + two stacked, 4 → large + three (last one wide), 5+ → large + 2×2.
  // Phones show only the large photo (the rest open in the viewer).
  const count = sortedImages.length;
  const gridLayout =
    count <= 1 ? '' : count === 2 ? 'md:grid-cols-2' : count === 3 ? 'md:grid-cols-3 md:grid-rows-2' : 'md:grid-cols-4 md:grid-rows-2';
  const mainSpan = count >= 3 ? 'md:col-span-2 md:row-span-2' : '';

  return (
    <>
      {/* Gallery Grid */}
      <div
        className={cn(
          'relative grid grid-cols-1 gap-2 h-[260px] sm:h-[340px] md:h-[400px] lg:h-[450px] rounded-xl overflow-hidden',
          gridLayout,
          className
        )}
      >
        {/* Main image */}
        <div
          className={`relative cursor-pointer group overflow-hidden ${mainSpan}`}
          onClick={() => {
            setSelectedIndex(0);
            setIsGalleryOpen(true);
          }}
        >
          {mainImage ? (
            <>
              <Image
                src={mainImage.image_url}
                alt={mainImage.alt_text || hotelName}
                fill
                sizes={count === 1 ? '100vw' : '(min-width: 768px) 60vw, 100vw'}
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full bg-border flex items-center justify-center">
              <span className="text-muted-foreground">No image available</span>
            </div>
          )}
        </div>

        {/* Side images */}
        {sideImages.map((image, index) => (
          <div
            key={image.id}
            className={`relative hidden md:block cursor-pointer group overflow-hidden ${
              count === 4 && index === 2 ? 'md:col-span-2' : ''
            }`}
            onClick={() => {
              setSelectedIndex(index + 1);
              setIsGalleryOpen(true);
            }}
          >
            <Image
              src={image.image_url}
              alt={image.alt_text || `${hotelName} - Image ${index + 2}`}
              fill
              sizes="(min-width: 768px) 30vw, 1px"
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Overlay on last image with photo count */}
            {index === sideImages.length - 1 && sortedImages.length > 5 && (
              <div
                className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(0);
                  setIsGalleryOpen(true);
                }}
              >
                <div className="text-center text-white">
                  <Grid3x3 className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">+{sortedImages.length - 5} more</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Bottom left: all photos, and the 360° views (after the photos in the viewer) */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
          {sortedImages.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-white text-foreground hover:bg-white/90 shadow-lg"
              onClick={() => {
                setSelectedIndex(0);
                setIsGalleryOpen(true);
              }}
            >
              <Grid3x3 className="w-4 h-4" />
              View all {sortedImages.length} {sortedImages.length === 1 ? 'photo' : 'photos'}
            </Button>
          )}
          {panoramas.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-white text-foreground hover:bg-white/90 shadow-lg"
              onClick={() => {
                setSelectedIndex(sortedImages.length);
                setIsGalleryOpen(true);
              }}
            >
              <Rotate3d className="w-4 h-4" />
              360° View
            </Button>
          )}
        </div>
      </div>

      {/* Full-screen viewer */}
      <PhotoLightbox
        photos={[
          ...sortedImages.map((image, i) => ({
            id: image.id,
            src: image.image_url,
            alt: image.alt_text || `${hotelName} - photo ${i + 1}`,
            caption: image.alt_text,
          })),
          ...panoramas.map((view) => ({
            id: view.id,
            src: view.image_url,
            alt: `${hotelName} - 360° view: ${view.label}`,
            caption: `360° · ${view.label}`,
            panorama: true,
          })),
        ]}
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        index={selectedIndex}
        onIndexChange={setSelectedIndex}
        title={hotelName}
      />
    </>
  );
}
