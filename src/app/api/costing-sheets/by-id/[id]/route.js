import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: 按 ID 获取 costing sheet
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const costingSheet = await prisma.costingSheet.findUnique({
      where: { id },
      include: {
        srs: {
          select: {
            id: true,
            srsNo: true,
            styleNo: true,
            customerId: true,
            customer: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        style: {
          select: {
            id: true,
            styleNo: true,
            description: true,
            customerId: true,
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

    if (!costingSheet) {
      return NextResponse.json({ error: 'Costing sheet not found' }, { status: 404 });
    }

    return NextResponse.json(costingSheet);
  } catch (error) {
    console.error('[costing-sheets/by-id:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: 更新 costing sheet
export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Check if costing sheet exists
    const existing = await prisma.costingSheet.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Costing sheet not found' }, { status: 404 });
    }

    // Build update data
    const data = {};
    
    // Version info
    if (body.revisionNo !== undefined) data.revisionNo = parseInt(body.revisionNo) || 1;
    if (body.versionLabel !== undefined) data.versionLabel = body.versionLabel || null;
    
    // Currency settings
    if (body.localCurrency !== undefined) data.localCurrency = body.localCurrency || 'CNY';
    if (body.quoteCurrency !== undefined) data.quoteCurrency = body.quoteCurrency || 'USD';
    if (body.exchangeRate !== undefined) data.exchangeRate = parseFloat(body.exchangeRate) || 1;
    if (body.pricingBasis !== undefined) data.pricingBasis = body.pricingBasis || 'FOB';
    
    // Cost details (JSON arrays)
    if (body.fabricDetails !== undefined) data.fabricDetails = body.fabricDetails;
    if (body.trimDetails !== undefined) data.trimDetails = body.trimDetails;
    if (body.laborDetails !== undefined) data.laborDetails = body.laborDetails;
    if (body.packingDetails !== undefined) data.packingDetails = body.packingDetails;
    if (body.misDetails !== undefined) data.misDetails = body.misDetails;
    if (body.freightDetails !== undefined) data.freightDetails = body.freightDetails;
    if (body.dutyDetails !== undefined) data.dutyDetails = body.dutyDetails;
    
    // Segment costs
    if (body.fabricCost !== undefined) data.fabricCost = parseFloat(body.fabricCost) || 0;
    if (body.trimCost !== undefined) data.trimCost = parseFloat(body.trimCost) || 0;
    if (body.laborCost !== undefined) data.laborCost = parseFloat(body.laborCost) || 0;
    if (body.packingCost !== undefined) data.packingCost = parseFloat(body.packingCost) || 0;
    if (body.misCost !== undefined) data.misCost = parseFloat(body.misCost) || 0;
    if (body.freightCost !== undefined) data.freightCost = parseFloat(body.freightCost) || 0;
    if (body.dutyCost !== undefined) data.dutyCost = parseFloat(body.dutyCost) || 0;
    
    // Totals
    if (body.totalCostLocal !== undefined) data.totalCostLocal = parseFloat(body.totalCostLocal) || 0;
    if (body.totalCostQuoted !== undefined) data.totalCostQuoted = parseFloat(body.totalCostQuoted) || 0;
    if (body.agentCommPercent !== undefined) data.agentCommPercent = parseFloat(body.agentCommPercent) || 0;
    if (body.agentCommAmount !== undefined) data.agentCommAmount = parseFloat(body.agentCommAmount) || 0;
    if (body.targetMarginPercent !== undefined) data.targetMarginPercent = parseFloat(body.targetMarginPercent) || 0;
    if (body.sellingPrice !== undefined) data.sellingPrice = parseFloat(body.sellingPrice) || 0;
    if (body.actualQuotedPrice !== undefined) data.actualQuotedPrice = body.actualQuotedPrice ? parseFloat(body.actualQuotedPrice) : null;
    
    // Notes
    if (body.notes !== undefined) data.notes = body.notes || null;

    const costingSheet = await prisma.costingSheet.update({
      where: { id },
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

    return NextResponse.json(costingSheet);
  } catch (error) {
    console.error('[costing-sheets/by-id:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 删除 costing sheet
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin can delete
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id } = params;

    // Check if costing sheet exists
    const existing = await prisma.costingSheet.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Costing sheet not found' }, { status: 404 });
    }

    await prisma.costingSheet.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Costing sheet deleted' });
  } catch (error) {
    console.error('[costing-sheets/by-id:DELETE]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
