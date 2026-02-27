-- Fix column name: rename snake_case "shipping_orders" to camelCase "shippingOrders"
-- (Prisma uses camelCase column names in this project, previous migration used wrong case)
DO $$
BEGIN
  -- If the wrong snake_case column exists, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'po_line_items' AND column_name = 'shipping_orders'
  ) THEN
    ALTER TABLE "po_line_items" RENAME COLUMN "shipping_orders" TO "shippingOrders";
  END IF;

  -- If neither column exists yet, add the correct one
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'po_line_items' AND column_name = 'shippingOrders'
  ) THEN
    ALTER TABLE "po_line_items" ADD COLUMN "shippingOrders" JSONB;
  END IF;
END $$;
