import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/costing-sheets/[srsId]/version
// Duplicates the latest version, increments revisionNo, returns { costing: newVersion, versions: allVersions }
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { srsId } = params;
    const body = await request.json().catch(() => ({}));

    // Find the source version — either a specific one (body.sourceId) or the latest
    const source = body.sourceId
      ? await prisma.costingSheet.findUnique({ where: { id: body.sourceId } })
      : await prisma.costingSheet.findFirst({ where: { srsId }, orderBy: { revisionNo: 'desc' } });

    if (!source) return NextResponse.json({ error: 'No costing sheet to duplicate' }, { status: 404 });

    // Strip DB-managed fields and create the new version
    const { id, createdAt, updatedAt, revisionNo, versionLabel, ...copyFields } = source;

    const newVersion = await prisma.costingSheet.create({
      data: {
        ...copyFields,
        srsId,
        revisionNo: revisionNo + 1,
        versionLabel: body.versionLabel || null,
      },
    });

    // Return all versions (newest first) so the UI can refresh the version list
    const versions = await prisma.costingSheet.findMany({
      where: { srsId },
      orderBy: { revisionNo: 'desc' },
    });

    return NextResponse.json({ costing: newVersion, versions });

  } catch (error) {
    console.error('[version:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
