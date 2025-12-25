/**
 * 路径工具
 * 用于在不同运行模式下获取正确的数据存储路径
 * 
 * 桌面应用模式：使用用户数据目录 (~/Library/Application Support/ImageBox 或 %APPDATA%/ImageBox)
 * Web/Docker 模式：使用项目目录
 */

import path from 'path';

/**
 * 获取用户数据路径
 * 
 * 桌面应用模式：通过 USER_DATA_PATH 环境变量获取（由 Electron 主进程设置）
 * Web 模式：使用项目根目录
 */
export function getUserDataPath(): string {
  // Electron 环境：使用环境变量（由 Electron 主进程启动时设置）
  if (process.env.USER_DATA_PATH) {
    return process.env.USER_DATA_PATH;
  }
  
  // 尝试直接获取（仅在 Electron 主进程中有效）
  if (typeof process !== 'undefined' && process.versions?.electron) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { app } = require('electron');
      return app.getPath('userData');
    } catch {
      // 在 Next.js 服务端渲染中无法 require electron
    }
  }
  
  // Web 模式：使用项目目录
  return process.cwd();
}

/**
 * 获取数据库 URL
 *
 * 注意：SQLite file URL 必须使用正斜杠，即使在 Windows 上也是如此
 * 例如：file:C:/Users/xxx/AppData/Roaming/ImageBox/imagebox.db
 */
export function getDatabaseUrl(): string {
  const dataPath = getUserDataPath();
  // 桌面应用使用 imagebox.db，Web 模式使用 dev.db
  const dbName = process.env.USER_DATA_PATH ? 'imagebox.db' : 'dev.db';
  const fullPath = path.join(dataPath, dbName);
  // Windows 路径使用反斜杠，但 SQLite file URL 必须使用正斜杠
  const normalizedPath = fullPath.replace(/\\/g, '/');
  return `file:${normalizedPath}`;
}

/**
 * 获取生成图片存储路径
 */
export function getGeneratedPath(): string {
  const dataPath = getUserDataPath();
  
  // 桌面应用：用户数据目录下的 generated
  if (process.env.USER_DATA_PATH) {
    return path.join(dataPath, 'generated');
  }
  
  // Web 模式：public/generated
  return path.join(dataPath, 'public', 'generated');
}

/**
 * 获取缩略图存储路径
 */
export function getThumbnailPath(): string {
  return path.join(getGeneratedPath(), 'thumbnails');
}

