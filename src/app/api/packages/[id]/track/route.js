// src/app/api/packages/[id]/track/route.js
// Checks carrier delivery status via AfterShip API (2023-10 / asat_ key format).
// Requires AFTERSHIP_API_KEY in your .env.
// Free tier: 100 trackings/month — https://www.aftership.com
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const AFTERSHIP_BASE = 'https://api.aftership.com/tracking/2023-10';

// AfterShip carrier slugs for supported couriers
const COURIER_SLUGS = {
  UPS:   'ups',
  FEDEX: 'fedex',
  DHL:   'dhl-express',
};

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!pkg.courier || !pkg.trackingNo) {
    return NextResponse.json({
      status:  'NO_TRACKING',
      message: 'No courier or tracking number set on this package.',
    });
  }

  const slug = COURIER_SLUGS[pkg.courier];
  if (!slug) {
    return NextResponse.json({
      status:  'UNSUPPORTED_COURIER',
      message: `Auto-tracking is not supported for ${pkg.courier}. Supported: UPS, FEDEX, DHL.`,
    });
  }

  const apiKey = process.env.AFTERSHIP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      status:  'NO_API_KEY',
      message: 'AfterShip API key not configured. Add AFTERSHIP_API_KEY to your .env file.',
    });
  }

  const headers = {
    'as-api-key':   apiKey,       // new AfterShip header (asat_ keys)
    'Content-Type': 'application/json',
  };

  try {
    // Try to GET existing tracking first
    let trackRes = await fetch(
      `${AFTERSHIP_BASE}/trackings/${slug}/${encodeURIComponent(pkg.trackingNo)}`,
      { headers }
    );

    // If 404, create the tracking in AfterShip, then re-fetch
    if (trackRes.status === 404) {
      await fetch(`${AFTERSHIP_BASE}/trackings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tracking: { tracking_number: pkg.trackingNo, slug },
        }),
      });
      // Re-fetch after creation (newly created trackings start as Pending)
      trackRes = await fetch(
        `${AFTERSHIP_BASE}/trackings/${slug}/${encodeURIComponent(pkg.trackingNo)}`,
        { headers }
      );
    }

    if (!trackRes.ok) {
      const err = await trackRes.json().catch(() => ({}));
      return NextResponse.json({
        status:  'API_ERROR',
        message: err?.meta?.message || err?.message || `AfterShip error (${trackRes.status})`,
      }, { status: 502 });
    }

    const data     = await trackRes.json();
    const tracking = data?.data?.tracking;
    const tag      = tracking?.tag;  // Delivered, InTransit, OutForDelivery, AttemptFail…
    const checkpoints = tracking?.checkpoints || [];
    const last     = checkpoints.at(-1);

    // Auto-update package to RECEIVED if carrier confirms delivery
    let autoUpdated = false;
    if (tag === 'Delivered' && pkg.status === 'SENT') {
      await prisma.package.update({
        where: { id },
        data:  { status: 'RECEIVED' },
      });
      autoUpdated = true;
    }

    return NextResponse.json({
      status:        'OK',
      tag,
      lastUpdate:    last?.checkpoint_time || null,
      lastLocation:  last?.location        || null,
      lastMessage:   last?.message         || null,
      autoUpdated,
      packageStatus: autoUpdated ? 'RECEIVED' : pkg.status,
    });
  } catch (err) {
    console.error('[track] AfterShip error:', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}
