// scripts/migrate-excel.js
// Migration script: Import Excel data into Garment ERP database
// Run from project root: node scripts/migrate-excel.js

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, 'migration-data.json');
  const rows = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${rows.length} rows from migration-data.json`);

  // ==================== Step 1: Create Customer ====================
  console.log('\n--- Step 1: Creating customer ---');
  let customer = await prisma.customer.findFirst({ where: { name: 'Rloom' } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: 'Rloom',
        code: 'RLOOM',
        currency: 'USD',
        isActive: true,
      },
    });
    console.log(`Created customer: ${customer.name} (${customer.id})`);
  } else {
    console.log(`Customer already exists: ${customer.name} (${customer.id})`);
  }

  // ==================== Step 2: Create Styles ====================
  console.log('\n--- Step 2: Creating styles ---');
  const uniqueStyles = [...new Set(rows.map(r => r.styleNo).filter(Boolean))];
  const styleMap = {}; // styleNo -> style record

  for (const styleNo of uniqueStyles) {
    let style = await prisma.style.findFirst({ where: { styleNo } });
    if (!style) {
      style = await prisma.style.create({
        data: {
          styleNo,
          customerId: customer.id,
          
        },
      });
      console.log(`  Created style: ${styleNo}`);
    }
    styleMap[styleNo] = style;
  }
  console.log(`Styles ready: ${Object.keys(styleMap).length}`);

  // ==================== Step 3: Create Purchase Orders + Line Items ====================
  console.log('\n--- Step 3: Creating POs and line items ---');

  // Group rows by PO#
  const poGroups = {};
  for (const row of rows) {
    if (!poGroups[row.poNo]) poGroups[row.poNo] = [];
    poGroups[row.poNo].push(row);
  }

  const poMap = {};       // poNo -> PO record
  const lineItemMap = {}; // `${poNo}|${styleNo}|${printName}` -> lineItem record

  for (const [poNo, poRows] of Object.entries(poGroups)) {
    const firstRow = poRows[0];

    // Calculate PO totals
    const totalQty = poRows.reduce((s, r) => s + (r.quantity || 0), 0);
    const totalAmount = poRows.reduce((s, r) => s + (r.totalValue || 0), 0);

    // Determine PO status
    let poStatus = 'CONFIRMED';
    if (firstRow.orderStatus && firstRow.orderStatus.toLowerCase().includes('pending')) {
      poStatus = 'DRAFT';
    }

    // Check if PO already exists
    let po = await prisma.purchaseOrder.findFirst({ where: { poNo } });
    if (!po) {
      po = await prisma.purchaseOrder.create({
        data: {
          poNo,
          customerId: customer.id,
          store: firstRow.store || null,
          orderDate: firstRow.poReceivedDate ? new Date(firstRow.poReceivedDate) : new Date(),
          ihDate: firstRow.ihDate ? new Date(firstRow.ihDate) : null,
          currency: 'USD',
          totalQty,
          totalAmount,
          status: poStatus === 'DRAFT' ? 'RECEIVED' : 'CONFIRMED',
          notes: [firstRow.orderNumber, firstRow.orderStatus].filter(Boolean).join(' | '),
        },
      });
      console.log(`  Created PO: ${poNo} (${poRows.length} lines, ${totalQty} pcs)`);
    } else {
      console.log(`  PO exists: ${poNo} (${po.id})`);
    }
    poMap[poNo] = po;

    // Create line items for each style in this PO
    for (const row of poRows) {
      if (!row.styleNo) continue;
      const style = styleMap[row.styleNo];
      if (!style) continue;

      const lineKey = `${poNo}|${row.styleNo}|${row.printName || ''}`;

      // Check if line item already exists
      let lineItem = await prisma.pOLineItem.findFirst({
        where: {
          poId: po.id,
          styleId: style.id,
          color: row.printName || null,
        },
      });

      if (!lineItem) {
        lineItem = await prisma.pOLineItem.create({
          data: {
            poId: po.id,
            styleId: style.id,
            color: row.printName || null,
            totalQty: row.quantity || 0 || 0,
            unitPrice: row.unitPrice || 0,
            lineTotal: row.totalValue || 0 || 0,
            sizeBreakdown: {},
          },
        });
      }
      lineItemMap[lineKey] = lineItem;
    }
  }
  console.log(`POs ready: ${Object.keys(poMap).length}`);
  console.log(`Line items ready: ${Object.keys(lineItemMap).length}`);

  // ==================== Step 4: Create WIP Cells for approvals ====================
  console.log('\n--- Step 4: Creating WIP cells ---');
  let cellsCreated = 0;
  let commentsCreated = 0;

  for (const row of rows) {
    if (!row.styleNo || !row.poNo) continue;
    const lineKey = `${row.poNo}|${row.styleNo}|${row.printName || ''}`;
    const lineItem = lineItemMap[lineKey];
    if (!lineItem) {
      console.log(`  SKIP: No line item for ${lineKey}`);
      continue;
    }

    for (const [colName, approval] of Object.entries(row.approvals)) {
      // Check if WIP cell already exists
      let existing = await prisma.wIPCell.findFirst({
        where: {
          poLineItemId: lineItem.id,
          label: approval.label,
        },
      });

      if (existing) continue;

      try {
        const cell = await prisma.wIPCell.create({
          data: {
            poLineItemId: lineItem.id,
            segment: approval.segment,
            approvalType: approval.type,
            label: approval.label,
            status: approval.status || 'PENDING',
            sortOrder: 0,
          },
        });
        cellsCreated++;

        // Add the original text as a comment for history
        if (approval.text) {
          await prisma.wIPComment.create({
            data: {
              wipCellId: cell.id,
              text: `[Migrated from Excel] ${approval.text}`,
              approvalStatus: approval.status || 'PENDING',
            },
          });
          commentsCreated++;
        }
      } catch (err) {
        // Unique constraint violation — skip
        if (err.code === 'P2002') continue;
        console.log(`  ERROR creating cell for ${row.styleNo}/${approval.label}: ${err.message}`);
      }
    }
  }

  console.log(`WIP cells created: ${cellsCreated}`);
  console.log(`WIP comments created: ${commentsCreated}`);

  // ==================== Summary ====================
  console.log('\n========== MIGRATION COMPLETE ==========');
  console.log(`Customer: Rloom`);
  console.log(`Styles created: ${uniqueStyles.length}`);
  console.log(`POs created: ${Object.keys(poMap).length}`);
  console.log(`Line items created: ${Object.keys(lineItemMap).length}`);
  console.log(`WIP cells created: ${cellsCreated}`);
  console.log(`WIP comments created: ${commentsCreated}`);
  console.log('=========================================');
}

main()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
