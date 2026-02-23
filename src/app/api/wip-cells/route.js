// src/app/api/wip-cells/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/wip-cells?poLineItemId=xxx  — fetch all WIP cells for a PO line
// GET /api/wip-cells?poId=xxx          — fetch all WIP cells for an entire PO
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const poLineItemId = searchParams.get('poLineItemId');
  const poId         = searchParams.get('poId');

  const where = {};
  if (poLineItemId) {
    where.poLineItemId = poLineItemId;
  } else if (poId) {
    where.poLineItem = { poId };
  } else {
    return NextResponse.json({ error: 'poLineItemId or poId required' }, { status: 400 });
  }

  const cells = await prisma.wIPCell.findMany({
    where,
    orderBy: [{ segment: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      poLineItem: {
        include: {
          po:    { select: { id: true, poNo: true } },
          style: { select: { id: true, styleNo: true } },
        },
      },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });
  return NextResponse.json({ cells });
}

// POST /api/wip-cells — create a new WIP cell
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.poLineItemId) return NextResponse.json({ error: 'poLineItemId is required' }, { status: 400 });
  if (!body.segment)      return NextResponse.json({ error: 'segment is required' }, { status: 400 });
  if (!body.approvalType) return NextResponse.json({ error: 'approvalType is required' }, { status: 400 });
  if (!body.label)        return NextResponse.json({ error: 'label is required' }, { status: 400 });

  // Check for duplicate
  const existing = await prisma.wIPCell.findUnique({
    where: { poLineItemId_approvalType_label: {
      poLineItemId: body.poLineItemId,
      approvalType: body.approvalType,
      label:        body.label,
    }},
  });
  if (existing) return NextResponse.json({ error: 'This WIP cell already exists' }, { status: 409 });

  const cell = await prisma.wIPCell.create({
    data: {
      poLineItemId: body.poLineItemId,
      segment:      body.segment,
      approvalType: body.approvalType,
      label:        body.label,
      status:       body.status    || 'PENDING',
      sortOrder:    body.sortOrder ?? 0,
    },
    include: {
      poLineItem: {
        include: {
          po:    { select: { id: true, poNo: true } },
          style: { select: { id: true, styleNo: true } },
        },
      },
      comments: true,
    },
  });
  return NextResponse.json(cell, { status: 201 });
}
