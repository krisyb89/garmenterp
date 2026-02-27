// src/app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';

// GET /api/users/:id — get user detail (admin only)
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const found = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(found);
  } catch (error) {
    console.error('User GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/users/:id — update user (admin only)
export async function PUT(request, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Allow password reset
    if (body.password && body.password.length >= 6) {
      updateData.passwordHash = await hashPassword(body.password);
    }

    // Prevent admin from deactivating themselves
    if (id === currentUser.userId && body.isActive === false) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('User PUT error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
