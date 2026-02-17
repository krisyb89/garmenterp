// src/app/api/approvals/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const styleId = searchParams.get('styleId');
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  const where = {};
  if (styleId) where.styleId = styleId;
  if (type) where.type = type;
  if (status) where.status = status;

  const approvals = await prisma.approvalRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      style: { select: { styleNo: true, customer: { select: { name: true, code: true } } } },
      material: { select: { name: true, code: true } },
    },
  });
  return NextResponse.json({ approvals });
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();

  // Auto-calculate submission number
  const existingApprovals = await prisma.approvalRecord.count({
    where: { styleId: body.styleId, type: body.type, materialId: body.materialId || undefined },
  });

  const approval = await prisma.approvalRecord.create({
    data: {
      styleId: body.styleId,
      materialId: body.materialId,
      type: body.type,
      reference: body.reference,
      supplierName: body.supplierName,
      submissionNo: existingApprovals + 1,
      submitDate: body.submitDate ? new Date(body.submitDate) : null,
      status: body.status || 'PENDING',
      imageUrls: body.imageUrls || null,
      notes: body.notes,
    },
  });
  return NextResponse.json(approval, { status: 201 });
}
