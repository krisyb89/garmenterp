-- Create WIPScope enum if it doesn't exist, then add PRODUCTION value
DO $$
BEGIN
  -- Create the enum type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WIPScope') THEN
    CREATE TYPE "WIPScope" AS ENUM ('SRS', 'PO', 'PRODUCTION');
  ELSE
    -- If it exists but doesn't have PRODUCTION, add it
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'WIPScope' AND e.enumlabel = 'PRODUCTION'
    ) THEN
      ALTER TYPE "WIPScope" ADD VALUE 'PRODUCTION';
    END IF;
  END IF;
END$$;

-- Create wip_columns table if it doesn't exist
CREATE TABLE IF NOT EXISTS "wip_columns" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "scope" "WIPScope" NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'FIELD',
  "groupName" TEXT,
  "approvalType" "ApprovalType",
  "approvalSlot" "ApprovalSlot",
  "sampleStage" "SampleStage",
  "dataType" TEXT NOT NULL DEFAULT 'text',
  "options" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wip_columns_scope_key_key" UNIQUE ("scope", "key")
);

-- Add missing columns if table already exists (idempotent)
DO $$
BEGIN
  ALTER TABLE "wip_columns" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'FIELD';
  ALTER TABLE "wip_columns" ADD COLUMN IF NOT EXISTS "groupName" TEXT;
  ALTER TABLE "wip_columns" ADD COLUMN IF NOT EXISTS "approvalType" "ApprovalType";
  ALTER TABLE "wip_columns" ADD COLUMN IF NOT EXISTS "approvalSlot" "ApprovalSlot";
  ALTER TABLE "wip_columns" ADD COLUMN IF NOT EXISTS "sampleStage" "SampleStage";
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist, it was just created above
    NULL;
END $$;

-- Seed default Production WIP milestone columns (idempotent via unique(scope,key))
INSERT INTO "wip_columns" ("id","scope","key","label","kind","groupName","sampleStage","sortOrder","isActive","createdAt","updatedAt")
VALUES
  (DEFAULT,'PRODUCTION','SAMPLE_FIT','Fits','SAMPLE','Samples','FIT',10,true,now(),now()),
  (DEFAULT,'PRODUCTION','SAMPLE_PP','PP','SAMPLE','Samples','PP',20,true,now(),now()),
  (DEFAULT,'PRODUCTION','SAMPLE_TOP','TOP','SAMPLE','Samples','TOP',30,true,now(),now()),
  (DEFAULT,'PRODUCTION','SAMPLE_SHIPMENT','Shipment','SAMPLE','Samples','SHIPMENT',40,true,now(),now())
ON CONFLICT ("scope","key") DO NOTHING;

INSERT INTO "wip_columns" ("id","scope","key","label","kind","groupName","approvalType","approvalSlot","sortOrder","isActive","createdAt","updatedAt")
VALUES
  (DEFAULT,'PRODUCTION','APP_LAB_DIP','Lab Dip','APPROVAL','Approvals','LAB_DIP',NULL,110,true,now(),now()),
  (DEFAULT,'PRODUCTION','APP_FABRIC_SELF','Self Fabric','APPROVAL','Approvals','FABRIC','SELF',120,true,now(),now()),
  (DEFAULT,'PRODUCTION','APP_FABRIC_CONTRAST','Contrast','APPROVAL','Approvals','FABRIC','CONTRAST',130,true,now(),now()),
  (DEFAULT,'PRODUCTION','APP_TRIM_1','Trim 1','APPROVAL','Approvals','TRIM','TRIM_1',140,true,now(),now()),
  (DEFAULT,'PRODUCTION','APP_TRIM_2','Trim 2','APPROVAL','Approvals','TRIM','TRIM_2',150,true,now(),now()),
  (DEFAULT,'PRODUCTION','APP_PRINT_STRIKEOFF','S/O Print','APPROVAL','Approvals','PRINT_STRIKEOFF',NULL,160,true,now(),now()),
  (DEFAULT,'PRODUCTION','APP_EMB_STRIKEOFF','S/O Emb','APPROVAL','Approvals','EMBROIDERY_STRIKEOFF',NULL,170,true,now(),now()),
  (DEFAULT,'PRODUCTION','APP_WASH','Wash','APPROVAL','Approvals','WASH',NULL,180,true,now(),now())
ON CONFLICT ("scope","key") DO NOTHING;
