'use server';

import { libraryStore, resourcesStore, type FolderRecord, type ImageRecord } from '@/lib/store';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getActualStoragePath } from './settings';
import { E } from '@/lib/errors';

// --- Folders ---

export async function ensureDefaultFolder(): Promise<FolderRecord> {
  const data = await libraryStore.read();

  // Find existing default folder
  const existing = Object.values(data.folders).find(f => f.isDefault);
  if (existing) return existing;

  // Create default folder
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const folder: FolderRecord = {
    id,
    name: 'default',
    isDefault: true,
    createdAt: now
  };

  await libraryStore.update(d => ({
    ...d,
    folders: { ...d.folders, [id]: folder }
  }));

  return folder;
}

export async function getFolders() {
  // Ensure default folder exists before returning list
  await ensureDefaultFolder();

  const data = await libraryStore.read();

  // Count images per folder
  const imageCounts: Record<string, number> = {};
  for (const image of Object.values(data.images)) {
    const fid = image.folderId || '';
    imageCounts[fid] = (imageCounts[fid] || 0) + 1;
  }

  return Object.values(data.folders)
    .sort((a, b) => {
      // Default folder first
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      // Then by creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .map(f => ({
      ...f,
      createdAt: new Date(f.createdAt),
      _count: { images: imageCounts[f.id] || 0 }
    }));
}

