-- Add shippingOrders JSONB column to po_line_items
-- Each element: { soNo, dc, address?, sizeBreakdown: { [size]: qty } }
-- Note: Prisma uses camelCase column names (not snake_case) in this project
ALTER TABLE "po_line_items" ADD COLUMN IF NOT EXISTS "shippingOrders" JSONB;
