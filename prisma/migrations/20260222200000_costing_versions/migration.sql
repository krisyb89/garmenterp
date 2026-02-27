-- Drop the unique constraint so one SRS can have multiple costing sheet versions
ALTER TABLE "costing_sheets" DROP CONSTRAINT IF EXISTS "costing_sheets_srsId_key";

-- Add optional version label column
ALTER TABLE "costing_sheets" ADD COLUMN IF NOT EXISTS "versionLabel" TEXT;
