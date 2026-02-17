// src/app/api/dashboard/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [
      customerCount,
      activeSRS,
      activePOs,
      inProductionCount,
      pendingSamples,
      pendingApprovals,
      pendingShipments,
      overdueInvoices,
    ] = await Promise.all([
      prisma.customer.count({ where: { isActive: true } }),
      prisma.sRS.count({ where: { status: { notIn: ['CANCELLED', 'ON_HOLD', 'ORDER_RECEIVED'] } } }),
      prisma.purchaseOrder.count({ where: { status: { notIn: ['CLOSED', 'CANCELLED'] } } }),
      prisma.productionOrder.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      prisma.sample.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.approvalRecord.count({ where: { status: { in: ['PENDING', 'SUBMITTED'] } } }),
      prisma.shipment.count({ where: { status: { notIn: ['DELIVERED'] } } }),
      prisma.customerInvoice.count({ where: { status: 'OVERDUE' } }),
    ]);

    // Recent POs
    const recentPOs = await prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, code: true } } },
    });

    // Recent SRS
    const recentSRS = await prisma.sRS.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, code: true } } },
    });

    return NextResponse.json({
      stats: {
        customerCount,
        activeSRS,
        activePOs,
        inProductionCount,
        pendingSamples,
        pendingApprovals,
        pendingShipments,
        overdueInvoices,
      },
      recentPOs,
      recentSRS,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
