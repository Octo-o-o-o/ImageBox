import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';

/**
 * 确保数据目录存在
 * JSON 存储会自动创建文件，但预先创建目录更安全
 */
export async function ensureDataDirectory(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dataPath = path.join(userDataPath, 'data');

  if (!fs.existsSync(dataPath)) {
    try {
      fs.mkdirSync(dataPath, { recursive: true });
      log.info(`Created data directory at: ${dataPath}`);
    } catch (err) {
      log.error('Failed to create data directory:', err);
      throw err;
    }
  } else {
    log.info(`Data directory exists at: ${dataPath}`);
  }
}

/**
 * 获取数据目录路径
 */
export function getDataPath(): string {
  return path.join(app.getPath('userData'), 'data');
}
