// src/app/api/dashboard/route.js
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { parseWidgetsQuery } from '@/lib/dashboard-widgets';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse widgets query parameter
    const { searchParams } = new URL(request.url);
    const widgetsParam = searchParams.get('widgets');
    const requestedWidgets = parseWidgetsQuery(widgetsParam);

    // If no widgets specified, return all data (backward compatible)
    const includeAll = !requestedWidgets || requestedWidgets.length === 0;

    // Define which widgets need which data
    const needsKpi = (id) => includeAll || requestedWidgets.includes(id);
    const needsList = (id) => includeAll || requestedWidgets.includes(id);

    // Build queries dynamically based on requested widgets
    const queries = [];
    const queryMap = [];

    // KPI queries
    if (needsKpi('customerCount')) {
      queries.push(prisma.customer.count({ where: { isActive: true } }));
      queryMap.push('customerCount');
    }

    if (needsKpi('activeSRS')) {
      queries.push(prisma.sRS.count({ 
        where: { status: { notIn: ['CANCELLED', 'ON_HOLD', 'ORDER_RECEIVED'] } } 
      }));
      queryMap.push('activeSRS');
    }

    if (needsKpi('activePOs')) {
      queries.push(prisma.purchaseOrder.count({ 
        where: { status: { notIn: ['CLOSED', 'CANCELLED'] } } 
      }));
      queryMap.push('activePOs');
    }

    if (needsKpi('inProductionCount')) {
      queries.push(prisma.productionOrder.count({ 
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } 
      }));
      queryMap.push('inProductionCount');
    }

    if (needsKpi('pendingApprovals')) {
      // Changed from approval to wIPCell as per requirements
      queries.push(prisma.wIPCell.count({ 
        where: { status: { in: ['PENDING', 'SUBMITTED'] } } 
      }));
      queryMap.push('pendingApprovals');
    }

    if (needsKpi('pendingShipments')) {
      queries.push(prisma.shipment.count({ 
        where: { status: { notIn: ['DELIVERED'] } } 
      }));
      queryMap.push('pendingShipments');
    }

    if (needsKpi('overdueInvoices')) {
      queries.push(prisma.customerInvoice.count({ 
        where: { status: 'OVERDUE' } 
      }));
      queryMap.push('overdueInvoices');
    }

    // List queries
    if (needsList('recentPOs')) {
      queries.push(prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          poNo: true,
          status: true,
          totalQty: true,
          customer: { select: { name: true } },
        },
      }));
      queryMap.push('recentPOs');
    }

    if (needsList('recentSRS')) {
      queries.push(prisma.sRS.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          srsNo: true,
          styleNo: true,
          status: true,
          customer: { select: { name: true } },
        },
      }));
      queryMap.push('recentSRS');
    }

    if (needsList('pendingWIP')) {
      queries.push(prisma.wIPCell.findMany({
        take: 5,
        where: { status: { in: ['PENDING', 'SUBMITTED'] } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          cellName: true,
          operation: true,
          status: true,
          srsId: true,
          srs: { select: { styleNo: true } },
        },
      }));
      queryMap.push('pendingWIP');
    }

    if (needsList('activeProduction')) {
      queries.push(prisma.productionOrder.findMany({
        take: 5,
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          poNo: true,
          status: true,
          srs: { select: { styleNo: true } },
        },
      }));
      queryMap.push('activeProduction');
    }

    if (needsList('recentShipments')) {
      queries.push(prisma.shipment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shipmentNo: true,
          bookingNo: true,
          status: true,
          destination: true,
        },
      }));
      queryMap.push('recentShipments');
    }

    // Execute all queries
    const results = await Promise.all(queries);

    // Build response object
    const response = {
      stats: {},
    };

    // Map results to response
    queryMap.forEach((key, index) => {
      const result = results[index];
      
      // KPI widgets go into stats
      if (['customerCount', 'activeSRS', 'activePOs', 'inProductionCount', 
           'pendingApprovals', 'pendingShipments', 'overdueInvoices'].includes(key)) {
        response.stats[key] = result;
      } else {
        // List widgets go to root level
        response[key] = result;
      }
    });

    // For backward compatibility, ensure all expected fields exist
    if (includeAll) {
      response.recentPOs = response.recentPOs || [];
      response.recentSRS = response.recentSRS || [];
    }

    // Transform activeProduction to include styleNo at root level
    if (response.activeProduction) {
      response.activeProduction = response.activeProduction.map(po => ({
        ...po,
        styleNo: po.srs?.styleNo,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard', details: error.message },
      { status: 500 }
    );
  }
}

