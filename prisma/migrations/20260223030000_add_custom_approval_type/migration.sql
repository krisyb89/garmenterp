-- Add CUSTOM value to ApprovalType enum for free-text approval items
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'CUSTOM';
