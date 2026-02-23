// src/app/api/packages/[id]/items/[itemId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Statuses that count as "outcome received" (not still pending)
const PENDING_STATUSES = new Set(['PENDING', 'SUBMITTED']);

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { itemId } = await params;
  const body = await request.json();

  // Load current item with WIP cell links and package reference
  const current = await prisma.packageItem.findUnique({
    where: { id: itemId },
    include: { wipCells: { select: { wipCellId: true } } },
  });
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = {};
  if (body.approvalType  !== undefined) data.approvalType  = body.approvalType  || null;
  if (body.srsId         !== undefined) data.srsId         = body.srsId         || null;
  if (body.colorPrint    !== undefined) data.colorPrint    = body.colorPrint    || null;
  if (body.description   !== undefined) data.description   = body.description   || null;
  if (body.sortOrder     !== undefined) data.sortOrder     = body.sortOrder;
  if (body.approvalStatus !== undefined) data.approvalStatus = body.approvalStatus;
  // Comments: always update the item field (shows latest comment)
  if (body.comments !== undefined) data.comments = body.comments || null;

  const updatedItem = await prisma.packageItem.update({ where: { id: itemId }, data });

  const wipCellIds = current.wipCells.map(w => w.wipCellId);

  // ── WIP cell status update ─────────────────────────────────────────────
  if (body.approvalStatus !== undefined && wipCellIds.length > 0) {
    await prisma.wIPCell.updateMany({
      where: { id: { in: wipCellIds } },
      data:  { status: body.approvalStatus },
    });
  }

  // ── Append WIPComment (comments always append, never replace) ──────────
  const commentText = body.comments?.trim();
  if (commentText && wipCellIds.length > 0) {
    await prisma.wIPComment.createMany({
      data: wipCellIds.map(wipCellId => ({
        wipCellId,
        packageItemId:  itemId,
        approvalStatus: updatedItem.approvalStatus,
        text:           commentText,
        createdById:    user.userId,
      })),
    });
  }

  // ── WIP cell re-linking (if wipCellIds changed) ────────────────────────
  if (Array.isArray(body.wipCellIds)) {
    // Remove old links not in new list
    await prisma.packageItemWIPCell.deleteMany({
      where: { packageItemId: itemId, wipCellId: { notIn: body.wipCellIds } },
    });
    // Add new links
    if (body.wipCellIds.length > 0) {
      await prisma.packageItemWIPCell.createMany({
        data: body.wipCellIds.map(wipCellId => ({ packageItemId: itemId, wipCellId })),
        skipDuplicates: true,
      });
    }
  }

  // ── Auto-complete: if all APPROVAL + SRS items have an outcome, mark COMPLETE ──
  if (body.approvalStatus !== undefined) {
    const packageId = current.packageId;
    const pkg = await prisma.package.findUnique({ where: { id: packageId } });

    // Only auto-complete if the package is SENT or RECEIVED (not DRAFT or already COMPLETE)
    if (pkg && (pkg.status === 'SENT' || pkg.status === 'RECEIVED')) {
      const allTrackableItems = await prisma.packageItem.findMany({
        where: { packageId, section: { in: ['APPROVAL', 'SRS'] } },
        select: { approvalStatus: true },
      });

      // Auto-complete only if there's at least one trackable item and all have outcomes
      if (allTrackableItems.length > 0 &&
          allTrackableItems.every(i => !PENDING_STATUSES.has(i.approvalStatus))) {
        await prisma.package.update({
          where: { id: packageId },
          data:  { status: 'COMPLETE' },
        });
      }
    }
  }

  // Return updated item with relations
  const full = await prisma.packageItem.findUnique({
    where: { id: itemId },
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
              comments: { orderBy: { createdAt: 'asc' } },
            },
          },
        },
      },
    },
  });
  return NextResponse.json(full);
}

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { itemId } = await params;
  await prisma.packageItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
