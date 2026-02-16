// src/app/api/customers/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = search
      ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ]}
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { purchaseOrders: true, srsList: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({ customers, total, page, limit });
  } catch (error) {
    console.error('Customers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, code, contactPerson, email, phone, address, country, currency, paymentTermDays, paymentTermBasis, notes } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'Customer code already exists' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name, code: code.toUpperCase(), contactPerson, email, phone,
        address, country, currency: currency || 'USD',
        paymentTermDays: paymentTermDays || 60,
        paymentTermBasis: paymentTermBasis || 'ROG',
        notes,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Customer POST error:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
