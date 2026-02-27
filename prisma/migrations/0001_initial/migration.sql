-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MERCHANDISER', 'PRODUCTION_MANAGER', 'SOURCING_BUYER', 'QC_MANAGER', 'FINANCE', 'WAREHOUSE', 'SHIPPING', 'MANAGEMENT');
CREATE TYPE "SRSStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'COSTING_IN_PROGRESS', 'QUOTED', 'CUSTOMER_CONFIRMED', 'DEVELOPMENT_STARTED', 'ON_HOLD', 'CANCELLED', 'ORDER_RECEIVED');
CREATE TYPE "POStatus" AS ENUM ('RECEIVED', 'CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'FULLY_SHIPPED', 'INVOICED', 'CLOSED', 'CANCELLED');
CREATE TYPE "SupplierType" AS ENUM ('FABRIC_MILL', 'TRIM_SUPPLIER', 'CMT_FACTORY', 'WASHING_PLANT', 'PRINT_EMBROIDERY', 'PACKAGING', 'OTHER');
CREATE TYPE "MaterialType" AS ENUM ('FABRIC', 'TRIM', 'PACKAGING', 'ACCESSORY', 'LABEL', 'HANGTAG', 'OTHER');
CREATE TYPE "SampleStage" AS ENUM ('PROTO', 'FIT', 'PP', 'TOP', 'SHIPMENT', 'GPT', 'AD_HOC');
CREATE TYPE "SampleStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'APPROVED_WITH_COMMENTS');
CREATE TYPE "ApprovalType" AS ENUM ('LAB_DIP', 'FABRIC', 'TRIM', 'PRINT_STRIKEOFF', 'EMBROIDERY_STRIKEOFF', 'WASH', 'FIT');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMIT', 'APPROVED_WITH_COMMENTS');
CREATE TYPE "SupplierPOStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED');
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT');
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'MATERIAL_ISSUED', 'CUTTING', 'SEWING', 'WASHING_FINISHING', 'QC_INSPECTION', 'PACKING', 'READY_TO_SHIP', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
CREATE TYPE "InspectionType" AS ENUM ('INLINE', 'MID_PRODUCTION', 'PRE_SHIPMENT', 'FINAL');
CREATE TYPE "InspectionResult" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS', 'PENDING');
CREATE TYPE "ShipmentStatus" AS ENUM ('BOOKING_MADE', 'CARGO_READY', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'CUSTOMS_CLEARED', 'DELIVERED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_PAID', 'FULLY_PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "CostCategory" AS ENUM ('FABRIC', 'TRIM', 'CMT', 'WASHING', 'EMBELLISHMENT', 'PACKAGING', 'FREIGHT', 'INSPECTION', 'DUTY', 'AGENT_COMMISSION', 'CLAIM', 'FX_LOSS', 'OTHER');

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MERCHANDISER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable: customers
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentTermDays" INTEGER NOT NULL DEFAULT 60,
    "paymentTermBasis" TEXT NOT NULL DEFAULT 'ROG',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateTable: styles
CREATE TABLE "styles" (
    "id" TEXT NOT NULL,
    "styleNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerRef" TEXT,
    "description" TEXT,
    "category" TEXT,
    "season" TEXT,
    "year" TEXT,
    "collection" TEXT,
    "techPackUrl" TEXT,
    "imageUrl" TEXT,
    "construction" TEXT,
    "fitType" TEXT,
    "washInstructions" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "styles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "styles_styleNo_key" ON "styles"("styleNo");

-- CreateTable: bom_items
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "description" TEXT,
    "placement" TEXT,
    "consumptionQty" DECIMAL(65,30) NOT NULL,
    "consumptionUnit" TEXT NOT NULL,
    "wastagePercent" DECIMAL(65,30) NOT NULL DEFAULT 3,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: srs
CREATE TABLE "srs" (
    "id" TEXT NOT NULL,
    "srsNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "styleId" TEXT,
    "createdById" TEXT NOT NULL,
    "description" TEXT,
    "techPackUrl" TEXT,
    "targetPrice" DECIMAL(65,30),
    "targetPriceCurrency" TEXT NOT NULL DEFAULT 'USD',
    "estimatedQtyMin" INTEGER,
    "estimatedQtyMax" INTEGER,
    "deliveryWindow" TEXT,
    "targetMarkets" TEXT,
    "fabricSpecs" TEXT,
    "trimSpecs" TEXT,
    "status" "SRSStatus" NOT NULL DEFAULT 'RECEIVED',
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "quotedPrice" DECIMAL(65,30),
    "quotedDate" TIMESTAMP(3),
    "confirmedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "srs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "srs_srsNo_key" ON "srs"("srsNo");
CREATE UNIQUE INDEX "srs_styleId_key" ON "srs"("styleId");

-- CreateTable: costing_sheets
CREATE TABLE "costing_sheets" (
    "id" TEXT NOT NULL,
    "srsId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "fabricCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "fabricDetails" JSONB,
    "trimCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "trimDetails" JSONB,
    "cmtCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "washingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "embellishmentCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "packagingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "freightCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "inspectionCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dutyCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherCostDetails" TEXT,
    "totalCostPerUnit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "agentCommPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "agentCommAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "targetMarginPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pricingBasis" TEXT NOT NULL DEFAULT 'FOB',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "costing_sheets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "costing_sheets_srsId_key" ON "costing_sheets"("srsId");

-- CreateTable: purchase_orders
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "poNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 0,
    "shipByDate" TIMESTAMP(3),
    "cancelDate" TIMESTAMP(3),
    "shippingTerms" TEXT NOT NULL DEFAULT 'FOB',
    "portOfLoading" TEXT,
    "portOfDischarge" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "POStatus" NOT NULL DEFAULT 'RECEIVED',
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "specialInstructions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_orders_poNo_key" ON "purchase_orders"("poNo");

-- CreateTable: po_line_items
CREATE TABLE "po_line_items" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "colorCode" TEXT,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "sizeBreakdown" JSONB NOT NULL,
    "totalQty" INTEGER NOT NULL,
    "lineTotal" DECIMAL(65,30) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "po_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: suppliers
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER,
    "bankDetails" TEXT,
    "complianceStatus" TEXT,
    "auditExpiry" TIMESTAMP(3),
    "rating" DECIMAL(65,30),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateTable: materials
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "description" TEXT,
    "composition" TEXT,
    "weight" TEXT,
    "width" TEXT,
    "colorOptions" TEXT,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'YDS',
    "moq" DECIMAL(65,30),
    "leadTimeDays" INTEGER,
    "imageUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "materials_code_key" ON "materials"("code");

-- CreateTable: material_suppliers
CREATE TABLE "material_suppliers" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "moq" DECIMAL(65,30),
    "leadTimeDays" INTEGER,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "material_suppliers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "material_suppliers_materialId_supplierId_key" ON "material_suppliers"("materialId", "supplierId");

-- CreateTable: samples
CREATE TABLE "samples" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "stage" "SampleStage" NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "size" TEXT,
    "fabricUsed" TEXT,
    "trimUsed" TEXT,
    "dateSent" TIMESTAMP(3),
    "dateReceived" TIMESTAMP(3),
    "courierName" TEXT,
    "trackingNo" TEXT,
    "customerComments" TEXT,
    "internalNotes" TEXT,
    "status" "SampleStatus" NOT NULL DEFAULT 'PENDING',
    "imageUrls" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable: approval_records
CREATE TABLE "approval_records" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "materialId" TEXT,
    "type" "ApprovalType" NOT NULL,
    "reference" TEXT,
    "supplierName" TEXT,
    "submissionNo" INTEGER NOT NULL DEFAULT 1,
    "submitDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "customerComments" TEXT,
    "imageUrls" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "approval_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: supplier_pos
CREATE TABLE "supplier_pos" (
    "id" TEXT NOT NULL,
    "spoNo" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "customerPOId" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentTerms" TEXT,
    "status" "SupplierPOStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supplier_pos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "supplier_pos_spoNo_key" ON "supplier_pos"("spoNo");

-- CreateTable: supplier_po_lines
CREATE TABLE "supplier_po_lines" (
    "id" TEXT NOT NULL,
    "supplierPOId" TEXT NOT NULL,
    "materialId" TEXT,
    "description" TEXT NOT NULL,
    "color" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'YDS',
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "lineTotal" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supplier_po_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: goods_received
CREATE TABLE "goods_received" (
    "id" TEXT NOT NULL,
    "supplierPOId" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "goods_received_pkey" PRIMARY KEY ("id")
);

-- CreateTable: goods_received_items
CREATE TABLE "goods_received_items" (
    "id" TEXT NOT NULL,
    "goodsReceivedId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT,
    "orderedQty" DECIMAL(65,30) NOT NULL,
    "receivedQty" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "qcResult" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "goods_received_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inventory_items
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "color" TEXT,
    "lotNo" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stock_movements
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable: factories
CREATE TABLE "factories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierId" TEXT,
    "country" TEXT NOT NULL,
    "address" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isInHouse" BOOLEAN NOT NULL DEFAULT false,
    "capacity" TEXT,
    "specialties" TEXT,
    "complianceStatus" TEXT,
    "cmtRateRange" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "factories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "factories_code_key" ON "factories"("code");

-- CreateTable: production_orders
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "prodOrderNo" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "styleNo" TEXT NOT NULL,
    "color" TEXT,
    "sizeBreakdown" JSONB,
    "totalQty" INTEGER NOT NULL,
    "targetStartDate" TIMESTAMP(3),
    "targetEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "cmtRate" DECIMAL(65,30),
    "cmtCurrency" TEXT NOT NULL DEFAULT 'USD',
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "specialInstructions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "production_orders_prodOrderNo_key" ON "production_orders"("prodOrderNo");

-- CreateTable: production_stages
CREATE TABLE "production_stages" (
    "id" TEXT NOT NULL,
    "prodOrderId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "completedQty" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: material_issues
CREATE TABLE "material_issues" (
    "id" TEXT NOT NULL,
    "prodOrderId" TEXT NOT NULL,
    "materialDesc" TEXT NOT NULL,
    "color" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedTo" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "material_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable: qc_inspections
CREATE TABLE "qc_inspections" (
    "id" TEXT NOT NULL,
    "prodOrderId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectorId" TEXT,
    "thirdPartyName" TEXT,
    "aqlLevel" TEXT,
    "sampleSize" INTEGER,
    "defectsFound" INTEGER,
    "defectDetails" JSONB,
    "result" "InspectionResult" NOT NULL DEFAULT 'PENDING',
    "reportUrl" TEXT,
    "imageUrls" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "qc_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: packing_lists
CREATE TABLE "packing_lists" (
    "id" TEXT NOT NULL,
    "packingListNo" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "totalCartons" INTEGER NOT NULL DEFAULT 0,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "totalGrossWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNetWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCBM" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "packing_lists_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "packing_lists_packingListNo_key" ON "packing_lists"("packingListNo");

-- CreateTable: cartons
CREATE TABLE "cartons" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "cartonNo" INTEGER NOT NULL,
    "sizeBreakdown" JSONB NOT NULL DEFAULT '{}',
    "totalPcs" INTEGER NOT NULL DEFAULT 0,
    "netWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grossWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "length" DECIMAL(65,30),
    "width" DECIMAL(65,30),
    "height" DECIMAL(65,30),
    "cbm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cartons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cartons_packingListId_cartonNo_key" ON "cartons"("packingListId", "cartonNo");

-- CreateTable: carton_lines
CREATE TABLE "carton_lines" (
    "id" TEXT NOT NULL,
    "cartonId" TEXT NOT NULL,
    "styleNo" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carton_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ratio_pack_templates
CREATE TABLE "ratio_pack_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeRatios" JSONB NOT NULL,
    "pcsPerPack" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ratio_pack_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ratio_pack_templates_name_key" ON "ratio_pack_templates"("name");

-- CreateTable: shipments
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "shipmentNo" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "shipmentMethod" TEXT NOT NULL DEFAULT 'SEA_FCL',
    "shippingTerms" TEXT NOT NULL DEFAULT 'FOB',
    "portOfLoading" TEXT,
    "portOfDischarge" TEXT,
    "etd" TIMESTAMP(3),
    "eta" TIMESTAMP(3),
    "atd" TIMESTAMP(3),
    "ata" TIMESTAMP(3),
    "rogDate" TIMESTAMP(3),
    "vesselName" TEXT,
    "voyageNo" TEXT,
    "containerNo" TEXT,
    "blNo" TEXT,
    "awbNo" TEXT,
    "forwarderName" TEXT,
    "forwarderContact" TEXT,
    "freightCost" DECIMAL(65,30),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'BOOKING_MADE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shipments_shipmentNo_key" ON "shipments"("shipmentNo");

-- CreateTable: shipment_documents
CREATE TABLE "shipment_documents" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "notes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipment_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_invoices
CREATE TABLE "customer_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bankDetails" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_invoices_invoiceNo_key" ON "customer_invoices"("invoiceNo");

-- CreateTable: invoice_line_items
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "styleNo" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "lineTotal" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payments_received
CREATE TABLE "payments_received" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "amountInBase" DECIMAL(65,30) NOT NULL,
    "bankReference" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_received_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_costs
CREATE TABLE "order_costs" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "supplierName" TEXT,
    "quantity" DECIMAL(65,30),
    "unitCost" DECIMAL(65,30),
    "totalCost" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "totalCostBase" DECIMAL(65,30) NOT NULL,
    "supplierPORef" TEXT,
    "invoiceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "order_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: activity_logs
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activity_logs_entity_entityId_idx" ON "activity_logs"("entity", "entityId");

-- CreateTable: system_settings
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey constraints
ALTER TABLE "styles" ADD CONSTRAINT "styles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "styles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "srs" ADD CONSTRAINT "srs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "srs" ADD CONSTRAINT "srs_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "styles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "srs" ADD CONSTRAINT "srs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "costing_sheets" ADD CONSTRAINT "costing_sheets_srsId_fkey" FOREIGN KEY ("srsId") REFERENCES "srs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "po_line_items" ADD CONSTRAINT "po_line_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "po_line_items" ADD CONSTRAINT "po_line_items_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "styles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_suppliers" ADD CONSTRAINT "material_suppliers_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_suppliers" ADD CONSTRAINT "material_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "samples" ADD CONSTRAINT "samples_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "styles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "samples" ADD CONSTRAINT "samples_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "styles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_pos" ADD CONSTRAINT "supplier_pos_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_pos" ADD CONSTRAINT "supplier_pos_customerPOId_fkey" FOREIGN KEY ("customerPOId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_po_lines" ADD CONSTRAINT "supplier_po_lines_supplierPOId_fkey" FOREIGN KEY ("supplierPOId") REFERENCES "supplier_pos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_received" ADD CONSTRAINT "goods_received_supplierPOId_fkey" FOREIGN KEY ("supplierPOId") REFERENCES "supplier_pos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_received_items" ADD CONSTRAINT "goods_received_items_goodsReceivedId_fkey" FOREIGN KEY ("goodsReceivedId") REFERENCES "goods_received"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "factories" ADD CONSTRAINT "factories_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "factories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_stages" ADD CONSTRAINT "production_stages_prodOrderId_fkey" FOREIGN KEY ("prodOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_prodOrderId_fkey" FOREIGN KEY ("prodOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_prodOrderId_fkey" FOREIGN KEY ("prodOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cartons" ADD CONSTRAINT "cartons_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "packing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carton_lines" ADD CONSTRAINT "carton_lines_cartonId_fkey" FOREIGN KEY ("cartonId") REFERENCES "cartons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "customer_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments_received" ADD CONSTRAINT "payments_received_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "customer_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_costs" ADD CONSTRAINT "order_costs_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
