// src/app/api/srs/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const search = searchParams.get('search') || '';

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { srsNo: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const srsList = await prisma.sRS.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, code: true } },
        style: { select: { styleNo: true } },
        createdBy: { select: { name: true } },
        costingSheet: { select: { id: true, sellingPrice: true, totalCostPerUnit: true } },
      },
    });

    return NextResponse.json({ srsList });
  } catch (error) {
    console.error('SRS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch SRS list' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();

    // Auto-generate SRS number
    const count = await prisma.sRS.count();
    const year = new Date().getFullYear();
    const srsNo = `SRS-${year}-${String(count + 1).padStart(4, '0')}`;

    const srs = await prisma.sRS.create({
      data: {
        srsNo,
        customerId: body.customerId,
        createdById: user.userId,
        description: body.description,
        techPackUrl: body.techPackUrl,
        imageUrls: body.imageUrls || [],
        attachments: body.attachments || [],
        targetPrice: body.targetPrice,
        targetPriceCurrency: body.targetPriceCurrency || 'USD',
        estimatedQtyMin: body.estimatedQtyMin,
        estimatedQtyMax: body.estimatedQtyMax,
        deliveryWindow: body.deliveryWindow,
        targetMarkets: body.targetMarkets,
        fabricSpecs: body.fabricSpecs,
        trimSpecs: body.trimSpecs,
        notes: body.notes,
        status: 'RECEIVED',
      },
      include: {
        customer: { select: { name: true, code: true } },
      },
    });

    // Auto-create empty costing sheet
    await prisma.costingSheet.create({
      data: { srsId: srs.id },
    });

    return NextResponse.json(srs, { status: 201 });
  } catch (error) {
    console.error('SRS POST error:', error);
    return NextResponse.json({ error: 'Failed to create SRS' }, { status: 500 });
  }
}
