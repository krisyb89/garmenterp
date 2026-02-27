import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: 列出所有 costing sheets
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const styleId = searchParams.get('styleId');
    const srsId = searchParams.get('srsId');

    const where = {};
    if (styleId) where.styleId = styleId;
    if (srsId) where.srsId = srsId;

    const costingSheets = await prisma.costingSheet.findMany({
      where,
      include: {
        srs: {
          select: {
            id: true,
            srsNo: true,
            styleNo: true,
          },
        },
        style: {
          select: {
            id: true,
            styleNo: true,
            description: true,
            customer: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(costingSheets);
  } catch (error) {
    console.error('[costing-sheets:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 创建新的 Costing Sheet（关联到 Style）
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.styleId) {
      return NextResponse.json({ error: 'Style ID is required' }, { status: 400 });
    }

    // Check if style exists
    const style = await prisma.style.findUnique({
      where: { id: body.styleId },
    });
    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }

    // Build create data
    const data = {
      styleId: body.styleId,
      srsId: body.srsId || null,
      revisionNo: body.revisionNo || 1,
      versionLabel: body.versionLabel || null,
      localCurrency: body.localCurrency || 'CNY',
      quoteCurrency: body.quoteCurrency || 'USD',
      exchangeRate: body.exchangeRate ? parseFloat(body.exchangeRate) : 1,
      pricingBasis: body.pricingBasis || 'FOB',
      notes: body.notes || null,
    };

    const costingSheet = await prisma.costingSheet.create({
      data,
      include: {
        srs: {
          select: {
            id: true,
            srsNo: true,
            styleNo: true,
          },
        },
        style: {
          select: {
            id: true,
            styleNo: true,
            description: true,
            customer: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(costingSheet, { status: 201 });
  } catch (error) {
    console.error('[costing-sheets:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
