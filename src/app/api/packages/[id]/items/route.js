// src/app/api/packages/[id]/items/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: packageId } = await params;
  const body = await request.json();

  if (!body.section) return NextResponse.json({ error: 'section is required' }, { status: 400 });

  // Create the item
  const item = await prisma.packageItem.create({
    data: {
      packageId,
      section:       body.section,
      approvalType:  body.approvalType  || null,
      srsId:         body.srsId         || null,
      colorPrint:    body.colorPrint    || null,
      description:   body.description   || null,
      approvalStatus: 'PENDING',
      sortOrder:     body.sortOrder     ?? 0,
    },
  });

  // Section 1 (APPROVAL): link to WIPCells via explicit ids OR find-or-create specs
  if (body.section === 'APPROVAL') {
    let wipCellIds = Array.isArray(body.wipCellIds) ? [...body.wipCellIds] : [];

    // Find-or-create: [{poLineItemId, approvalType, label, segment}]
    if (Array.isArray(body.wipCellSpecs) && body.wipCellSpecs.length > 0) {
      for (const spec of body.wipCellSpecs) {
        const cell = await prisma.wIPCell.upsert({
          where: { poLineItemId_approvalType_label: {
            poLineItemId: spec.poLineItemId,
            approvalType: spec.approvalType,
            label:        spec.label,
          }},
          create: {
            poLineItemId: spec.poLineItemId,
            approvalType: spec.approvalType,
            segment:      spec.segment,
            label:        spec.label,
            status:       'PENDING',
            sortOrder:    spec.sortOrder ?? 0,
          },
          update: {},
        });
        wipCellIds.push(cell.id);
      }
    }
    if (wipCellIds.length > 0) {
      await prisma.packageItemWIPCell.createMany({
        data: wipCellIds.map(wipCellId => ({ packageItemId: item.id, wipCellId })),
        skipDuplicates: true,
      });
    }
  }

  // Return item with all relations
  const full = await prisma.packageItem.findUnique({
    where: { id: item.id },
    include: {
      srs: { select: { id: true, srsNo: true, styleNo: true, colorPrint: true } },
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
            },
          },
        },
      },
    },
  });
  return NextResponse.json(full, { status: 201 });
}
