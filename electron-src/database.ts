import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';

/**
 * 确保数据库存在
 * 首次运行时从模板复制或创建空数据库
 */
export async function ensureDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'imagebox.db');

  // 如果数据库已存在，无需操作
  if (fs.existsSync(dbPath)) {
    log.info(`Database exists at: ${dbPath}`);
    return;
  }

  log.info('First run: initializing database...');

  // 尝试从模板复制
  const templatePaths = [
    // 开发模式
    path.join(process.cwd(), 'prisma', 'template.db'),
    // 生产模式
    path.join(app.getAppPath(), 'prisma', 'template.db'),
    // extraResources 目录
    path.join(process.resourcesPath || '', 'prisma', 'template.db')
  ];

  for (const templatePath of templatePaths) {
    if (fs.existsSync(templatePath)) {
      try {
        fs.copyFileSync(templatePath, dbPath);
        log.info(`Database initialized from template: ${templatePath}`);
        return;
      } catch (err) {
        log.error(`Failed to copy template from ${templatePath}:`, err);
      }
    }
  }

  // 如果没有模板，创建空数据库文件
  // Next.js 服务器启动时 Prisma 会自动初始化 schema
  log.warn('No template database found, Prisma will create one on first access');
  
  // 创建空文件作为占位符
  try {
    fs.writeFileSync(dbPath, '');
    log.info(`Created empty database placeholder at: ${dbPath}`);
  } catch (err) {
    log.error('Failed to create database placeholder:', err);
    throw err;
  }
}

/**
 * 获取数据库路径
 */
export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'imagebox.db');
}

