// prisma/migrate-neon-to-mysql.js
// Migrates all data from Neon PostgreSQL → Tencent Cloud MySQL
// Run with: node prisma/migrate-neon-to-mysql.js

const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');

const NEON_URL =
  'postgresql://neondb_owner:npg_dufoJKtcxr91@ep-withered-king-aiqu6u4o-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

let totalMigrated = 0;
let totalSkipped = 0;

async function migrateTable(name, rows, insertFn) {
  if (!rows.length) {
    console.log(`  ⊘  ${name}: (empty)`);
    return;
  }
  let ok = 0, skip = 0;
  for (const row of rows) {
    try {
      await insertFn(row);
      ok++;
    } catch (e) {
      // P2002 = unique constraint — already exists, skip silently
      if (e.code !== 'P2002') {
        console.warn(`  ⚠  ${name} row ${row.id}: ${e.message?.slice(0, 120)}`);
      }
      skip++;
    }
  }
  totalMigrated += ok;
  totalSkipped += skip;
  console.log(`  ✓  ${name}: ${ok} rows${skip ? ` (${skip} skipped)` : ''}`);
}

async function main() {
  // ── Connect to Neon ─────────────────────────────────────────
  const pg = new Client({ connectionString: NEON_URL });
  await pg.connect();
  console.log('✅ Connected to Neon PostgreSQL\n');

  // ── Connect to MySQL via Prisma ──────────────────────────────
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✅ Connected to Tencent MySQL\n');

  const q = async (sql) => (await pg.query(sql)).rows;

  // ════════════════════════════════════════════════════════════
  // TIER 1 — No foreign key dependencies
  // ════════════════════════════════════════════════════════════

  console.log('── Tier 1: Base tables ──────────────────────────────');

  await migrateTable('users', await q('SELECT * FROM users ORDER BY "createdAt"'), (r) =>
    prisma.user.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, email: r.email, passwordHash: r.passwordHash,
        name: r.name, role: r.role, isActive: r.isActive ?? true,
        phone: r.phone, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('customers', await q('SELECT * FROM customers ORDER BY "createdAt"'), (r) =>
    prisma.customer.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, name: r.name, code: r.code, contactPerson: r.contactPerson,
        email: r.email, phone: r.phone, address: r.address, country: r.country,
        currency: r.currency ?? 'USD', paymentTermDays: r.paymentTermDays ?? 60,
        paymentTermBasis: r.paymentTermBasis ?? 'ROG', notes: r.notes,
        isActive: r.isActive ?? true, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('material_categories', await q('SELECT * FROM material_categories ORDER BY "createdAt"'), (r) =>
    prisma.materialCategory.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, name: r.name, createdAt: r.createdAt, updatedAt: r.updatedAt },
    })
  );

  await migrateTable('system_settings', await q('SELECT * FROM system_settings'), (r) =>
    prisma.systemSetting.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, key: r.key, value: r.value, description: r.description, updatedAt: r.updatedAt },
    })
  );

  await migrateTable('wip_columns', await q('SELECT * FROM wip_columns ORDER BY "createdAt"'), (r) =>
    prisma.wIPColumn.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, scope: r.scope, key: r.key, label: r.label,
        kind: r.kind ?? 'FIELD', groupName: r.groupName,
        approvalType: r.approvalType, approvalSlot: r.approvalSlot,
        sampleStage: r.sampleStage, dataType: r.dataType ?? 'text',
        options: r.options, sortOrder: r.sortOrder ?? 0,
        isActive: r.isActive ?? true, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  // ════════════════════════════════════════════════════════════
  // TIER 2 — Single dependency
  // ════════════════════════════════════════════════════════════

  console.log('\n── Tier 2: Single dependencies ──────────────────────');

  await migrateTable('suppliers', await q('SELECT * FROM suppliers ORDER BY "createdAt"'), (r) =>
    prisma.supplier.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, name: r.name, code: r.code, type: r.type,
        contactPerson: r.contactPerson, email: r.email, phone: r.phone,
        address: r.address, country: r.country, currency: r.currency ?? 'CNY',
        paymentTerms: r.paymentTerms, leadTimeDays: r.leadTimeDays,
        bankDetails: r.bankDetails, complianceStatus: r.complianceStatus,
        auditExpiry: r.auditExpiry, rating: r.rating, notes: r.notes,
        isActive: r.isActive ?? true, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('materials', await q('SELECT * FROM materials ORDER BY "createdAt"'), (r) =>
    prisma.material.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, code: r.code, name: r.name, categoryId: r.categoryId ?? '',
        description: r.description, content: r.content,
        widthMeters: r.widthMeters, gsm: r.gsm,
        pricePerUnit: r.pricePerUnit, unit: r.unit ?? 'METER',
        pricePerMeter: r.pricePerMeter, vatPercent: r.vatPercent ?? 0,
        composition: r.composition, weight: r.weight, width: r.width,
        colorOptions: r.colorOptions, unitOfMeasure: r.unitOfMeasure ?? 'MTR',
        moq: r.moq, leadTimeDays: r.leadTimeDays, imageUrl: r.imageUrl,
        notes: r.notes, isActive: r.isActive ?? true,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('styles', await q('SELECT * FROM styles ORDER BY "createdAt"'), (r) =>
    prisma.style.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, styleNo: r.styleNo, customerId: r.customerId,
        customerRef: r.customerRef, description: r.description,
        category: r.category, season: r.season, year: r.year,
        collection: r.collection, techPackUrl: r.techPackUrl,
        imageUrl: r.imageUrl, imageUrls: r.imageUrls,
        attachments: r.attachments, construction: r.construction,
        fitType: r.fitType, washInstructions: r.washInstructions,
        notes: r.notes, isActive: r.isActive ?? true,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('factories', await q('SELECT * FROM factories ORDER BY "createdAt"'), (r) =>
    prisma.factory.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, name: r.name, code: r.code, supplierId: r.supplierId,
        country: r.country, address: r.address, contactPerson: r.contactPerson,
        phone: r.phone, email: r.email, isInHouse: r.isInHouse ?? false,
        capacity: r.capacity, specialties: r.specialties,
        complianceStatus: r.complianceStatus, cmtRateRange: r.cmtRateRange,
        notes: r.notes, isActive: r.isActive ?? true,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  // ════════════════════════════════════════════════════════════
  // TIER 3 — Two-way dependencies
  // ════════════════════════════════════════════════════════════

  console.log('\n── Tier 3: Junction & linked tables ─────────────────');

  await migrateTable('material_suppliers', await q('SELECT * FROM material_suppliers ORDER BY "createdAt"'), (r) =>
    prisma.materialSupplier.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, materialId: r.materialId, supplierId: r.supplierId,
        unitPrice: r.unitPrice, currency: r.currency ?? 'CNY',
        moq: r.moq, leadTimeDays: r.leadTimeDays,
        isPreferred: r.isPreferred ?? false, notes: r.notes,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('bom_items', await q('SELECT * FROM bom_items ORDER BY "createdAt"'), (r) =>
    prisma.bOMItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, styleId: r.styleId, materialId: r.materialId,
        description: r.description, placement: r.placement,
        consumptionQty: r.consumptionQty, consumptionUnit: r.consumptionUnit,
        wastagePercent: r.wastagePercent ?? 3, notes: r.notes,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('srs', await q('SELECT * FROM srs ORDER BY "createdAt"'), (r) =>
    prisma.sRS.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, srsNo: r.srsNo, customerId: r.customerId,
        styleId: r.styleId, styleNo: r.styleNo ?? '',
        brand: r.brand, colorPrint: r.colorPrint, deadline: r.deadline,
        createdById: r.createdById, description: r.description,
        techPackUrl: r.techPackUrl, imageUrls: r.imageUrls,
        attachments: r.attachments, targetPrice: r.targetPrice,
        targetPriceCurrency: r.targetPriceCurrency ?? 'USD',
        estimatedQtyMin: r.estimatedQtyMin, estimatedQtyMax: r.estimatedQtyMax,
        deliveryWindow: r.deliveryWindow, targetMarkets: r.targetMarkets,
        fabricSpecs: r.fabricSpecs, trimSpecs: r.trimSpecs,
        status: r.status ?? 'RECEIVED', revisionNo: r.revisionNo ?? 1,
        quotedPrice: r.quotedPrice, quotedDate: r.quotedDate,
        confirmedDate: r.confirmedDate, notes: r.notes, wipData: r.wipData,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  // ════════════════════════════════════════════════════════════
  // TIER 4 — Purchase Orders & children
  // ════════════════════════════════════════════════════════════

  console.log('\n── Tier 4: Purchase Orders ───────────────────────────');

  await migrateTable('purchase_orders', await q('SELECT * FROM purchase_orders ORDER BY "createdAt"'), (r) =>
    prisma.purchaseOrder.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, poNo: r.poNo, customerId: r.customerId,
        store: r.store, brand: r.brand, orderDate: r.orderDate,
        revisionNo: r.revisionNo ?? 0, shipByDate: r.shipByDate,
        cancelDate: r.cancelDate, shippingTerms: r.shippingTerms ?? 'FOB',
        portOfLoading: r.portOfLoading, portOfDischarge: r.portOfDischarge,
        currency: r.currency ?? 'USD', exchangeRate: r.exchangeRate ?? 1,
        status: r.status ?? 'RECEIVED', totalQty: r.totalQty ?? 0,
        totalAmount: r.totalAmount ?? 0, ihDate: r.ihDate,
        specialInstructions: r.specialInstructions, notes: r.notes,
        wipData: r.wipData, createdByUserId: r.createdByUserId,
        lastModifiedByUserId: r.lastModifiedByUserId,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('costing_sheets', await q('SELECT * FROM costing_sheets ORDER BY "createdAt"'), (r) =>
    prisma.costingSheet.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, srsId: r.srsId, revisionNo: r.revisionNo ?? 1,
        versionLabel: r.versionLabel, fabricDetails: r.fabricDetails,
        trimDetails: r.trimDetails, laborDetails: r.laborDetails,
        packingDetails: r.packingDetails, misDetails: r.misDetails,
        freightDetails: r.freightDetails, dutyDetails: r.dutyDetails,
        fabricCost: r.fabricCost ?? 0, trimCost: r.trimCost ?? 0,
        laborCost: r.laborCost ?? 0, packingCost: r.packingCost ?? 0,
        misCost: r.misCost ?? 0, freightCost: r.freightCost ?? 0,
        dutyCost: r.dutyCost ?? 0, totalCostLocal: r.totalCostLocal ?? 0,
        totalCostQuoted: r.totalCostQuoted ?? 0,
        agentCommPercent: r.agentCommPercent ?? 0,
        agentCommAmount: r.agentCommAmount ?? 0,
        targetMarginPercent: r.targetMarginPercent ?? 0,
        sellingPrice: r.sellingPrice ?? 0,
        actualQuotedPrice: r.actualQuotedPrice,
        pricingBasis: r.pricingBasis ?? 'FOB',
        localCurrency: r.localCurrency ?? 'CNY',
        quoteCurrency: r.quoteCurrency ?? 'USD',
        exchangeRate: r.exchangeRate ?? 1,
        notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('po_line_items', await q('SELECT * FROM po_line_items ORDER BY "createdAt"'), (r) =>
    prisma.pOLineItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, poId: r.poId, styleId: r.styleId,
        color: r.color, colorCode: r.colorCode,
        unitPrice: r.unitPrice, sizeBreakdown: r.sizeBreakdown,
        totalQty: r.totalQty, lineTotal: r.lineTotal,
        shippingOrders: r.shippingOrders, deliveryDate: r.deliveryDate,
        notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  // ════════════════════════════════════════════════════════════
  // TIER 5 — Production, WIP, Approvals, Supplier POs
  // ════════════════════════════════════════════════════════════

  console.log('\n── Tier 5: Production & Supplier POs ────────────────');

  await migrateTable('wip_cells', await q('SELECT * FROM wip_cells ORDER BY "createdAt"'), (r) =>
    prisma.wIPCell.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, poLineItemId: r.poLineItemId, segment: r.segment,
        approvalType: r.approvalType, label: r.label,
        status: r.status ?? 'PENDING', sortOrder: r.sortOrder ?? 0,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('approval_records', await q('SELECT * FROM approval_records ORDER BY "createdAt"'), (r) =>
    prisma.approvalRecord.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, styleId: r.styleId, poLineItemId: r.poLineItemId,
        materialId: r.materialId, type: r.type, slot: r.slot,
        reference: r.reference, supplierName: r.supplierName,
        submissionNo: r.submissionNo ?? 1, submitDate: r.submitDate,
        approvalDate: r.approvalDate, status: r.status ?? 'PENDING',
        customerComments: r.customerComments, imageUrls: r.imageUrls,
        notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('supplier_pos', await q('SELECT * FROM supplier_pos ORDER BY "createdAt"'), (r) =>
    prisma.supplierPO.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, spoNo: r.spoNo, supplierId: r.supplierId,
        customerPOId: r.customerPOId, orderDate: r.orderDate,
        deliveryDate: r.deliveryDate, currency: r.currency ?? 'CNY',
        totalAmount: r.totalAmount ?? 0, paymentTerms: r.paymentTerms,
        status: r.status ?? 'DRAFT', notes: r.notes,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('supplier_po_lines', await q('SELECT * FROM supplier_po_lines ORDER BY "createdAt"'), (r) =>
    prisma.supplierPOLine.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, supplierPOId: r.supplierPOId, materialId: r.materialId,
        description: r.description, color: r.color,
        quantity: r.quantity, unit: r.unit ?? 'YDS',
        unitPrice: r.unitPrice, lineTotal: r.lineTotal,
        vatRate: r.vatRate, vatRefundable: r.vatRefundable ?? false,
        notes: r.notes, poLineItemId: r.poLineItemId,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('goods_received', await q('SELECT * FROM goods_received ORDER BY "createdAt"'), (r) =>
    prisma.goodsReceived.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, supplierPOId: r.supplierPOId,
        receivedDate: r.receivedDate, receivedBy: r.receivedBy,
        location: r.location, notes: r.notes,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('goods_received_items', await q('SELECT * FROM goods_received_items ORDER BY "createdAt"'), (r) =>
    prisma.goodsReceivedItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, goodsReceivedId: r.goodsReceivedId,
        description: r.description, color: r.color,
        orderedQty: r.orderedQty, receivedQty: r.receivedQty,
        unit: r.unit, actualUnitPrice: r.actualUnitPrice,
        actualLineTotal: r.actualLineTotal, qcResult: r.qcResult,
        remarks: r.remarks, createdAt: r.createdAt,
      },
    })
  );

  await migrateTable('inventory_items', await q('SELECT * FROM inventory_items ORDER BY "createdAt"'), (r) =>
    prisma.inventoryItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, materialId: r.materialId, location: r.location,
        color: r.color, lotNo: r.lotNo, quantity: r.quantity,
        unit: r.unit, notes: r.notes,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('stock_movements', await q('SELECT * FROM stock_movements ORDER BY "createdAt"'), (r) =>
    prisma.stockMovement.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, inventoryItemId: r.inventoryItemId, type: r.type,
        quantity: r.quantity, fromLocation: r.fromLocation,
        toLocation: r.toLocation, reference: r.reference,
        notes: r.notes, createdAt: r.createdAt,
      },
    })
  );

  await migrateTable('production_orders', await q('SELECT * FROM production_orders ORDER BY "createdAt"'), (r) =>
    prisma.productionOrder.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, prodOrderNo: r.prodOrderNo, poId: r.poId,
        factoryId: r.factoryId, styleNo: r.styleNo, color: r.color,
        sizeBreakdown: r.sizeBreakdown, totalQty: r.totalQty,
        targetStartDate: r.targetStartDate, targetEndDate: r.targetEndDate,
        actualStartDate: r.actualStartDate, actualEndDate: r.actualEndDate,
        cmtRate: r.cmtRate, cmtCurrency: r.cmtCurrency ?? 'USD',
        status: r.status ?? 'PLANNED',
        specialInstructions: r.specialInstructions, notes: r.notes,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('production_stages', await q('SELECT * FROM production_stages ORDER BY "createdAt"'), (r) =>
    prisma.productionStage.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, prodOrderId: r.prodOrderId, stage: r.stage,
        plannedDate: r.plannedDate, actualDate: r.actualDate,
        completedQty: r.completedQty, notes: r.notes,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('material_issues', await q('SELECT * FROM material_issues ORDER BY "createdAt"'), (r) =>
    prisma.materialIssue.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, prodOrderId: r.prodOrderId, materialDesc: r.materialDesc,
        color: r.color, quantity: r.quantity, unit: r.unit,
        issuedDate: r.issuedDate, issuedTo: r.issuedTo,
        notes: r.notes, createdAt: r.createdAt,
      },
    })
  );

  await migrateTable('qc_inspections', await q('SELECT * FROM qc_inspections ORDER BY "createdAt"'), (r) =>
    prisma.qCInspection.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, prodOrderId: r.prodOrderId, type: r.type,
        inspectionDate: r.inspectionDate, inspectorId: r.inspectorId,
        thirdPartyName: r.thirdPartyName, aqlLevel: r.aqlLevel,
        sampleSize: r.sampleSize, defectsFound: r.defectsFound,
        defectDetails: r.defectDetails, result: r.result ?? 'PENDING',
        reportUrl: r.reportUrl, imageUrls: r.imageUrls,
        notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  // ════════════════════════════════════════════════════════════
  // TIER 6 — Shipping, Finance, Packages
  // ════════════════════════════════════════════════════════════

  console.log('\n── Tier 6: Shipping & Finance ────────────────────────');

  await migrateTable('shipments', await q('SELECT * FROM shipments ORDER BY "createdAt"'), (r) =>
    prisma.shipment.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, shipmentNo: r.shipmentNo, poId: r.poId,
        shipmentMethod: r.shipmentMethod ?? 'SEA_FCL',
        shippingTerms: r.shippingTerms ?? 'FOB',
        portOfLoading: r.portOfLoading, portOfDischarge: r.portOfDischarge,
        etd: r.etd, eta: r.eta, atd: r.atd, ata: r.ata,
        rogDate: r.rogDate, vesselName: r.vesselName, voyageNo: r.voyageNo,
        containerNo: r.containerNo, blNo: r.blNo, awbNo: r.awbNo,
        forwarderName: r.forwarderName, forwarderContact: r.forwarderContact,
        freightCost: r.freightCost, status: r.status ?? 'BOOKING_MADE',
        notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('packing_lists', await q('SELECT * FROM packing_lists ORDER BY "createdAt"'), (r) =>
    prisma.packingList.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, packingListNo: r.packingListNo, poId: r.poId,
        shipmentId: r.shipmentId, totalCartons: r.totalCartons ?? 0,
        totalQty: r.totalQty ?? 0, totalGrossWeight: r.totalGrossWeight ?? 0,
        totalNetWeight: r.totalNetWeight ?? 0, totalCBM: r.totalCBM ?? 0,
        notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('cartons', await q('SELECT * FROM cartons ORDER BY "createdAt"'), (r) =>
    prisma.carton.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, packingListId: r.packingListId, cartonNo: r.cartonNo,
        styleNo: r.styleNo, color: r.color, sizeBreakdown: r.sizeBreakdown,
        totalPcs: r.totalPcs, netWeight: r.netWeight ?? 0,
        grossWeight: r.grossWeight ?? 0, length: r.length,
        width: r.width, height: r.height, cbm: r.cbm ?? 0,
        createdAt: r.createdAt,
      },
    })
  );

  await migrateTable('shipment_documents', await q('SELECT * FROM shipment_documents ORDER BY "uploadedAt"'), (r) =>
    prisma.shipmentDocument.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, shipmentId: r.shipmentId, docType: r.docType,
        fileName: r.fileName, fileUrl: r.fileUrl,
        notes: r.notes, uploadedAt: r.uploadedAt,
      },
    })
  );

  await migrateTable('customer_invoices', await q('SELECT * FROM customer_invoices ORDER BY "createdAt"'), (r) =>
    prisma.customerInvoice.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, invoiceNo: r.invoiceNo, customerId: r.customerId,
        poId: r.poId, invoiceDate: r.invoiceDate, dueDate: r.dueDate,
        currency: r.currency ?? 'USD', subtotal: r.subtotal ?? 0,
        adjustments: r.adjustments ?? 0, totalAmount: r.totalAmount ?? 0,
        amountPaid: r.amountPaid ?? 0, amountDue: r.amountDue ?? 0,
        bankDetails: r.bankDetails, status: r.status ?? 'DRAFT',
        notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('invoice_line_items', await q('SELECT * FROM invoice_line_items ORDER BY "createdAt"'), (r) =>
    prisma.invoiceLineItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, invoiceId: r.invoiceId, styleNo: r.styleNo,
        color: r.color, description: r.description,
        quantity: r.quantity, unitPrice: r.unitPrice,
        lineTotal: r.lineTotal, createdAt: r.createdAt,
      },
    })
  );

  await migrateTable('payments_received', await q('SELECT * FROM payments_received ORDER BY "createdAt"'), (r) =>
    prisma.paymentReceived.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, invoiceId: r.invoiceId, paymentDate: r.paymentDate,
        amount: r.amount, currency: r.currency,
        exchangeRate: r.exchangeRate ?? 1, amountInBase: r.amountInBase,
        bankReference: r.bankReference, paymentMethod: r.paymentMethod,
        notes: r.notes, createdAt: r.createdAt,
      },
    })
  );

  await migrateTable('order_costs', await q('SELECT * FROM order_costs ORDER BY "createdAt"'), (r) =>
    prisma.orderCost.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, poId: r.poId, category: r.category,
        description: r.description, supplierName: r.supplierName,
        quantity: r.quantity, unitCost: r.unitCost,
        totalCost: r.totalCost, currency: r.currency ?? 'USD',
        exchangeRate: r.exchangeRate ?? 1, totalCostBase: r.totalCostBase,
        supplierPORef: r.supplierPORef, invoiceRef: r.invoiceRef,
        notes: r.notes, poLineItemId: r.poLineItemId,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  // ════════════════════════════════════════════════════════════
  // TIER 7 — Packages & WIP
  // ════════════════════════════════════════════════════════════

  console.log('\n── Tier 7: Packages & WIP ────────────────────────────');

  await migrateTable('packages', await q('SELECT * FROM packages ORDER BY "createdAt"'), (r) =>
    prisma.package.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, customerId: r.customerId, courier: r.courier,
        trackingNo: r.trackingNo, dateSent: r.dateSent,
        inHandDate: r.inHandDate, status: r.status ?? 'DRAFT',
        notes: r.notes, createdById: r.createdById,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('package_items', await q('SELECT * FROM package_items ORDER BY "createdAt"'), (r) =>
    prisma.packageItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, packageId: r.packageId, section: r.section,
        approvalType: r.approvalType, srsId: r.srsId,
        colorPrint: r.colorPrint, description: r.description,
        approvalStatus: r.approvalStatus ?? 'PENDING',
        comments: r.comments, sortOrder: r.sortOrder ?? 0,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    })
  );

  await migrateTable('package_item_wip_cells', await q('SELECT * FROM package_item_wip_cells'), (r) =>
    prisma.packageItemWIPCell.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, packageItemId: r.packageItemId, wipCellId: r.wipCellId },
    })
  );

  await migrateTable('wip_comments', await q('SELECT * FROM wip_comments ORDER BY "createdAt"'), (r) =>
    prisma.wIPComment.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, wipCellId: r.wipCellId, packageItemId: r.packageItemId,
        approvalStatus: r.approvalStatus, text: r.text,
        createdById: r.createdById, createdAt: r.createdAt,
      },
    })
  );

  // ════════════════════════════════════════════════════════════
  // TIER 8 — Activity Logs (last, no hard deps)
  // ════════════════════════════════════════════════════════════

  console.log('\n── Tier 8: Activity Logs ─────────────────────────────');

  await migrateTable('activity_logs', await q('SELECT * FROM activity_logs ORDER BY "createdAt"'), (r) =>
    prisma.activityLog.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, userId: r.userId, action: r.action,
        entity: r.entity, entityId: r.entityId,
        details: r.details, beforeData: r.beforeData,
        afterData: r.afterData, ipAddress: r.ipAddress,
        userAgent: r.userAgent, createdAt: r.createdAt,
      },
    })
  );

  // ════════════════════════════════════════════════════════════
  // DONE
  // ════════════════════════════════════════════════════════════

  console.log('\n════════════════════════════════════════════════════');
  console.log(`✅ Migration complete!`);
  console.log(`   Rows migrated : ${totalMigrated}`);
  console.log(`   Rows skipped  : ${totalSkipped} (already existed or constraint)`);
  console.log('════════════════════════════════════════════════════\n');

  await pg.end();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('\n❌ Migration failed:', e.message);
  process.exit(1);
});
