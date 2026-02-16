// src/app/api/materials/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id },
    include: { suppliers: { include: { supplier: true } }, bomItems: { include: { style: true } } },
  });
  if (!material) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(material);
}

export async function PUT(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const material = await prisma.material.update({ where: { id }, data: body });
  return NextResponse.json(material);
}
