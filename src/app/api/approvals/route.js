// src/app/api/approvals/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const styleId = searchParams.get('styleId');
  const poLineItemId = searchParams.get('poLineItemId');
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const slot = searchParams.get('slot');

  const where = {};
  if (styleId) where.styleId = styleId;
  if (poLineItemId) where.poLineItemId = poLineItemId;
  if (type) where.type = type;
  if (status) where.status = status;
  if (slot) where.slot = slot;

  const approvals = await prisma.approvalRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      style: { select: { styleNo: true, customer: { select: { name: true, code: true } } } },
      material: { select: { name: true, code: true } },
      poLineItem: { select: { id: true, po: { select: { poNo: true } }, color: true } },
    },
  });
  return NextResponse.json({ approvals });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // If caller only provides poLineItemId, derive styleId from the PO line.
  let styleId = body.styleId;
  if (!styleId && body.poLineItemId) {
    const li = await prisma.pOLineItem.findUnique({
      where: { id: body.poLineItemId },
      select: { styleId: true },
    });
    styleId = li?.styleId;
  }
  if (!styleId) {
    return NextResponse.json({ error: 'styleId is required (directly or via poLineItemId)' }, { status: 400 });
  }

  // Validation: FABRIC/TRIM approvals with slot must have materialId
  // This prevents orphaned approvals that can't be reported on
  if ((body.type === 'FABRIC' || body.type === 'TRIM') && body.slot && !body.materialId) {
    return NextResponse.json({
      error: `materialId is required for ${body.type} approvals with slot ${body.slot}`
    }, { status: 400 });
  }

  // Scope key: prefer PO line item when present.
  const scopeWhere = body.poLineItemId
    ? { poLineItemId: body.poLineItemId }
    : { styleId };

  // Auto-calculate submission number
  const existingApprovals = await prisma.approvalRecord.count({
    where: {
      ...scopeWhere,
      type: body.type,
      slot: body.slot || undefined,
      materialId: body.materialId || undefined,
    },
  });

  const approval = await prisma.approvalRecord.create({
    data: {
      styleId,
      poLineItemId: body.poLineItemId || null,
      materialId: body.materialId,
      type: body.type,
      slot: body.slot || null,
      reference: body.reference,
      supplierName: body.supplierName,
      submissionNo: existingApprovals + 1,
      submitDate: body.submitDate ? new Date(body.submitDate) : null,
      status: body.status || 'PENDING',
      notes: body.notes,
    },
  });
  return NextResponse.json(approval, { status: 201 });
}
