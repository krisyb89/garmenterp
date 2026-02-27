// src/app/api/pnl/summary/route.js
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPeriodPnL } from '@/lib/pnl';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period    = searchParams.get('period') || 'MONTHLY';   // MONTHLY, QUARTERLY, ANNUAL
  const startDate = searchParams.get('startDate') || null;
  const endDate   = searchParams.get('endDate')   || null;

  try {
    const result = await getPeriodPnL({ period, startDate, endDate });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/pnl/summary] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to load P&L summary' },
      { status: 500 }
    );
  }
}
