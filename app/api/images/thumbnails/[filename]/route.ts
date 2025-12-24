import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getThumbnailPath } from '@/lib/paths';
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
  
  const isElectron = request.headers.get('x-electron-app') === 'true';
  
  let thumbPath: string;
  const config = await getStorageConfig();

  if (config.path) {
    // 自定义存储路径：缩略图与原图同根目录下的 thumbnails/
    thumbPath = path.join(config.path, 'thumbnails', filename);
  } else if (isElectron || process.env.USER_DATA_PATH) {
    // 桌面应用默认路径：USER_DATA_PATH/generated/thumbnails
    thumbPath = path.join(getThumbnailPath(), filename);
  } else {
    // Web 默认路径：public/generated/thumbnails
    thumbPath = path.join(process.cwd(), 'public', 'generated', 'thumbnails', filename);
  }
  
  try {
    const file = await fs.readFile(thumbPath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new NextResponse('Thumbnail not found', { status: 404 });
  }
}

