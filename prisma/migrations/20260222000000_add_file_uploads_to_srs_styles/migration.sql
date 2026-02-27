-- Add imageUrls and attachments to styles table
ALTER TABLE "styles"
  ADD COLUMN IF NOT EXISTS "imageUrls" JSONB,
  ADD COLUMN IF NOT EXISTS "attachments" JSONB;

-- Add imageUrls and attachments to srs table
ALTER TABLE "srs"
  ADD COLUMN IF NOT EXISTS "imageUrls" JSONB,
  ADD COLUMN IF NOT EXISTS "attachments" JSONB;
