// src/app/api/materials/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search') || '';

    const where = { isActive: true };
    if (category) where.category = { name: category };
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { content: { contains: search } },
        { composition: { contains: search } },
      ];
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        category: { select: { name: true } },
        suppliers: { include: { supplier: { select: { name: true, code: true } } } },
      },
    });
    return NextResponse.json({ materials });
  } catch (err) {
    console.error('[GET /api/materials] error:', err);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.code || !body.name || !body.categoryId) {
    return NextResponse.json({ error: 'Code, name, and category are required' }, { status: 400 });
  }

  try {
    // Strip supplier fields before creating material
    const { supplierId, supplierPrice, supplierCurrency, ...materialData } = body;

    // Compute pricePerMeter for FABRIC when possible
    const material = await prisma.material.create({
      data: {
        ...materialData,
        pricePerMeter: computePricePerMeter(body),
      },
    });

    // Link to supplier via MaterialSupplier junction table
    if (supplierId) {
      await prisma.materialSupplier.create({
        data: {
          materialId: material.id,
          supplierId,
          unitPrice: supplierPrice ?? materialData.pricePerUnit ?? 0,
          currency: supplierCurrency || 'CNY',
          isPreferred: true,
        },
      });
    }

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Code already exists' }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}

function computePricePerMeter(body) {
  const price = body.pricePerUnit;
  if (price === undefined || price === null || price === '') return null;
  const unit = body.unit || 'METER';

  // Meter
  if (unit === 'METER') return price;

  // Yard → meter
  if (unit === 'YARD') return price / 0.9144;

  // KG → meter (requires widthMeters & gsm)
  if (unit === 'KG') {
    const widthMeters = body.widthMeters;
    const gsm = body.gsm;
    if (!widthMeters || !gsm) return null;

    // kg per meter length = (gsm * widthMeters) / 1000
    const kgPerMeter = (Number(gsm) * Number(widthMeters)) / 1000;
    if (kgPerMeter <= 0) return null;
    return price * kgPerMeter;
  }

  // PCS or unknown
  return null;
}
