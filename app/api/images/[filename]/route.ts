import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getStorageConfig } from '@/app/actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  
  // Security: Only allow simple filenames (no path traversal)
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return new NextResponse('Invalid filename', { status: 400 });
  }
  
  const config = await getStorageConfig();
  
  // If using default path (public/generated), redirect to static file
  if (!config.path) {
    return NextResponse.redirect(new URL(`/generated/${filename}`, request.url));
  }
  
  // External path: read file and return
  try {
    const filePath = path.join(config.path, filename);
    const file = await fs.readFile(filePath);
    
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (e) {
    return new NextResponse('Image not found', { status: 404 });
  }
}

