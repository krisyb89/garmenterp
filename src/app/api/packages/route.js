// src/app/api/packages/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status     = searchParams.get('status');
    const tab        = searchParams.get('tab');    // 'pending' | 'complete'
    const search     = searchParams.get('search'); // free-text search

    const where = {};
    if (customerId) where.customerId = customerId;

    // Tab filter takes precedence over status
    if (tab === 'pending') {
      where.status = { in: ['DRAFT', 'SENT'] };
    } else if (tab === 'complete') {
      where.status = { in: ['RECEIVED', 'COMPLETE'] };
    } else if (status) {
      where.status = status;
    }

    // Search: customer name, tracking number, SRS#, style#
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { customer:   { name:      { contains: q } } },
        { trackingNo: { contains: q } },
        { notes:      { contains: q } },
        { items: { some: { srs: { srsNo:    { contains: q } } } } },
        { items: { some: { srs: { styleNo:  { contains: q } } } } },
        {
          items: {
            some: {
              wipCells: {
                some: {
                  wipCell: {
                    poLineItem: {
                      style: { styleNo: { contains: q } },
                    },
                  },
                },
              },
            },
          },
        },
      ];
    }

    const packages = await prisma.package.findMany({
      where,
      orderBy: [
        { dateSent: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        customer:  { select: { name: true, code: true } },
        createdBy: { select: { name: true } },
        items: {
          orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id:             true,
            section:        true,
            approvalType:   true,
            colorPrint:     true,
            description:    true,
            approvalStatus: true,
            srs: {
              select: { srsNo: true, styleNo: true, colorPrint: true },
            },
            wipCells: {
              select: {
                wipCell: {
                  select: {
                    label:     true,
                    segment:   true,
                    poLineItem: {
                      select: {
                        color: true,
                        style: { select: { styleNo: true } },
                        po:    { select: { poNo: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return NextResponse.json({ packages });

  } catch (error) {
    console.error('[packages:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.customerId) return NextResponse.json({ error: 'customerId is required' }, { status: 400 });

    const pkg = await prisma.package.create({
      data: {
        customerId:  body.customerId,
        courier:     body.courier     || null,
        trackingNo:  body.trackingNo  || null,
        dateSent:    body.dateSent    ? new Date(body.dateSent)   : null,
        inHandDate:  body.inHandDate  ? new Date(body.inHandDate) : null,
        status:      body.status      || 'DRAFT',
        notes:       body.notes       || null,
        createdById: user.userId,
      },
      include: { customer: { select: { name: true } } },
    });
    return NextResponse.json(pkg, { status: 201 });

  } catch (error) {
    console.error('[packages:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
