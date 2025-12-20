import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface FolderInfo {
  name: string;
  path: string;
  isParent?: boolean;
}

// Get common root paths based on OS
function getQuickAccessPaths(): FolderInfo[] {
  const homeDir = os.homedir();
  const platform = os.platform();
  
  const paths: FolderInfo[] = [
    { name: '主目录', path: homeDir },
  ];
  
  if (platform === 'darwin') {
    // macOS
    paths.push(
      { name: '桌面', path: path.join(homeDir, 'Desktop') },
      { name: '文档', path: path.join(homeDir, 'Documents') },
      { name: '下载', path: path.join(homeDir, 'Downloads') },
      { name: '图片', path: path.join(homeDir, 'Pictures') },
    );
  } else if (platform === 'win32') {
    // Windows
    paths.push(
      { name: '桌面', path: path.join(homeDir, 'Desktop') },
      { name: '文档', path: path.join(homeDir, 'Documents') },
      { name: '下载', path: path.join(homeDir, 'Downloads') },
      { name: '图片', path: path.join(homeDir, 'Pictures') },
    );
    // Add common Windows drives
    const drives = ['C:', 'D:', 'E:'];
    for (const drive of drives) {
      paths.push({ name: `${drive}\\`, path: `${drive}\\` });
    }
  } else {
    // Linux
    paths.push(
      { name: '桌面', path: path.join(homeDir, 'Desktop') },
      { name: '文档', path: path.join(homeDir, 'Documents') },
      { name: '下载', path: path.join(homeDir, 'Downloads') },
      { name: '根目录', path: '/' },
    );
  }
  
  return paths;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetPath = searchParams.get('path');
  
  try {
    // If no path provided, return quick access paths
    if (!targetPath) {
      const quickAccess = getQuickAccessPaths();
      // Filter out paths that don't exist
      const validPaths: FolderInfo[] = [];
      for (const p of quickAccess) {
        try {
          await fs.access(p.path);
          validPaths.push(p);
        } catch {
          // Path doesn't exist, skip
        }
      }
      return NextResponse.json({
        currentPath: '',
        folders: validPaths,
        isQuickAccess: true
      });
    }
    
    // Normalize path
    const normalizedPath = path.normalize(targetPath);
    
    // Check if path exists and is accessible
    try {
      await fs.access(normalizedPath);
    } catch {
      return NextResponse.json(
        { error: '路径不存在或无法访问' },
        { status: 400 }
      );
    }
    
    // Get stat to check if it's a directory
    const stat = await fs.stat(normalizedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json(
        { error: '指定路径不是文件夹' },
        { status: 400 }
      );
    }
    
    // Read directory contents
    const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
    
    // Filter only directories, exclude hidden folders (starting with .)
    const folders: FolderInfo[] = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(normalizedPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Get parent directory
    const parentPath = path.dirname(normalizedPath);
    const hasParent = parentPath !== normalizedPath; // Root has no parent
    
    return NextResponse.json({
      currentPath: normalizedPath,
      parentPath: hasParent ? parentPath : null,
      folders,
      isQuickAccess: false
    });
    
  } catch (error) {
    console.error('Error browsing folders:', error);
    return NextResponse.json(
      { error: '无法读取文件夹内容' },
      { status: 500 }
    );
  }
}


