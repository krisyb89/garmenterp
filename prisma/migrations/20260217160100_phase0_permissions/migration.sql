-- Phase 0: MVP Permissions
-- Add tracking fields to PurchaseOrder and enhance ActivityLog

-- 1) Add creator and last modifier tracking to PurchaseOrder
ALTER TABLE "purchase_orders"
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastModifiedByUserId" TEXT;

-- 2) Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "purchase_orders"
      ADD CONSTRAINT "purchase_orders_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_lastModifiedByUserId_fkey'
  ) THEN
    ALTER TABLE "purchase_orders"
      ADD CONSTRAINT "purchase_orders_lastModifiedByUserId_fkey"
      FOREIGN KEY ("lastModifiedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Enhance ActivityLog with before/after data and request context
ALTER TABLE "activity_logs"
  ADD COLUMN IF NOT EXISTS "beforeData" JSONB,
  ADD COLUMN IF NOT EXISTS "afterData" JSONB,
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

-- 4) Add indexes for audit queries
CREATE INDEX IF NOT EXISTS "activity_logs_entityId_entity_idx"
  ON "activity_logs"("entityId", "entity");

CREATE INDEX IF NOT EXISTS "activity_logs_userId_createdAt_idx"
  ON "activity_logs"("userId", "createdAt");

-- 5) Create initial admin user if none exists (for bootstrapping)
-- Password: "admin123" (CHANGE IMMEDIATELY)
-- bcrypt hash of "admin123"
INSERT INTO "users" ("id", "email", "passwordHash", "name", "role", "isActive", "createdAt", "updatedAt")
VALUES (
  'bootstrap-admin-001',
  'admin@garment-erp.local',
  '$2b$10$rBV2KXx7P6/WO9.HzV8Zj.9nNm8kZJyK5zBr4QZvJzxqT0F1yW0gK',
  'System Admin',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO NOTHING;
