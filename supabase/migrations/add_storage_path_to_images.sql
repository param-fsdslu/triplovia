-- Add storage_path column to hotel_images table
ALTER TABLE hotel_images
ADD COLUMN IF NOT EXISTS storage_path TEXT;

COMMENT ON COLUMN hotel_images.storage_path IS 'Path to the image file in Supabase Storage (e.g., hotel-id/filename.jpg)';

-- Add storage_path column to room_type_images table
ALTER TABLE room_type_images
ADD COLUMN IF NOT EXISTS storage_path TEXT;

COMMENT ON COLUMN room_type_images.storage_path IS 'Path to the image file in Supabase Storage (e.g., room-type-id/filename.jpg)';
