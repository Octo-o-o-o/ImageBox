import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getStorageConfig } from '@/app/actions';
import { getGeneratedPath } from '@/lib/paths';

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
  
  // 检测是否为桌面应用模式（通过 header 或环境变量）
  const isElectron = request.headers.get('x-electron-app') === 'true' || !!process.env.USER_DATA_PATH;
  
  // Web 模式 + 默认路径：重定向到静态文件
  if (!config.path && !isElectron) {
    return NextResponse.redirect(new URL(`/generated/${filename}`, request.url));
  }
  
  // 桌面应用或自定义路径：读取文件并返回
  try {
    let filePath: string;
    if (isElectron && !config.path) {
      // 桌面应用默认路径
      filePath = path.join(getGeneratedPath(), filename);
    } else {
      // 自定义路径
      filePath = path.join(config.path, filename);
    }
    
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
  } catch {
    return new NextResponse('Image not found', { status: 404 });
  }
}
