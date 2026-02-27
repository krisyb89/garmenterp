-- AlterTable: add VAT fields and material relation to supplier_po_lines
ALTER TABLE "supplier_po_lines" ADD COLUMN IF NOT EXISTS "vat_rate" DECIMAL(65,30);
ALTER TABLE "supplier_po_lines" ADD COLUMN IF NOT EXISTS "vat_refundable" BOOLEAN NOT NULL DEFAULT false;
