'use server';

import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { getGeneratedPath } from '@/lib/paths';

// --- Settings ---

export async function getSettings() {
  const settings = await prisma.setting.findMany();
  return settings.reduce((acc: Record<string, string>, curr: { key: string; value: string }) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
}

export async function saveSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// --- Storage Configuration ---

/**
 * Get default storage path
 */
function getDefaultStoragePath() {
  // 桌面模式：USER_DATA_PATH/generated
  // Web 模式：<cwd>/public/generated
  return getGeneratedPath();
}

/**
 * Get storage configuration
 */
export async function getStorageConfig() {
  const type = await prisma.setting.findUnique({ where: { key: 'imageStorageType' } });
  const storagePath = await prisma.setting.findUnique({ where: { key: 'imageStoragePath' } });

  return {
    type: (type?.value || 'local') as 'local' | 'r2',
    path: storagePath?.value || '',
    defaultPath: getDefaultStoragePath()
  };
}

/**
 * Get actual storage path
 */
export async function getActualStoragePath() {
  const config = await getStorageConfig();
  if (!config.path) {
    return getDefaultStoragePath();
  }
  return config.path;
}

/**
 * Validate if storage path is valid
 */
export async function validateStoragePath(targetPath: string): Promise<{ valid: boolean; error?: string }> {
  if (!targetPath) {
    return { valid: true };
  }

  if (!path.isAbsolute(targetPath)) {
    return { valid: false, error: 'Path must be absolute' };
  }

  try {
    await fs.mkdir(targetPath, { recursive: true });
    const testFile = path.join(targetPath, '.imagebox_test');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: `Cannot write to path: ${e.message}` };
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
  const imageCount = await prisma.image.count();
  const config = await getStorageConfig();

  return {
    imageCount,
    storagePath: config.path || config.defaultPath,
    isCustomPath: !!config.path
  };
}

/**
 * Update storage path and optionally migrate images
 */
export async function updateStoragePath(
  newPath: string,
  options: { migrate: boolean }
): Promise<{ success: boolean; error?: string; migratedCount?: number; failedCount?: number }> {
  const oldPath = await getActualStoragePath();
  const actualNewPath = newPath || getDefaultStoragePath();

  if (oldPath === actualNewPath) {
    return { success: true, migratedCount: 0, failedCount: 0 };
  }

  if (newPath) {
    const validation = await validateStoragePath(newPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
  }

  let migratedCount = 0;
  let failedCount = 0;

  if (options.migrate) {
    const images = await prisma.image.findMany();
    await fs.mkdir(actualNewPath, { recursive: true });

    for (const image of images) {
      const filename = path.basename(image.path);
      const oldFile = path.join(oldPath, filename);
      const newFile = path.join(actualNewPath, filename);

      try {
        await fs.access(oldFile);
        await fs.copyFile(oldFile, newFile);
        await fs.unlink(oldFile);
        migratedCount++;
      } catch (e) {
        console.error(`Failed to migrate file: ${filename}`, e);
        failedCount++;
      }
    }
  }

  await prisma.setting.upsert({
    where: { key: 'imageStorageType' },
    update: { value: 'local' },
    create: { key: 'imageStorageType', value: 'local' }
  });
  await prisma.setting.upsert({
    where: { key: 'imageStoragePath' },
    update: { value: newPath },
    create: { key: 'imageStoragePath', value: newPath }
  });

  return { success: true, migratedCount, failedCount };
}
