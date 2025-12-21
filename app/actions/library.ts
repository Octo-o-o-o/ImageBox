'use server';

import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { getActualStoragePath } from './settings';
import { E } from '@/lib/errors';
import { THUMBNAIL_SIZE, THUMBNAIL_QUALITY } from '@/lib/imageConstants';

// --- Folders ---

export async function ensureDefaultFolder() {
  const existing = await prisma.folder.findFirst({
    where: { isDefault: true }
  });

  if (!existing) {
    return await prisma.folder.create({
      data: {
        name: 'default',
        isDefault: true
      }
    });
  }

  return existing;
}

export async function getFolders() {
  // Ensure default folder exists before returning list
  await ensureDefaultFolder();

  return await prisma.folder.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' }
    ],
    include: {
      _count: {
        select: { images: true }
      }
    }
  });
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

  return await prisma.folder.create({
    data: { name }
  });
}

export async function updateFolder(id: string, name: string) {
  const folder = await prisma.folder.findUnique({ where: { id } });
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

          // Update paths of images in DB
          const images = await prisma.image.findMany({ where: { folderId: id } });
          for (const img of images) {
              const filename = path.basename(img.path);
              const newRelativePath = `/generated/${name}/${filename}`;
              await prisma.image.update({
                  where: { id: img.id },
                  data: { path: newRelativePath }
              });
          }
      } catch (e) {
          console.error('Failed to rename local folder or update images:', e);
      }
  }

  return await prisma.folder.update({
    where: { id },
    data: { name }
  });
}

export async function deleteFolder(id: string) {
  const folder = await prisma.folder.findUnique({ where: { id } });

  if (!folder) throw new Error(`[${E.FOLDER_NOT_FOUND}]`);
  if (folder.isDefault) throw new Error(`[${E.CANNOT_DELETE_DEFAULT}]`);

  // Move images to default folder
  const defaultFolder = await ensureDefaultFolder();
  const storagePath = await getActualStoragePath();

  // Find images in this folder
  const images = await prisma.image.findMany({ where: { folderId: id } });

  // Move physical files to root (default folder location)
  for (const img of images) {
      try {
          const filename = path.basename(img.path);
          const currentPath = path.join(storagePath, folder.name, filename);
          const newPath = path.join(storagePath, filename);

          // Check if file exists before moving
          await fs.access(currentPath);
          await fs.rename(currentPath, newPath);

          // Update DB path
          await prisma.image.update({
              where: { id: img.id },
              data: {
                  folderId: defaultFolder.id,
                  path: `/generated/${filename}`
              }
          });
      } catch (e) {
          console.error(`Failed to move image ${img.id} during folder delete:`, e);
          // Fallback: just update DB folder ID
          await prisma.image.update({
              where: { id: img.id },
              data: { folderId: defaultFolder.id }
          });
      }
  }

  // Try to remove the empty directory
  try {
      const folderPath = path.join(storagePath, folder.name);
      await fs.rmdir(folderPath);
  } catch (e) {
      console.error('Failed to remove folder directory:', e);
  }

  return await prisma.folder.delete({ where: { id } });
}

// --- Images ---

export async function saveGeneratedImage(base64Data: string, finalPrompt: string, modelName: string, params: string, templateId?: string, folderId?: string) {
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  // Determine target directory
  let targetFolderId = folderId;
  let subDir = '';

  if (targetFolderId) {
    const folder = await prisma.folder.findUnique({ where: { id: targetFolderId } });
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

  const filename = `${Date.now()}-${uuidv4()}.png`;
  const thumbnailFilename = `thumb_${filename.replace('.png', '.jpg')}`; // Use JPEG for smaller size

  // Construct paths
  const relativePath = subDir
      ? `/generated/${subDir}/${filename}`
      : `/generated/${filename}`;
  const thumbnailPath = `/generated/thumbnails/${thumbnailFilename}`;

  // Get storage path from config (for full-size images)
  const storagePath = await getActualStoragePath();
  const targetDir = subDir ? path.join(storagePath, subDir) : storagePath;

  // Thumbnails always go to project's public directory
  const thumbnailDir = path.join(process.cwd(), 'public', 'generated', 'thumbnails');

  // Ensure directories exist
  try { await fs.access(targetDir); } catch { await fs.mkdir(targetDir, { recursive: true }); }
  try { await fs.access(thumbnailDir); } catch { await fs.mkdir(thumbnailDir, { recursive: true }); }

  // Save original image to configured storage path
  await fs.writeFile(path.join(targetDir, filename), buffer);

  // Generate and save thumbnail
  try {
    await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'centre'
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(path.join(thumbnailDir, thumbnailFilename));
  } catch (e) {
    console.error('Failed to generate thumbnail:', e);
    // Continue without thumbnail if it fails
  }

  const image = await prisma.image.create({
    data: {
      path: relativePath,
      thumbnailPath,
      finalPrompt,
      modelName,
      params,
      templateId,
      folderId: targetFolderId
    }
  });

  return image;
}

export async function getImagesByFolder(folderId?: string) {
  const images = await prisma.image.findMany({
    where: folderId ? { folderId } : {},
    orderBy: { createdAt: 'desc' },
    include: { template: true, folder: true }
  });

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
    return { ...img, fileMissing: !fileExists };
  }));
}

export async function openLocalFolder(folderId?: string) {
    const storagePath = await getActualStoragePath();
    let targetPath = storagePath;

    if (folderId) {
        const folder = await prisma.folder.findUnique({ where: { id: folderId } });
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
    } catch (e: any) {
         console.error('Failed to open folder:', e);
         throw new Error('Failed to open folder: ' + e.message);
    }
}

export async function openImageFolder(imageId: string) {
  const image = await prisma.image.findUnique({ where: { id: imageId } });
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
  } catch (e: any) {
    console.error('Failed to open folder:', e);
    throw new Error('Failed to open folder: ' + e.message);
  }
}

export async function deleteImage(id: string) {
  const image = await prisma.image.findUnique({ where: { id } });
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

  // Delete thumbnail from disk (always in default location)
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

  // Delete DB record
  return await prisma.image.delete({ where: { id } });
}

export async function toggleFavorite(id: string) {
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) throw new Error(`[${E.IMAGE_NOT_FOUND}]`);

  return await prisma.image.update({
    where: { id },
    data: { isFavorite: !image.isFavorite }
  });
}

export async function moveImageToFolder(imageId: string, folderId: string) {
  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image) throw new Error(`[${E.IMAGE_NOT_FOUND}]`);

  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) throw new Error(`[${E.FOLDER_NOT_FOUND}]`);

  // Calculate paths
  const storagePath = await getActualStoragePath();
  const filename = path.basename(image.path);

  // Resolve current physical path
  let currentRelative = image.path.replace(/^\/generated\//, '');
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

  return await prisma.image.update({
    where: { id: imageId },
    data: {
        folderId,
        path: newDbPath
    }
  });
}
