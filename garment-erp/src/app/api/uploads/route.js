import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_DOC_EXTS = ['.pdf', '.xlsx', '.xls', '.doc', '.docx', '.ai', '.psd'];
const ALLOWED_EXTS = [...ALLOWED_IMAGE_EXTS, ...ALLOWED_DOC_EXTS];

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const formData = await request.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const results = [];

    for (const file of files) {
      if (!file || typeof file === 'string') continue;

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 }
        );
      }

      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        return NextResponse.json(
          { error: `File type "${ext}" is not allowed` },
          { status: 400 }
        );
      }

      const randomHex = crypto.randomBytes(6).toString('hex');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}-${randomHex}-${safeName}`;
      const filePath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      results.push({
        url: `/uploads/${fileName}`,
        originalName: file.name,
        size: file.size,
      });
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
