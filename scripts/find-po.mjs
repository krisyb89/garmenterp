// scripts/find-po.mjs
// Usage: node scripts/find-po.mjs PORDC-0005117
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

// Load .env manually
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);

const search = process.argv[2] || '';
if (!search) { console.error('Usage: node scripts/find-po.mjs <PO_NUMBER>'); process.exit(1); }

const client = new Client({ connectionString: env.DATABASE_URL });
await client.connect();

const { rows: pos } = await client.query(
  `SELECT p.id, p."poNo", p.status, p."totalQty", p."totalAmount", p.currency,
          p."orderDate", p."shipByDate", p."cancelDate", p."createdAt",
          c.name AS customer
   FROM purchase_orders p
   LEFT JOIN customers c ON c.id = p."customerId"
   WHERE p."poNo" ILIKE $1
   ORDER BY p."createdAt" DESC`,
  [`%${search}%`]
);

if (pos.length === 0) {
  console.log(`\n❌  No PO found matching "${search}"\n`);
} else {
  console.log(`\n✅  Found ${pos.length} PO(s) matching "${search}":\n`);
  for (const po of pos) {
    console.log(`  PO#:       ${po.poNo}`);
    console.log(`  ID:        ${po.id}`);
    console.log(`  Customer:  ${po.customer}`);
    console.log(`  Status:    ${po.status}`);
    console.log(`  Qty:       ${po.totalQty}`);
    console.log(`  Amount:    ${po.currency} ${parseFloat(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    console.log(`  Order Date:  ${po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '—'}`);
    console.log(`  Ship By:     ${po.shipByDate ? new Date(po.shipByDate).toLocaleDateString() : '—'}`);
    console.log(`  Cancel Date: ${po.cancelDate ? new Date(po.cancelDate).toLocaleDateString() : '—'}`);
    console.log(`  Created:   ${new Date(po.createdAt).toLocaleString()}`);

    // Also fetch line items
    const { rows: lines } = await client.query(
      `SELECT l.color, l."totalQty", l."lineTotal", s."styleNo"
       FROM po_line_items l
       LEFT JOIN styles s ON s.id = l."styleId"
       WHERE l."poId" = $1`,
      [po.id]
    );
    if (lines.length > 0) {
      console.log(`  Line Items:`);
      for (const l of lines) {
        console.log(`    • ${l.styleNo || '?'} / ${l.color} — qty ${l.totalQty}`);
      }
    }
    console.log('');
  }
}

await client.end();
