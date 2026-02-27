#!/usr/bin/env node
/**
 * scripts/check-delivery.mjs
 *
 * Scheduled script: checks AfterShip carrier tracking for all SENT packages
 * and auto-marks them as RECEIVED when the carrier confirms delivery.
 *
 * Run manually:   node scripts/check-delivery.mjs
 * Scheduled:      Weekdays 8:45am Beijing time via Cowork task scheduler
 *
 * Uses raw pg (node-postgres) to avoid Prisma binary platform issues.
 */

import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const lines = readFileSync(resolve(projectRoot, '.env'), 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val   = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn('[check-delivery] .env not loaded — using existing environment variables');
  }
}
loadEnv();

const require = createRequire(import.meta.url);
const { Client } = require(resolve(projectRoot, 'node_modules/pg'));

const AFTERSHIP_BASE = 'https://api.aftership.com/tracking/2023-10';
const COURIER_SLUGS  = { UPS: 'ups', FEDEX: 'fedex', DHL: 'dhl-express' };

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const timestamp = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  console.log(`\n========================================`);
  console.log(` Garment ERP — Delivery Check`);
  console.log(` ${timestamp} (Beijing)`);
  console.log(`========================================`);

  const apiKey = process.env.AFTERSHIP_API_KEY;
  if (!apiKey) {
    console.error('ERROR: AFTERSHIP_API_KEY is not set. Aborting.');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const db = new Client({ connectionString: dbUrl });
  await db.connect();

  try {
    // Find all SENT packages with trackable courier + tracking number
    const { rows: packages } = await db.query(`
      SELECT p.id, p.tracking_no, p.courier, c.name AS customer_name
      FROM packages p
      JOIN customers c ON c.id = p.customer_id
      WHERE p.status = 'SENT'
        AND p.courier IS NOT NULL
        AND p.courier NOT IN ('HAND_CARRY', 'OTHER')
        AND p.tracking_no IS NOT NULL
        AND p.tracking_no != ''
      ORDER BY p.date_sent ASC
    `);

    if (packages.length === 0) {
      console.log('No SENT packages with trackable couriers. Nothing to do.\n');
      return;
    }

    console.log(`Checking ${packages.length} package(s)…\n`);

    const headers = {
      'as-api-key':   apiKey,
      'Content-Type': 'application/json',
    };

    let updatedCount = 0;
    let errorCount   = 0;

    for (const pkg of packages) {
      const slug  = COURIER_SLUGS[pkg.courier];
      const label = `${pkg.customer_name} — ${pkg.courier} ${pkg.tracking_no}`;

      if (!slug) {
        console.log(`  [SKIP]         ${label}`);
        continue;
      }

      try {
        // Try to GET existing tracking record
        let res = await fetch(
          `${AFTERSHIP_BASE}/trackings/${slug}/${encodeURIComponent(pkg.tracking_no)}`,
          { headers }
        );

        // Register with AfterShip if not yet tracked
        if (res.status === 404) {
          const createRes = await fetch(`${AFTERSHIP_BASE}/trackings`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ tracking: { tracking_number: pkg.tracking_no, slug } }),
          });
          if (!createRes.ok) {
            const body = await createRes.json().catch(() => ({}));
            throw new Error(`Register failed (${createRes.status}): ${body?.meta?.message || ''}`);
          }
          // Re-fetch after registration
          res = await fetch(
            `${AFTERSHIP_BASE}/trackings/${slug}/${encodeURIComponent(pkg.tracking_no)}`,
            { headers }
          );
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(`${res.status}: ${body?.meta?.message || 'AfterShip error'}`);
        }

        const data       = await res.json();
        const tracking   = data?.data?.tracking;
        const tag        = tracking?.tag || 'Unknown';
        const checkpoints = tracking?.checkpoints || [];
        const last       = checkpoints.at(-1);
        const detail     = last
          ? ` (${[last.location, last.message].filter(Boolean).join(' — ')})`
          : '';

        if (tag === 'Delivered') {
          await db.query(
            `UPDATE packages SET status = 'RECEIVED', updated_at = NOW() WHERE id = $1`,
            [pkg.id]
          );
          console.log(`  ✓ RECEIVED     ${label}${detail}`);
          updatedCount++;
        } else {
          const tagPad = tag.padEnd(13);
          console.log(`  · ${tagPad}  ${label}${detail}`);
        }
      } catch (err) {
        console.error(`  ✗ ERROR        ${label}: ${err.message}`);
        errorCount++;
      }

      // Respect AfterShip rate limits (300ms between requests)
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n────────────────────────────────────────`);
    console.log(` Updated: ${updatedCount}  |  Errors: ${errorCount}  |  Total: ${packages.length}`);
    console.log(`────────────────────────────────────────\n`);
  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
