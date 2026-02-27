-- Add SAMPLE_SENT value to SRSStatus enum
-- PostgreSQL requires ALTER TYPE to add enum values

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'SRSStatus' AND e.enumlabel = 'SAMPLE_SENT'
  ) THEN
    ALTER TYPE "SRSStatus" ADD VALUE 'SAMPLE_SENT' AFTER 'DEVELOPMENT_STARTED';
  END IF;
END$$;
