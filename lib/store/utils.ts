import path from 'path';

/**
 * Get the data directory path.
 * - Electron: USER_DATA_PATH environment variable
 * - Web/Docker: process.cwd()/data
 */
export function getDataPath(): string {
  if (process.env.USER_DATA_PATH) {
    return path.join(process.env.USER_DATA_PATH, 'data');
  }
  return path.join(process.cwd(), 'data');
}
