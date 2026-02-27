// src/app/api/srs/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const srs = await prisma.sRS.findUnique({
      where: { id },
      include: {
        customer: true,
        style: { include: { bomItems: { include: { material: true } }, samples: true } },
        createdBy: { select: { name: true, email: true } },
        costingSheets: { orderBy: { revisionNo: 'desc' }, take: 1 },
      },
    });

    if (!srs) return NextResponse.json({ error: 'SRS not found' }, { status: 404 });
    return NextResponse.json(srs);
  } catch (error) {
    console.error('SRS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch SRS' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch current SRS state
    const current = await prisma.sRS.findUnique({ where: { id } });

    // Check for duplicate SRS# if it's being changed
    if (body.srsNo && body.srsNo !== current.srsNo) {
      const dup = await prisma.sRS.findUnique({ where: { srsNo: body.srsNo } });
      if (dup) return NextResponse.json({ error: `SRS# "${body.srsNo}" is already in use` }, { status: 409 });
    }

    // Track status changes
    if (body.status && body.status !== current.status) {
      await prisma.activityLog.create({
        data: {
          userId: user.userId,
          action: 'STATUS_CHANGE',
          entity: 'SRS',
          entityId: id,
          details: { from: current.status, to: body.status },
        },
      });
    }

    // ── Style promotion ──────────────────────────────────────────
    // When status changes TO ORDER_RECEIVED, find-or-create a Style
    // and link it to this SRS. Subsequent ORDER_RECEIVED saves are
    // no-ops (styleId already set).
    let styleCreated = false;
    let promotedStyle = null;

    const promotingToOrder =
      body.status === 'ORDER_RECEIVED' &&
      current.status !== 'ORDER_RECEIVED';

    if (promotingToOrder && !current.styleId) {
      const styleNo = body.styleNo || current.styleNo;

      if (styleNo) {
        // Try to find an existing Style with this styleNo
        let style = await prisma.style.findUnique({ where: { styleNo } });

        if (!style) {
          // Build notes from fabric/trim specs
          const specParts = [
            (body.fabricSpecs || current.fabricSpecs) && `Fabric: ${body.fabricSpecs || current.fabricSpecs}`,
            (body.trimSpecs   || current.trimSpecs)   && `Trim: ${body.trimSpecs   || current.trimSpecs}`,
          ].filter(Boolean);

          style = await prisma.style.create({
            data: {
              styleNo,
              customerId:   current.customerId,
              customerRef:  current.srsNo,           // trace back to originating SRS
              description:  body.description  || current.description  || null,
              imageUrls:    body.imageUrls    ?? current.imageUrls    ?? null,
              attachments:  body.attachments  ?? current.attachments  ?? null,
              techPackUrl:  body.techPackUrl  || current.techPackUrl  || null,
              notes:        specParts.length ? specParts.join('\n') : null,
            },
          });
          styleCreated = true;
        }

        // Link the SRS to the style
        body.styleId = style.id;
        promotedStyle = style;
      }
    }
    // ─────────────────────────────────────────────────────────────

    const srs = await prisma.sRS.update({
      where: { id },
      data: body,
      include: {
        customer: { select: { name: true } },
        style: { select: { id: true, styleNo: true } },
      },
    });

    return NextResponse.json({ ...srs, _styleCreated: styleCreated });
  } catch (error) {
    console.error('SRS PUT error:', error);
    return NextResponse.json({ error: 'Failed to update SRS' }, { status: 500 });
  }
}
