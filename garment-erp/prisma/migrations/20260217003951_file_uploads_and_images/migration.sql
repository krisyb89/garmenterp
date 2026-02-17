-- AlterTable
ALTER TABLE "srs" ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "imageUrls" JSONB;

-- AlterTable
ALTER TABLE "styles" ADD COLUMN     "imageUrls" JSONB;
