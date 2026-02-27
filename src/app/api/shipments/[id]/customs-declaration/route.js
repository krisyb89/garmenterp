// src/app/api/shipments/[id]/customs-declaration/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET — list customs declarations for a shipment
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const declarations = await prisma.customsDeclaration.findMany({
      where: { shipmentId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ declarations });
  } catch (error) {
    console.error('[customs-declaration:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — generate a new customs declaration pre-filled from shipment data
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Load shipment with packing lists, cartons, and PO
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        po: {
          include: {
            customer: true,
            lineItems: {
              include: {
                style: {
                  select: {
                    styleNo: true, description: true,
                    cnHsCode: true, usHsCode: true,
                    customsDeclarationElements: true,
                    category: true, construction: true,
                  },
                },
              },
            },
          },
        },
        packingLists: {
          include: {
            cartons: {
              include: {
                poLineItem: {
                  include: {
                    style: {
                      select: {
                        styleNo: true, cnHsCode: true, usHsCode: true,
                        customsDeclarationElements: true, description: true,
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

    if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

    // Aggregate carton data grouped by CN HS code
    const hsGroups = {};
    for (const pl of shipment.packingLists) {
      for (const carton of pl.cartons) {
        const style = carton.poLineItem?.style || {};
        const hsCode = style.cnHsCode || '0000000000';
        if (!hsGroups[hsCode]) {
          hsGroups[hsCode] = {
            hsCode,
            description: style.customsDeclarationElements || style.description || '',
            styleNos: new Set(),
            quantity: 0,
            weightKg: 0,
            totalPrice: 0,
            unitPrice: 0,
          };
        }
        hsGroups[hsCode].styleNos.add(style.styleNo || carton.styleNo);
        hsGroups[hsCode].quantity += carton.totalPcs;
        hsGroups[hsCode].weightKg += Number(carton.netWeight || 0);
      }
    }

    // Calculate unit prices from PO line items
    const poLineItems = shipment.po?.lineItems || [];
    for (const li of poLineItems) {
      const hsCode = li.style?.cnHsCode || '0000000000';
      if (hsGroups[hsCode]) {
        hsGroups[hsCode].unitPrice = Number(li.unitPrice);
      }
    }

    // Build line items array
    const lineItems = Object.values(hsGroups).map((g, idx) => {
      const totalPrice = g.quantity * g.unitPrice;
      return {
        itemNo: idx + 1,
        hsCode: g.hsCode,
        description: g.description,
        styleNos: [...g.styleNos].join(', '),
        quantity: g.quantity,
        unit: '件',
        weightKg: parseFloat(g.weightKg.toFixed(1)),
        destinationCountry: body.destinationCountry || '美国',
        unitPrice: g.unitPrice,
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        currency: 'USD',
        taxType: '照章征税',
      };
    });

    // Sum totals from packing lists
    const totalPackages = shipment.packingLists.reduce((s, pl) => s + (pl.totalCartons || 0), 0);
    const grossWeightKg = shipment.packingLists.reduce((s, pl) => s + Number(pl.totalGrossWeight || 0), 0);
    const netWeightKg = shipment.packingLists.reduce((s, pl) => s + Number(pl.totalNetWeight || 0), 0);

    const declaration = await prisma.customsDeclaration.create({
      data: {
        shipmentId: id,
        consignorName: body.consignorName || null,
        consignorCode: body.consignorCode || null,
        exportPort: body.exportPort || null,
        exportDate: shipment.etd || null,
        productionUnit: body.productionUnit || null,
        productionUnitCode: body.productionUnitCode || null,
        declaringUnit: body.declaringUnit || body.consignorName || null,
        transportMethod: shipment.shipmentMethod === 'AIR' ? '航空运输' : '海运运输',
        transportName: shipment.vesselName || null,
        blNumber: shipment.blNo || null,
        tradeCountry: body.tradeCountry || '美国',
        destinationCountry: body.destinationCountry || '美国',
        destinationPort: shipment.portOfDischarge || null,
        domesticSource: body.domesticSource || null,
        transactionMethod: shipment.shippingTerms || 'FOB',
        freightCost: body.freightCost || (shipment.freightCost ? `¥ ${Number(shipment.freightCost).toFixed(2)}` : null),
        insuranceCost: body.insuranceCost || 'USD0.0000',
        contractNo: body.contractNo || null,
        totalPackages,
        packageType: '纸箱',
        grossWeightKg,
        netWeightKg,
        containerNo: shipment.containerNo || null,
        lineItems,
        declarantName: body.declarantName || null,
        declarantPhone: body.declarantPhone || null,
      },
    });

    return NextResponse.json(declaration, { status: 201 });
  } catch (error) {
    console.error('[customs-declaration:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT — update a customs declaration
export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { declarationId, ...updateData } = body;

    if (!declarationId) {
      return NextResponse.json({ error: 'declarationId required' }, { status: 400 });
    }

    // Convert date strings
    if (updateData.exportDate) updateData.exportDate = new Date(updateData.exportDate);
    if (updateData.declarationDate) updateData.declarationDate = new Date(updateData.declarationDate);

    const updated = await prisma.customsDeclaration.update({
      where: { id: declarationId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[customs-declaration:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
