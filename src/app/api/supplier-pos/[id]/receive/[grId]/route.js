// src/app/api/supplier-pos/[id]/receive/[grId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, grId } = await params;

    // Verify the GR belongs to this SPO
    const gr = await prisma.goodsReceived.findUnique({
      where: { id: grId },
      select: { supplierPOId: true },
    });
    if (!gr || gr.supplierPOId !== id) {
      return NextResponse.json({ error: 'Goods received record not found' }, { status: 404 });
    }

    // Get the SPO's spoNo to clean up related OrderCost records
    const spo = await prisma.supplierPO.findUnique({
      where: { id },
      select: { spoNo: true },
    });

    // Delete GR items (cascade), the GR itself, and related OrderCosts
    const operations = [
      prisma.goodsReceivedItem.deleteMany({ where: { goodsReceivedId: grId } }),
      prisma.goodsReceived.delete({ where: { id: grId } }),
    ];

    // Also delete OrderCost records that were auto-synced from this SPO
    // (We delete all for this SPO since we can't easily track which GR created which cost)
    if (spo) {
      operations.push(
        prisma.orderCost.deleteMany({ where: { supplierPORef: spo.spoNo } })
      );
    }

    await prisma.$transaction(operations);

    // Recalculate SPO status based on remaining GRs
    const remainingGRs = await prisma.goodsReceived.findMany({
      where: { supplierPOId: id },
      include: { items: true },
    });

    let newStatus;
    if (remainingGRs.length === 0) {
      // No more GRs — revert to ISSUED or ACKNOWLEDGED
      const currentSpo = await prisma.supplierPO.findUnique({
        where: { id },
        select: { status: true },
      });
      newStatus = 'ISSUED';
    } else {
      const totalReceived = remainingGRs.reduce((sum, g) =>
        g.items.reduce((s, i) => s + parseFloat(i.receivedQty), sum), 0);
      const spoDetail = await prisma.supplierPO.findUnique({
        where: { id },
        include: { lineItems: { select: { quantity: true } } },
      });
      const totalOrdered = spoDetail?.lineItems?.reduce(
        (s, li) => s + parseFloat(li.quantity || 0), 0
      ) || 0;
      newStatus = totalOrdered > 0 && totalReceived >= totalOrdered
        ? 'FULLY_RECEIVED'
        : 'PARTIALLY_RECEIVED';
    }

    await prisma.supplierPO.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({ success: true, newStatus });
  } catch (err) {
    console.error('[DELETE /api/supplier-pos/[id]/receive/[grId]] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete goods received record' },
      { status: 500 }
    );
  }
}
