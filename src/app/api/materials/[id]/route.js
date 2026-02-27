// src/app/api/materials/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        category: true,
        suppliers: { include: { supplier: true } },
        bomItems: { include: { style: true } },
      },
    });
    if (!material) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(material);

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
    const material = await prisma.material.update({
      where: { id },
      data: {
        ...body,
        pricePerMeter: computePricePerMeter(body),
      },
    });
    return NextResponse.json(material);

  } catch (error) {
    console.error('[[id]:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function computePricePerMeter(body) {
  const price = body.pricePerUnit;
  if (price === undefined || price === null || price === '') return undefined;
  const unit = body.unit || 'METER';
  if (unit === 'METER') return price;
  if (unit === 'YARD') return price / 0.9144;
  if (unit === 'KG') {
    const widthMeters = body.widthMeters;
    const gsm = body.gsm;
    if (!widthMeters || !gsm) return null;
    const kgPerMeter = (Number(gsm) * Number(widthMeters)) / 1000;
    if (kgPerMeter <= 0) return null;
    return price * kgPerMeter;
  }
  return null;
}
