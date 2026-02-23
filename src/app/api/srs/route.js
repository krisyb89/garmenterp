// src/app/api/srs/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        { styleNo: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { colorPrint: { contains: search, mode: 'insensitive' } },
      ];
    }

    const raw = await prisma.sRS.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, code: true } },
        style: { select: { styleNo: true } },
        createdBy: { select: { name: true } },
        costingSheets: {
          orderBy: { revisionNo: 'desc' },
          take: 1,
          select: { id: true, sellingPrice: true, totalCostQuoted: true, actualQuotedPrice: true, quoteCurrency: true },
        },
      },
    });

    // Map costingSheets[0] → costingSheet for UI backward-compat; also expose imageUrls
    const srsList = raw.map(s => ({
      ...s,
      costingSheet: s.costingSheets[0] || null,
    }));

    return NextResponse.json({ srsList });
  } catch (error) {
    console.error('SRS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch SRS list' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (!body.customerId || !body.styleNo) {
      return NextResponse.json({ error: 'customerId and styleNo are required' }, { status: 400 });
    }

    // Auto-generate SRS number
    const count = await prisma.sRS.count();
    const year = new Date().getFullYear();
    const srsNo = `SRS-${year}-${String(count + 1).padStart(4, '0')}`;

    const srs = await prisma.sRS.create({
      data: {
        srsNo,
        customerId: body.customerId,
        createdById: user.userId,
        styleNo: body.styleNo,
        brand: body.brand || null,
        colorPrint: body.colorPrint || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        description: body.description,
        techPackUrl: body.techPackUrl,
        imageUrls: body.imageUrls && body.imageUrls.length > 0 ? body.imageUrls : undefined,
        attachments: body.attachments && body.attachments.length > 0 ? body.attachments : undefined,
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
    await prisma.costingSheet.create({ data: { srsId: srs.id } });

    return NextResponse.json(srs, { status: 201 });
  } catch (error) {
    console.error('SRS POST error:', error);
    return NextResponse.json({ error: 'Failed to create SRS' }, { status: 500 });
  }
}