export async function createFolder(name: string) {
  // Create physical folder
  const storagePath = await getActualStoragePath();
  const folderPath = path.join(storagePath, name);

  try {
    await fs.mkdir(folderPath, { recursive: true });
  } catch (e) {
    console.error('Failed to create local folder:', e);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const folder: FolderRecord = {
    id,
    name,
    isDefault: false,
    createdAt: now
  };

  await libraryStore.update(d => ({
    ...d,
    folders: { ...d.folders, [id]: folder }
  }));

  return { ...folder, createdAt: new Date(folder.createdAt) };
}

export async function updateFolder(id: string, name: string) {
  const data = await libraryStore.read();
  const folder = data.folders[id];
  if (!folder) throw new Error(`[${E.FOLDER_NOT_FOUND}]`);

  if (folder.name !== name) {
    // Try to rename physical folder
    const storagePath = await getActualStoragePath();
    const oldPath = path.join(storagePath, folder.name);
    const newPath = path.join(storagePath, name);

    try {
      // Only rename if old path exists
      await fs.access(oldPath);
      await fs.rename(oldPath, newPath);

      // Update paths of images in this folder
      const updatedImages = { ...data.images };
      for (const [imgId, img] of Object.entries(updatedImages)) {
        if (img.folderId === id) {
          const filename = path.basename(img.path);
          const newRelativePath = `/generated/${name}/${filename}`;
          updatedImages[imgId] = { ...img, path: newRelativePath };
        }
      }

      // Update folder and images together
      await libraryStore.update(d => ({
        ...d,
        folders: { ...d.folders, [id]: { ...folder, name } },
        images: updatedImages
      }));
    } catch (e) {
      console.error('Failed to rename local folder or update images:', e);
      // Still update folder name in DB even if physical rename fails
      await libraryStore.update(d => ({
        ...d,
        folders: { ...d.folders, [id]: { ...folder, name } }
      }));
    }
  }

  const updated = (await libraryStore.read()).folders[id];
  return { ...updated, createdAt: new Date(updated.createdAt) };
}

export async function deleteFolder(id: string) {
  const data = await libraryStore.read();
  const folder = data.folders[id];

  if (!folder) throw new Error(`[${E.FOLDER_NOT_FOUND}]`);
  if (folder.isDefault) throw new Error(`[${E.CANNOT_DELETE_DEFAULT}]`);

  // Move images to default folder
  const defaultFolder = await ensureDefaultFolder();
  const storagePath = await getActualStoragePath();

  // Find images in this folder
  const folderImages = Object.values(data.images).filter(img => img.folderId === id);

  const updatedImages = { ...data.images };

  // Move physical files to root (default folder location)
  for (const img of folderImages) {
    try {
      const filename = path.basename(img.path);
      const currentPath = path.join(storagePath, folder.name, filename);
      const newPath = path.join(storagePath, filename);

      // Check if file exists before moving
      await fs.access(currentPath);
      await fs.rename(currentPath, newPath);

      // Update image record
      updatedImages[img.id] = {
        ...img,
        folderId: defaultFolder.id,
        path: `/generated/${filename}`
      };
    } catch (e) {
      console.error(`Failed to move image ${img.id} during folder delete:`, e);
      // Fallback: just update folder ID
      updatedImages[img.id] = { ...img, folderId: defaultFolder.id };
    }
  }

  // Try to remove the empty directory
  try {
    const folderPath = path.join(storagePath, folder.name);
    await fs.rmdir(folderPath);
  } catch (e) {
    console.error('Failed to remove folder directory:', e);
  }

  // Remove folder and update images
  await libraryStore.update(d => {
    const { [id]: _, ...restFolders } = d.folders;
    return { ...d, folders: restFolders, images: updatedImages };
  });

  return { ...folder, createdAt: new Date(folder.createdAt) };
}

// --- Images ---

export async function saveGeneratedImage(
  imageData: string | Buffer,
  finalPrompt: string,
  modelName: string,
  params: string,
  templateId?: string,
  folderId?: string
): Promise<Omit<ImageRecord, 'createdAt'> & { createdAt: Date }> {
  // Support both base64 string and Buffer input for efficiency
  const buffer = typeof imageData === 'string'
    ? Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ""), 'base64')
    : imageData;

  const data = await libraryStore.read();

  // Determine target directory
  let targetFolderId = folderId;
  let subDir = '';

  if (targetFolderId) {
    const folder = data.folders[targetFolderId];
    if (folder && !folder.isDefault) {
      subDir = folder.name; // Use folder name as subdirectory
    } else if (!folder) {
      // If provided folder ID is invalid, fallback to default
      targetFolderId = undefined;
    }
  }

  if (!targetFolderId) {
    const defaultFolder = await ensureDefaultFolder();
    targetFolderId = defaultFolder.id;
    // Default folder uses root directory (subDir = '')
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}.png`;

  // Construct paths
  const relativePath = subDir
    ? `/generated/${subDir}/${filename}`
    : `/generated/${filename}`;

  // Get storage path from config (for full-size images)
  const storagePath = await getActualStoragePath();
  const targetDir = subDir ? path.join(storagePath, subDir) : storagePath;

  // Ensure directory exists
  try { await fs.access(targetDir); } catch { await fs.mkdir(targetDir, { recursive: true }); }

  // Save original image to configured storage path
  await fs.writeFile(path.join(targetDir, filename), buffer);

  // Create image record
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const image: ImageRecord = {
    id,
    path: relativePath,
    thumbnailPath: null,
    finalPrompt,
    modelName,
    params,
    templateId: templateId || null,
    folderId: targetFolderId,
    isFavorite: false,
    createdAt: now
  };

  await libraryStore.update(d => ({
    ...d,
    images: { ...d.images, [id]: image }
  }));

  return { ...image, createdAt: new Date(image.createdAt) };
}

export async function getImagesByFolder(folderId?: string) {
  const data = await libraryStore.read();
  const resources = await resourcesStore.read();

  let images = Object.values(data.images);

  if (folderId) {
    images = images.filter(img => img.folderId === folderId);
  }

  // Sort by creation time descending
  images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Check if local files exist
  const storagePath = await getActualStoragePath();

  return await Promise.all(images.map(async (img) => {
    let fileExists = true;
    try {
      let relativePart = img.path;
      if (relativePart.startsWith('/generated/')) {
        relativePart = relativePart.replace(/^\/generated\//, '');
      }
      const absolutePath = path.join(storagePath, relativePart);
      await fs.access(absolutePath);
    } catch {
      fileExists = false;
    }

    // Get template and folder info
    const template = img.templateId ? resources.templates[img.templateId] || null : null;
    const folder = img.folderId ? data.folders[img.folderId] || null : null;

    return {
      ...img,
      createdAt: new Date(img.createdAt),
      template: template ? { ...template, createdAt: new Date(template.createdAt), updatedAt: new Date(template.updatedAt) } : null,
      folder: folder ? { ...folder, createdAt: new Date(folder.createdAt) } : null,
      fileMissing: !fileExists
    };
  }));
}

export async function openLocalFolder(folderId?: string) {
  const storagePath = await getActualStoragePath();
  let targetPath = storagePath;

  if (folderId) {
    const data = await libraryStore.read();
    const folder = data.folders[folderId];
    if (folder && !folder.isDefault) {
      targetPath = path.join(storagePath, folder.name);
    }
  }

  // Create if not exists (for safer UX)
  try { await fs.access(targetPath); } catch { await fs.mkdir(targetPath, { recursive: true }); }

  const execPromise = promisify(exec);
  try {
    if (os.platform() === 'darwin') {
      await execPromise(`open "${targetPath}"`);
    } else if (os.platform() === 'win32') {
      await execPromise(`explorer "${targetPath}"`);
    } else {
      await execPromise(`xdg-open "${targetPath}"`);
    }
    return { success: true };
  } catch (e) {
    const error = e as Error;
    console.error('Failed to open folder:', error);
    throw new Error('Failed to open folder: ' + error.message);
  }
}

export async function openImageFolder(imageId: string) {
  const data = await libraryStore.read();
  const image = data.images[imageId];
  if (!image) throw new Error(`[${E.IMAGE_NOT_FOUND}]`);

  const storagePath = await getActualStoragePath();

  let relativePath = image.path;
  if (relativePath.startsWith('/generated/')) {
    relativePath = relativePath.replace(/^\/generated\//, '');
  }

  const absolutePath = path.join(storagePath, relativePath);

  const execPromise = promisify(exec);

  try {
    if (os.platform() === 'darwin') {
      await execPromise(`open -R "${absolutePath}"`);
    } else if (os.platform() === 'win32') {
      await execPromise(`explorer /select,"${absolutePath}"`);
    } else {
      // Linux/Other: try xdg-open on directory
      const dir = path.dirname(absolutePath);
      await execPromise(`xdg-open "${dir}"`);
    }
    return { success: true };
  } catch (e) {
    const error = e as Error;
    console.error('Failed to open folder:', error);
    throw new Error('Failed to open folder: ' + error.message);
  }
}

export async function deleteImage(id: string) {
  const data = await libraryStore.read();
  const image = data.images[id];
  if (!image) throw new Error(`[${E.IMAGE_NOT_FOUND}]`);

  // Get storage path from config
  const storagePath = await getActualStoragePath();

  let relativePart = image.path;
  if (relativePart.startsWith('/generated/')) {
    relativePart = relativePart.replace(/^\/generated\//, '');
  }

  // Delete original file from configured storage path
  try {
    const filePath = path.join(storagePath, relativePart);
    await fs.unlink(filePath);
  } catch (e) {
    console.error('Failed to delete file:', e);
    // Continue to delete DB record even if file deletion fails
  }

  // Delete thumbnail from disk
  if (image.thumbnailPath) {
    try {
      const cleanThumbPath = image.thumbnailPath.replace(/^\//, '');
      const thumbFilePath = path.join(process.cwd(), 'public', cleanThumbPath);
      await fs.unlink(thumbFilePath);
    } catch (e) {
      console.error('Failed to delete thumbnail:', e);
      // Continue even if thumbnail deletion fails
    }
  }

  // Delete from store
  await libraryStore.update(d => {
    const { [id]: _, ...restImages } = d.images;
    return { ...d, images: restImages };
  });

  return { ...image, createdAt: new Date(image.createdAt) };
}

export async function toggleFavorite(id: string) {
  const data = await libraryStore.read();
  const image = data.images[id];
  if (!image) throw new Error(`[${E.IMAGE_NOT_FOUND}]`);

  const updated: ImageRecord = {
    ...image,
    isFavorite: !image.isFavorite
  };

  await libraryStore.update(d => ({
    ...d,
    images: { ...d.images, [id]: updated }
  }));

  return { ...updated, createdAt: new Date(updated.createdAt) };
}

export async function moveImageToFolder(imageId: string, folderId: string) {
  const data = await libraryStore.read();
  const image = data.images[imageId];
  if (!image) throw new Error(`[${E.IMAGE_NOT_FOUND}]`);

  const folder = data.folders[folderId];
  if (!folder) throw new Error(`[${E.FOLDER_NOT_FOUND}]`);

  // Calculate paths
  const storagePath = await getActualStoragePath();
  const filename = path.basename(image.path);

  // Resolve current physical path
  const currentRelative = image.path.replace(/^\/generated\//, '');
  const currentPath = path.join(storagePath, currentRelative);

  // Resolve new physical path
  let newRelative = '';
  if (folder.isDefault) {
    newRelative = filename; // Root
  } else {
    newRelative = path.join(folder.name, filename);
  }
  const newPath = path.join(storagePath, newRelative);

  // New DB Path
  const newDbPath = `/generated/${newRelative}`;

  // Move file
  try {
    // Ensure specific subdir exists if not default
    if (!folder.isDefault) {
      await fs.mkdir(path.join(storagePath, folder.name), { recursive: true });
    }

    await fs.rename(currentPath, newPath);
  } catch (e) {
    console.error('Failed to move physical file:', e);
    throw new Error(`[${E.IMAGE_MOVE_FAILED}]`);
  }

  const updated: ImageRecord = {
    ...image,
    folderId,
    path: newDbPath
  };

  await libraryStore.update(d => ({
    ...d,
    images: { ...d.images, [imageId]: updated }
  }));

  return { ...updated, createdAt: new Date(updated.createdAt) };
}
