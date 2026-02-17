// src/app/api/packing-lists/[id]/cartons/[cartonId]/lines/route.js
// NOTE: The Carton model uses a JSON sizeBreakdown field rather than separate CartonLine records.
// This route is kept as a placeholder. Use the cartons endpoint and sizeBreakdown JSON instead.
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    message: 'Carton size data is stored in the sizeBreakdown JSON field on the Carton model. Use the carton endpoint instead.',
  });
}
