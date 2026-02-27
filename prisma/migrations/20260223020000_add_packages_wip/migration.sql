-- ============================================================
-- Migration: add_packages_wip
-- Adds Package, PackageItem, WIPCell, WIPComment models
-- and extends ApprovalType enum with sample stages
-- ============================================================

-- 1. Extend ApprovalType enum with sample stage values
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'PROTO';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'FIT';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'PP';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'TOP';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'GPT';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'SHIPMENT_SAMPLE';

-- 2. New enums
CREATE TYPE "PackageStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED');
CREATE TYPE "PackageSection" AS ENUM ('APPROVAL', 'SRS', 'MISC');
CREATE TYPE "WIPSegment" AS ENUM ('SAMPLES', 'FABRICS', 'COLOR_PRINTS', 'TRIMS');

-- 3. packages table
CREATE TABLE "packages" (
    "id"          TEXT NOT NULL,
    "customerId"  TEXT NOT NULL,
    "courier"     TEXT,
    "trackingNo"  TEXT,
    "dateSent"    TIMESTAMP(3),
    "inHandDate"  TIMESTAMP(3),
    "status"      "PackageStatus" NOT NULL DEFAULT 'DRAFT',
    "notes"       TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "packages" ADD CONSTRAINT "packages_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packages" ADD CONSTRAINT "packages_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. package_items table
CREATE TABLE "package_items" (
    "id"             TEXT NOT NULL,
    "packageId"      TEXT NOT NULL,
    "section"        "PackageSection" NOT NULL,
    "approvalType"   "ApprovalType",
    "srsId"          TEXT,
    "colorPrint"     TEXT,
    "description"    TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments"       TEXT,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "package_items" ADD CONSTRAINT "package_items_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_srsId_fkey"
    FOREIGN KEY ("srsId") REFERENCES "srs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. wip_cells table
CREATE TABLE "wip_cells" (
    "id"           TEXT NOT NULL,
    "poLineItemId" TEXT NOT NULL,
    "segment"      "WIPSegment" NOT NULL,
    "approvalType" "ApprovalType" NOT NULL,
    "label"        TEXT NOT NULL,
    "status"       "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wip_cells_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wip_cells_poLineItemId_approvalType_label_key"
        UNIQUE ("poLineItemId", "approvalType", "label")
);

ALTER TABLE "wip_cells" ADD CONSTRAINT "wip_cells_poLineItemId_fkey"
    FOREIGN KEY ("poLineItemId") REFERENCES "po_line_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. package_item_wip_cells junction table
CREATE TABLE "package_item_wip_cells" (
    "id"            TEXT NOT NULL,
    "packageItemId" TEXT NOT NULL,
    "wipCellId"     TEXT NOT NULL,

    CONSTRAINT "package_item_wip_cells_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "package_item_wip_cells_packageItemId_wipCellId_key"
        UNIQUE ("packageItemId", "wipCellId")
);

ALTER TABLE "package_item_wip_cells" ADD CONSTRAINT "package_item_wip_cells_packageItemId_fkey"
    FOREIGN KEY ("packageItemId") REFERENCES "package_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "package_item_wip_cells" ADD CONSTRAINT "package_item_wip_cells_wipCellId_fkey"
    FOREIGN KEY ("wipCellId") REFERENCES "wip_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. wip_comments table (append-only)
CREATE TABLE "wip_comments" (
    "id"             TEXT NOT NULL,
    "wipCellId"      TEXT NOT NULL,
    "packageItemId"  TEXT,
    "approvalStatus" "ApprovalStatus",
    "text"           TEXT NOT NULL,
    "createdById"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wip_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wip_comments" ADD CONSTRAINT "wip_comments_wipCellId_fkey"
    FOREIGN KEY ("wipCellId") REFERENCES "wip_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
