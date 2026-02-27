// src/app/api/wip-cells/[id]/comments/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/wip-cells/[id]/comments
 * Body: { text, approvalStatus? }
 *
 * Appends a comment to a WIPCell without going through a Package.
 * Also updates the cell's status if approvalStatus is provided.
 */
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // Create comment + optionally update cell status in a transaction
    const ops = [
      prisma.wIPComment.create({
        data: {
          wipCellId:      id,
          text:           body.text.trim(),
          approvalStatus: body.approvalStatus || null,
          createdById:    user.userId || null,
        },
      }),
    ];

    if (body.approvalStatus) {
      ops.push(prisma.wIPCell.update({
        where: { id },
        data:  { status: body.approvalStatus },
      }));
    }

    const [comment] = await prisma.$transaction(ops);
    return NextResponse.json(comment, { status: 201 });

  } catch (error) {
    console.error('[comments:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
