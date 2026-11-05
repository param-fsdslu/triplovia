-- Add maps_embed_url column to hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS maps_embed_url TEXT;
