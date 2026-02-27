/**
 * PO Migration Script
 * Migrates POs from po-migration-data.json into the database.
 *
 * Usage:
 *   node scripts/migrate-pos.mjs              — dry run (preview only)
 *   node scripts/migrate-pos.mjs --commit      — actually write to DB
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
// Load .env (built-in Node v20.12+, no dotenv package needed)
try { process.loadEnvFile(); } catch { /* .env not found, rely on environment */ }

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--commit');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataPath = path.join(__dirname, 'po-migration-data.json');
const { pos, skipped } = JSON.parse(readFileSync(dataPath, 'utf8'));

// ─── Helpers ───────────────────────────────────────────────────────────────

function log(msg)  { console.log(msg); }
function ok(msg)   { console.log('  ✅', msg); }
function skip(msg) { console.log('  ⏭️ ', msg); }
function warn(msg) { console.log('  ⚠️ ', msg); }
function err(msg)  { console.log('  ❌', msg); }

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  log(`\n${'='.repeat(60)}`);
  log(`PO MIGRATION  —  ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🚀 COMMIT MODE'}`);
  log(`${'='.repeat(60)}\n`);

  // 1. Find the Rloom customer
  const customer = await prisma.customer.findFirst({
    where: { name: { contains: 'Rloom', mode: 'insensitive' } },
  });
  if (!customer) {
    err('Customer "Rloom" not found in database. Aborting.');
    process.exit(1);
  }
  ok(`Customer found: ${customer.name} (id: ${customer.id})`);

  // 2. Load all existing styles into a lookup map
  const existingStyles = await prisma.style.findMany({
    select: { id: true, styleNo: true },
  });
  const styleMap = Object.fromEntries(existingStyles.map(s => [s.styleNo, s.id]));
  log(`\nFound ${existingStyles.length} existing styles in DB`);

  // 3. Collect all style numbers needed
  const neededStyleNos = [...new Set(pos.flatMap(p => p.lineItems.map(l => l.styleNo)))];
  const missing = neededStyleNos.filter(s => !styleMap[s]);
  log(`Styles needed: ${neededStyleNos.length} | Missing (will create): ${missing.length}`);

  // 4. Create missing styles
  if (!DRY_RUN) {
    for (const styleNo of missing) {
      const created = await prisma.style.create({
        data: {
          styleNo,
          customerId: customer.id,
          isActive: true,
        },
      });
      styleMap[styleNo] = created.id;
      ok(`Created style: ${styleNo}`);
    }
  } else {
    for (const styleNo of missing) {
      warn(`[DRY RUN] Would create style: ${styleNo}`);
      styleMap[styleNo] = `new-style-${styleNo}`; // temp ID for dry-run preview
    }
  }

  // 5. Load existing PO numbers to detect duplicates
  const existingPOs = await prisma.purchaseOrder.findMany({
    where: { customerId: customer.id },
    select: { poNo: true },
  });
  const existingPoNos = new Set(existingPOs.map(p => p.poNo));
  log(`\nFound ${existingPOs.length} existing POs for Rloom in DB`);

  // 6. Migrate each PO
  log(`\n${'─'.repeat(60)}`);
  log(`Migrating ${pos.length} POs...`);
  log(`${'─'.repeat(60)}`);

  let created = 0, skippedDup = 0, errors = 0;

  for (const po of pos) {
    if (existingPoNos.has(po.poNo)) {
      skip(`${po.poNo} — already exists, skipping`);
      skippedDup++;
      continue;
    }

    // Build line items
    const lineItemsData = po.lineItems.map(li => {
      const styleId = styleMap[li.styleNo];
      if (!styleId) {
        warn(`Style ${li.styleNo} not resolved for PO ${po.poNo}`);
      }
      return {
        styleId: styleId || null,
        color: li.color,
        colorCode: null,
        unitPrice: li.unitPrice,
        sizeBreakdown: li.sizeBreakdown,
        totalQty: li.totalQty,
        lineTotal: li.totalQty * li.unitPrice,
        notes: li.notes,
      };
    }).filter(li => li.styleId); // skip items with unresolved style

    const totalQty = lineItemsData.reduce((s, l) => s + l.totalQty, 0);
    const totalAmount = lineItemsData.reduce((s, l) => s + Number(l.lineTotal), 0);

    const ihDate = po.ihDate ? new Date(po.ihDate) : null;
    const poData = {
      poNo: po.poNo,
      customerId: customer.id,
      orderDate: po.orderDate ? new Date(po.orderDate) : new Date(),
      ihDate,
      cancelDate: ihDate,   // IH Date = Cancel Date in this workflow
      store: po.store,
      currency: po.currency,
      status: po.status,
      shippingTerms: 'FOB',
      totalQty,
      totalAmount,
      notes: po.orderNumber ? `Order Ref: ${po.orderNumber}` : null,
    };

    if (!DRY_RUN) {
      try {
        await prisma.purchaseOrder.create({
          data: {
            ...poData,
            lineItems: { create: lineItemsData },
          },
        });
        ok(`${po.poNo} — created (${lineItemsData.length} line items, qty ${totalQty})`);
        created++;
      } catch (e) {
        err(`${po.poNo} — FAILED: ${e.message}`);
        errors++;
      }
    } else {
      log(`  [DRY RUN] ${po.poNo} — ${po.store} | ${lineItemsData.length} lines | qty ${totalQty} | $${totalAmount.toFixed(2)}`);
      lineItemsData.forEach(l => {
        const styleNo = Object.entries(styleMap).find(([,v]) => v === l.styleId)?.[0] || '?';
        log(`           └─ ${styleNo}  ${l.color}  qty:${l.totalQty}  @$${l.unitPrice}`);
      });
      created++;
    }
  }

  // 7. Summary
  log(`\n${'='.repeat(60)}`);
  log(`SUMMARY`);
  log(`${'='.repeat(60)}`);
  log(`  POs ${DRY_RUN ? 'to create' : 'created'}  : ${created}`);
  log(`  Skipped (duplicate) : ${skippedDup}`);
  if (errors) log(`  Errors              : ${errors}`);
  log(`  Styles ${DRY_RUN ? 'to create' : 'created'} : ${missing.length}`);
  log('');
  log(`  Rows without PO# (not migrated): ${skipped.length}`);
  skipped.forEach(s => log(`    - ${s.orderNumber || 'no order#'} | ${s.styleNo} | ${s.store} | ${s.color} | qty:${s.qty}`));

  if (DRY_RUN) {
    log(`\n👆 Dry run complete. Re-run with --commit to write to database.`);
  } else {
    log(`\n🎉 Migration complete!`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
