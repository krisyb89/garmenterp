// src/app/api/uploads/route.js
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_DOC = ['.pdf', '.xlsx', '.xls', '.doc', '.docx', '.ai', '.psd'];
const ALLOWED = [...ALLOWED_IMAGE, ...ALLOWED_DOC];

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const results = [];

    for (const file of files) {
      if (!file || typeof file === 'string') continue;

      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" exceeds 10MB limit` }, { status: 400 });
      }

      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED.includes(ext)) {
        return NextResponse.json({ error: `File type "${ext}" not allowed` }, { status: 400 });
      }

      const hex = crypto.randomBytes(6).toString('hex');
      const safeName = `${Date.now()}-${hex}${ext}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(uploadDir, safeName);

      await writeFile(filePath, bytes);

      results.push({
        url: `/uploads/${safeName}`,
        originalName: file.name,
        size: file.size,
        isImage: ALLOWED_IMAGE.includes(ext),
      });
    }

    return NextResponse.json(results.length === 1 ? results[0] : results, { status: 201 });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
