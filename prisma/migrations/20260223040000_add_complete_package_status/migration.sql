-- Add COMPLETE value to PackageStatus enum
-- COMPLETE means all approval items in the package have received a comment/outcome
ALTER TYPE "PackageStatus" ADD VALUE IF NOT EXISTS 'COMPLETE';
