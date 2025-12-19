/**
 * Script to generate thumbnails for existing images
 * Run with: npx tsx scripts/generate-thumbnails.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const THUMBNAIL_SIZE = 384;
const THUMBNAIL_QUALITY = 80;

async function main() {
  const adapter = new PrismaBetterSqlite3(
    { url: 'file:./dev.db' },
    { timestampFormat: 'unixepoch-ms' }
  );
  const prisma = new PrismaClient({ adapter });

  const publicDir = path.join(process.cwd(), 'public');
  const thumbnailDir = path.join(publicDir, 'generated', 'thumbnails');

  // Ensure thumbnail directory exists
  await fs.mkdir(thumbnailDir, { recursive: true });

  // Get all images without thumbnails
  const images = await prisma.image.findMany({
    where: {
      thumbnailPath: null
    }
  });

  console.log(`Found ${images.length} images without thumbnails`);

  let success = 0;
  let failed = 0;

  for (const image of images) {
    try {
      // Get original image path
      const originalPath = path.join(publicDir, image.path.replace(/^\//, ''));
      
      // Check if original exists
      await fs.access(originalPath);

      // Generate thumbnail filename
      const originalFilename = path.basename(image.path);
      const thumbnailFilename = `thumb_${originalFilename.replace('.png', '.jpg')}`;
      const thumbnailPath = `/generated/thumbnails/${thumbnailFilename}`;
      const thumbnailFullPath = path.join(thumbnailDir, thumbnailFilename);

      // Check if thumbnail already exists
      try {
        await fs.access(thumbnailFullPath);
        console.log(`Thumbnail already exists for ${image.id}, updating DB...`);
      } catch {
        // Generate thumbnail
        await sharp(originalPath)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
            fit: 'cover',
            position: 'centre'
          })
          .jpeg({ quality: THUMBNAIL_QUALITY })
          .toFile(thumbnailFullPath);
        
        console.log(`Generated thumbnail for ${image.id}`);
      }

      // Update database
      await prisma.image.update({
        where: { id: image.id },
        data: { thumbnailPath }
      });

      success++;
    } catch (e) {
      console.error(`Failed to process image ${image.id}:`, e);
      failed++;
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);

