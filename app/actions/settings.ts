'use server';

import { configStore, libraryStore } from '@/lib/store';
import fs from 'fs/promises';
import path from 'path';
import { getGeneratedPath } from '@/lib/paths';

// --- Settings ---

export async function getSettings() {
  const data = await configStore.read();
  return data.settings;
}

export async function saveSetting(key: string, value: string) {
  await configStore.update(data => ({
    ...data,
    settings: { ...data.settings, [key]: value }
  }));
}

// --- Storage Configuration ---

/**
 * Get default storage path
 */
function getDefaultStoragePath() {
  // Desktop mode: USER_DATA_PATH/generated
  // Web mode: <cwd>/public/generated
  return getGeneratedPath();
}

/**
 * Get storage configuration
 */
export async function getStorageConfig() {
  const settings = await getSettings();

  return {
    type: (settings['imageStorageType'] || 'local') as 'local' | 'r2',
    path: settings['imageStoragePath'] || '',
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
  } catch (e: unknown) {
    const error = e as Error;
    return { valid: false, error: `Cannot write to path: ${error.message}` };
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
  const library = await libraryStore.read();
  const imageCount = Object.keys(library.images).length;
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
    const library = await libraryStore.read();
    const images = Object.values(library.images);
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

  await saveSetting('imageStorageType', 'local');
  await saveSetting('imageStoragePath', newPath);

  return { success: true, migratedCount, failedCount };
}
