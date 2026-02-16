-- Migration: decimal_precision_standardization
-- Standardizes all Decimal columns to explicit Postgres precision.
-- Safe: ALTER COLUMN TYPE only. No drops, no renames. Existing data preserved.

-- ============================================================
-- Money fields → numeric(12,2)
-- ============================================================

-- srs
ALTER TABLE "srs" ALTER COLUMN "targetPrice" TYPE numeric(12,2);
ALTER TABLE "srs" ALTER COLUMN "quotedPrice" TYPE numeric(12,2);

-- costing_sheets
ALTER TABLE "costing_sheets" ALTER COLUMN "fabricCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "trimCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "cmtCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "washingCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "embellishmentCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "packagingCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "freightCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "inspectionCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "dutyCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "otherCost" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "totalCostPerUnit" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "agentCommAmount" TYPE numeric(12,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "sellingPrice" TYPE numeric(12,2);

-- purchase_orders
ALTER TABLE "purchase_orders" ALTER COLUMN "totalAmount" TYPE numeric(12,2);

-- po_line_items
ALTER TABLE "po_line_items" ALTER COLUMN "unitPrice" TYPE numeric(12,2);
ALTER TABLE "po_line_items" ALTER COLUMN "lineTotal" TYPE numeric(12,2);

-- material_suppliers
ALTER TABLE "material_suppliers" ALTER COLUMN "unitPrice" TYPE numeric(12,2);

-- supplier_pos
ALTER TABLE "supplier_pos" ALTER COLUMN "totalAmount" TYPE numeric(12,2);

-- supplier_po_lines
ALTER TABLE "supplier_po_lines" ALTER COLUMN "unitPrice" TYPE numeric(12,2);
ALTER TABLE "supplier_po_lines" ALTER COLUMN "lineTotal" TYPE numeric(12,2);

-- production_orders
ALTER TABLE "production_orders" ALTER COLUMN "cmtRate" TYPE numeric(12,2);

-- shipments
ALTER TABLE "shipments" ALTER COLUMN "freightCost" TYPE numeric(12,2);

-- customer_invoices
ALTER TABLE "customer_invoices" ALTER COLUMN "subtotal" TYPE numeric(12,2);
ALTER TABLE "customer_invoices" ALTER COLUMN "adjustments" TYPE numeric(12,2);
ALTER TABLE "customer_invoices" ALTER COLUMN "totalAmount" TYPE numeric(12,2);
ALTER TABLE "customer_invoices" ALTER COLUMN "amountPaid" TYPE numeric(12,2);
ALTER TABLE "customer_invoices" ALTER COLUMN "amountDue" TYPE numeric(12,2);

-- invoice_line_items
ALTER TABLE "invoice_line_items" ALTER COLUMN "unitPrice" TYPE numeric(12,2);
ALTER TABLE "invoice_line_items" ALTER COLUMN "lineTotal" TYPE numeric(12,2);

-- payments_received
ALTER TABLE "payments_received" ALTER COLUMN "amount" TYPE numeric(12,2);
ALTER TABLE "payments_received" ALTER COLUMN "amountInBase" TYPE numeric(12,2);

-- order_costs
ALTER TABLE "order_costs" ALTER COLUMN "unitCost" TYPE numeric(12,2);
ALTER TABLE "order_costs" ALTER COLUMN "totalCost" TYPE numeric(12,2);
ALTER TABLE "order_costs" ALTER COLUMN "totalCostBase" TYPE numeric(12,2);

-- ============================================================
-- Percentage fields → numeric(5,2)
-- ============================================================

ALTER TABLE "bom_items" ALTER COLUMN "wastagePercent" TYPE numeric(5,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "agentCommPercent" TYPE numeric(5,2);
ALTER TABLE "costing_sheets" ALTER COLUMN "targetMarginPercent" TYPE numeric(5,2);

-- ============================================================
-- Quantity fields → numeric(12,4)
-- ============================================================

ALTER TABLE "bom_items" ALTER COLUMN "consumptionQty" TYPE numeric(12,4);
ALTER TABLE "supplier_po_lines" ALTER COLUMN "quantity" TYPE numeric(12,4);
ALTER TABLE "goods_received_items" ALTER COLUMN "orderedQty" TYPE numeric(12,4);
ALTER TABLE "goods_received_items" ALTER COLUMN "receivedQty" TYPE numeric(12,4);
ALTER TABLE "inventory_items" ALTER COLUMN "quantity" TYPE numeric(12,4);
ALTER TABLE "stock_movements" ALTER COLUMN "quantity" TYPE numeric(12,4);
ALTER TABLE "material_issues" ALTER COLUMN "quantity" TYPE numeric(12,4);
ALTER TABLE "material_suppliers" ALTER COLUMN "moq" TYPE numeric(12,4);
ALTER TABLE "materials" ALTER COLUMN "moq" TYPE numeric(12,4);
ALTER TABLE "order_costs" ALTER COLUMN "quantity" TYPE numeric(12,4);

-- ============================================================
-- Weight fields → numeric(10,2)
-- ============================================================

ALTER TABLE "packing_lists" ALTER COLUMN "totalGrossWeight" TYPE numeric(10,2);
ALTER TABLE "packing_lists" ALTER COLUMN "totalNetWeight" TYPE numeric(10,2);
ALTER TABLE "cartons" ALTER COLUMN "netWeight" TYPE numeric(10,2);
ALTER TABLE "cartons" ALTER COLUMN "grossWeight" TYPE numeric(10,2);

-- ============================================================
-- Dimension fields → numeric(8,2)
-- ============================================================

ALTER TABLE "packing_lists" ALTER COLUMN "totalCBM" TYPE numeric(8,2);
ALTER TABLE "cartons" ALTER COLUMN "length" TYPE numeric(8,2);
ALTER TABLE "cartons" ALTER COLUMN "width" TYPE numeric(8,2);
ALTER TABLE "cartons" ALTER COLUMN "height" TYPE numeric(8,2);
ALTER TABLE "cartons" ALTER COLUMN "cbm" TYPE numeric(8,2);

-- ============================================================
-- Exchange rate fields → numeric(10,6)
-- ============================================================

ALTER TABLE "payments_received" ALTER COLUMN "exchangeRate" TYPE numeric(10,6);
ALTER TABLE "order_costs" ALTER COLUMN "exchangeRate" TYPE numeric(10,6);

-- ============================================================
-- Rating → numeric(3,1)
-- ============================================================

ALTER TABLE "suppliers" ALTER COLUMN "rating" TYPE numeric(3,1);
