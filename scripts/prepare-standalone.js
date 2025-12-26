#!/usr/bin/env node

/**
 * Prepare Next.js standalone build for Electron packaging
 *
 * Next.js standalone output does NOT include:
 * - .next/static (CSS, JS, etc.)
 * - public folder (static assets)
 *
 * This script copies these required folders into the standalone directory.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');

/**
 * Recursively copy a directory
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Source not found: ${src}`);
    return false;
  }

  // Remove existing destination if it exists
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  return true;
}

/**
 * Remove files/dirs that should not be in standalone
 */
function cleanStandalone() {
  const toRemove = [
    'dev.db',
    'dev.db-journal',
    'dist-electron',
    'CLAUDE.md',
    'README.md',
    'README.zh-CN.md',
    'PRODUCT_DESIGN.md',
    'UI_STANDARDS_Octo.md',
    'WINDOWS_TROUBLESHOOTING.md',
    'docker-compose.yml',
    'docker',
    'Dockerfile',
  ];

  for (const item of toRemove) {
    const itemPath = path.join(standaloneDir, item);
    if (fs.existsSync(itemPath)) {
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true });
      } else {
        fs.unlinkSync(itemPath);
      }
      console.log(`   🗑️  Removed ${item}`);
    }
  }
}

console.log('\n📦 Preparing Next.js standalone build for Electron...\n');

// Check if standalone build exists
if (!fs.existsSync(standaloneDir)) {
  console.error('❌ Standalone build not found. Run "npm run build" first.');
  process.exit(1);
}

// 0. Clean up unnecessary files from standalone
console.log('🧹 Cleaning unnecessary files...');
cleanStandalone();

// 1. Copy .next/static to .next/standalone/.next/static
const staticSrc = path.join(projectRoot, '.next', 'static');
const staticDest = path.join(standaloneNextDir, 'static');

console.log('📁 Copying .next/static...');
if (copyDir(staticSrc, staticDest)) {
  console.log(`   ✅ Copied to ${path.relative(projectRoot, staticDest)}`);
} else {
  console.log('   ⚠️  Static folder not found (may cause issues)');
}

// 2. Copy public folder to .next/standalone/public (if not already there)
const publicSrc = path.join(projectRoot, 'public');
const publicDest = path.join(standaloneDir, 'public');

console.log('📁 Copying public folder...');
if (copyDir(publicSrc, publicDest)) {
  console.log(`   ✅ Copied to ${path.relative(projectRoot, publicDest)}`);
} else {
  console.log('   ⚠️  Public folder not found');
}

// IMPORTANT: Don't ship runtime-generated images in the app bundle.
// They bloat the installer and can cause confusion (desktop mode stores images in USER_DATA_PATH).
// Keep directory structure only.
console.log('🧹 Removing public/generated runtime assets from standalone...');
try {
  const generatedInPublic = path.join(publicDest, 'generated');
  if (fs.existsSync(generatedInPublic)) {
    fs.rmSync(generatedInPublic, { recursive: true });
    console.log('   🗑️  Removed .next/standalone/public/generated');
  }
  // Recreate empty dir for compatibility
  fs.mkdirSync(path.join(publicDest, 'generated'), { recursive: true });
  console.log('   ✅ Recreated empty public/generated');
} catch (e) {
  console.log('   ⚠️  Failed to clean public/generated (continuing):', e?.message || e);
}

console.log('\n✅ Standalone preparation complete!\n');
