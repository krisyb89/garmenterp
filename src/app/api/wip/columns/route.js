// src/app/api/wip/columns/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope');
  const where = scope ? { scope } : {};
  const cols = await prisma.wIPColumn.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ columns: cols });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Column configuration is an admin-only action.
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const scope = body.scope;
  const key = (body.key || '').trim();
  const label = (body.label || '').trim();
  if (!scope || !['SRS', 'PO', 'PRODUCTION'].includes(scope)) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  if (!key || !label) return NextResponse.json({ error: 'key and label are required' }, { status: 400 });

  try {
    const col = await prisma.wIPColumn.upsert({
      where: { scope_key: { scope, key } },
      update: {
        label,
        kind: body.kind || undefined,
        groupName: body.groupName || null,
        approvalType: body.approvalType || null,
        approvalSlot: body.approvalSlot || null,
        sampleStage: body.sampleStage || null,
        dataType: body.dataType || 'text',
        options: body.options || null,
        sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
        isActive: body.isActive !== undefined ? !!body.isActive : true,
      },
      create: {
        scope,
        key,
        label,
        kind: body.kind || 'FIELD',
        groupName: body.groupName || null,
        approvalType: body.approvalType || null,
        approvalSlot: body.approvalSlot || null,
        sampleStage: body.sampleStage || null,
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

// Bulk update (reorder, rename, toggle) — expects { scope, columns: [{id,...fields}] }
export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const scope = body.scope;
  const cols = Array.isArray(body.columns) ? body.columns : [];
  if (!scope || !['SRS', 'PO', 'PRODUCTION'].includes(scope)) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });

  try {
    await prisma.$transaction(
      cols.map((c) =>
        prisma.wIPColumn.update({
          where: { id: c.id },
          data: {
            label: typeof c.label === 'string' ? c.label : undefined,
            sortOrder: Number.isFinite(c.sortOrder) ? c.sortOrder : undefined,
            isActive: c.isActive !== undefined ? !!c.isActive : undefined,
            kind: typeof c.kind === 'string' ? c.kind : undefined,
            groupName: c.groupName === undefined ? undefined : (c.groupName || null),
            approvalType: c.approvalType === undefined ? undefined : (c.approvalType || null),
            approvalSlot: c.approvalSlot === undefined ? undefined : (c.approvalSlot || null),
            sampleStage: c.sampleStage === undefined ? undefined : (c.sampleStage || null),
          },
        })
      )
    );

    const updated = await prisma.wIPColumn.findMany({ where: { scope }, orderBy: [{ sortOrder: 'asc' }] });
    return NextResponse.json({ columns: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update columns' }, { status: 500 });
  }
}
