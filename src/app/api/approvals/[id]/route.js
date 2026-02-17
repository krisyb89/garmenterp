// src/app/api/approvals/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const approval = await prisma.approvalRecord.findUnique({
    where: { id },
    include: {
      style: { include: { customer: { select: { name: true, code: true } } } },
      material: { select: { name: true, code: true } },
      poLineItem: { select: { id: true, color: true, po: { select: { id: true, poNo: true } } } },
    },
  });
  if (!approval) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(approval);
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const data = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.submitDate !== undefined) data.submitDate = body.submitDate ? new Date(body.submitDate) : null;
  if (body.approvalDate !== undefined) data.approvalDate = body.approvalDate ? new Date(body.approvalDate) : null;
  if (body.customerComments !== undefined) data.customerComments = body.customerComments;
  if (body.reference !== undefined) data.reference = body.reference;
  if (body.supplierName !== undefined) data.supplierName = body.supplierName;
  if (body.imageUrls !== undefined) data.imageUrls = body.imageUrls;
  if (body.notes !== undefined) data.notes = body.notes;

  const approval = await prisma.approvalRecord.update({
    where: { id },
    data,
    include: { style: { select: { styleNo: true } } },
  });
  return NextResponse.json(approval);
}
