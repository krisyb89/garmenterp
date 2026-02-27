-- AlterTable
ALTER TABLE "customer_invoices" ALTER COLUMN "adjustments" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "packing_lists" ALTER COLUMN "totalCBM" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "payments_received" ALTER COLUMN "amountInBase" SET DATA TYPE DECIMAL(65,30);
