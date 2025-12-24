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

  // 如果数据库已存在，先做一次轻量校验（避免历史版本/异常退出留下空库导致运行期 500）
  if (fs.existsSync(dbPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require('better-sqlite3');
      const db = new Database(dbPath, { readonly: true });
      const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Setting' LIMIT 1`)
        .get();
      db.close();

      if (row?.name === 'Setting') {
        log.info(`Database exists and looks valid at: ${dbPath}`);
        return;
      }

      log.warn(`Database exists but schema is missing (no Setting table): ${dbPath}`);
    } catch (err) {
      // 校验失败时不要直接退出：后续会尝试用模板恢复
      log.warn('Failed to validate existing database, will try to re-initialize from template:', err);
    }
  }

  log.info('First run: initializing database...');

  // 尝试从模板复制
  const templatePaths = [
    // 开发模式
    path.join(process.cwd(), 'prisma', 'template.db'),
    // 生产模式
    path.join(app.getAppPath(), 'prisma', 'template.db'),
    // Next standalone（某些打包布局下模板会在这里）
    path.join(app.getAppPath(), '.next', 'standalone', 'prisma', 'template.db'),
    // extraResources 目录
    path.join(process.resourcesPath || '', 'prisma', 'template.db')
  ];

  for (const templatePath of templatePaths) {
    if (fs.existsSync(templatePath)) {
      try {
        // 如果旧库存在但无 schema，先备份再覆盖
        if (fs.existsSync(dbPath)) {
          const backupPath = `${dbPath}.bak-${Date.now()}`;
          try {
            fs.copyFileSync(dbPath, backupPath);
            log.info(`Backed up invalid database to: ${backupPath}`);
          } catch (backupErr) {
            log.warn('Failed to backup invalid database, continuing with template copy:', backupErr);
          }
        }

        fs.copyFileSync(templatePath, dbPath);
        log.info(`Database initialized from template: ${templatePath}`);
        return;
      } catch (err) {
        log.error(`Failed to copy template from ${templatePath}:`, err);
      }
    }
  }

  // 如果没有模板，创建空数据库文件
  // 注意：Prisma 不会“自动创建表结构”，没有模板时创建空文件通常会导致运行期查询报错（页面 500）。
  // 这里只做兜底占位，并保留强提示日志，方便定位打包是否漏带 template.db。
  log.warn('No template database found. An empty db will likely cause runtime errors until schema is applied.');
  
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

