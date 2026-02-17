-- Add PO-line-scoped approvals + slot buckets (self/contrast, trim1/trim2)

-- 1) Enum for slot
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalSlot') THEN
    CREATE TYPE "ApprovalSlot" AS ENUM ('SELF','CONTRAST','TRIM_1','TRIM_2');
  END IF;
END $$;

-- 2) Columns
ALTER TABLE "approval_records"
  ADD COLUMN IF NOT EXISTS "poLineItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "slot" "ApprovalSlot";

-- 3) FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'approval_records_poLineItemId_fkey'
  ) THEN
    ALTER TABLE "approval_records"
      ADD CONSTRAINT "approval_records_poLineItemId_fkey"
      FOREIGN KEY ("poLineItemId") REFERENCES "po_line_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Index to speed up Production WIP lookups
CREATE INDEX IF NOT EXISTS "approval_records_poLineItemId_type_slot_materialId_idx"
  ON "approval_records"("poLineItemId", "type", "slot", "materialId");
