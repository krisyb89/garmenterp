-- Add unique constraint to prevent duplicate submission numbers for same approval cell
-- This protects against race conditions when multiple users submit approvals simultaneously

CREATE UNIQUE INDEX IF NOT EXISTS "unique_po_line_approval_submission"
  ON "approval_records"("poLineItemId", "type", "slot", "materialId", "submissionNo")
  WHERE "poLineItemId" IS NOT NULL;
