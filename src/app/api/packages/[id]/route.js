// src/app/api/packages/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        customer:  { select: { id: true, name: true, code: true } },
        createdBy: { select: { name: true } },
        items: {
          orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            srs: { select: { id: true, srsNo: true, styleNo: true, colorPrint: true, status: true } },
            wipCells: {
              include: {
                wipCell: {
                  include: {
                    poLineItem: {
                      include: {
                        po:    { select: { id: true, poNo: true } },
                        style: { select: { id: true, styleNo: true } },
                      },
                    },
                    comments: { orderBy: { createdAt: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(pkg);

  } catch (error) {
    console.error('[[id]:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Load current package to detect status transition
    const current = await prisma.package.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            wipCells: { select: { wipCellId: true } },
          },
        },
      },
    });
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = {};
    if (body.courier    !== undefined) data.courier    = body.courier    || null;
    if (body.trackingNo !== undefined) data.trackingNo = body.trackingNo || null;
    if (body.dateSent   !== undefined) data.dateSent   = body.dateSent   ? new Date(body.dateSent)   : null;
    if (body.inHandDate !== undefined) data.inHandDate = body.inHandDate ? new Date(body.inHandDate) : null;
    if (body.notes      !== undefined) data.notes      = body.notes      || null;
    if (body.status     !== undefined) data.status     = body.status;

    // ── SENT transition ────────────────────────────────────────────────────
    const markingSent = body.status === 'SENT' && current.status !== 'SENT';
    if (markingSent) {
      if (!data.dateSent) data.dateSent = new Date();

      // Section 2 (SRS): set each linked SRS to SAMPLE_SENT
      const srsItems = current.items.filter(i => i.section === 'SRS' && i.srsId);
      if (srsItems.length > 0) {
        await prisma.sRS.updateMany({
          where: { id: { in: srsItems.map(i => i.srsId) }, status: { not: 'SAMPLE_SENT' } },
          data: { status: 'SAMPLE_SENT' },
        });
      }

      // Section 1 (APPROVAL): move all linked WIPCells to SUBMITTED
      const wipCellIds = current.items
        .filter(i => i.section === 'APPROVAL')
        .flatMap(i => i.wipCells.map(w => w.wipCellId));
      if (wipCellIds.length > 0) {
        await prisma.wIPCell.updateMany({
          where: { id: { in: wipCellIds }, status: 'PENDING' },
          data:  { status: 'SUBMITTED' },
        });
      }
    }

    const pkg = await prisma.package.update({ where: { id }, data });
    return NextResponse.json(pkg);

  } catch (error) {
    console.error('[[id]:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const current = await prisma.package.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (current.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT packages can be deleted' }, { status: 400 });
    }

    await prisma.package.delete({ where: { id } });
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[[id]:DELETE]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
