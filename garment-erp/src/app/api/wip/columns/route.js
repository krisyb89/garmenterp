// src/app/api/wip/columns/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const scope = body.scope;
  const key = (body.key || '').trim();
  const label = (body.label || '').trim();
  if (!scope || !['SRS', 'PO'].includes(scope)) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  if (!key || !label) return NextResponse.json({ error: 'key and label are required' }, { status: 400 });

  try {
    const col = await prisma.wIPColumn.upsert({
      where: { scope_key: { scope, key } },
      update: {
        label,
        dataType: body.dataType || 'text',
        options: body.options || null,
        sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
        isActive: body.isActive !== undefined ? !!body.isActive : true,
      },
      create: {
        scope,
        key,
        label,
        dataType: body.dataType || 'text',
        options: body.options || null,
        sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
      },
    });
    return NextResponse.json(col, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to upsert column' }, { status: 500 });
  }
}
