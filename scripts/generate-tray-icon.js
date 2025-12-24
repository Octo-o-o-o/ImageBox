#!/usr/bin/env node
/**
 * Generate tray icon(s) from the app icon so the tray icon looks identical to the app icon.
 *
 * Output:
 * - assets/tray-icon.png (64x64 PNG, transparent)
 * - assets/tray-iconTemplate.png (64x64 PNG, white template, transparent) - macOS recommended
 *
 * Notes:
 * - Electron will resize to platform-specific tray size (we also resize in code),
 *   but generating a clean source size improves quality.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function computeTemplateAlpha(r, g, b) {
  // Extract "white-ish" glyph from the app icon.
  // Background is orange; glyph is white. Use a soft threshold to preserve anti-aliased edges.
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Heuristics: near-white + low chroma.
  const isLowChroma = (max - min) < 35;
  const whiteness = clamp((luma - 190) / 65, 0, 1); // 190..255 -> 0..1

  if (!isLowChroma) return 0;
  return Math.round(whiteness * 255);
}

async function main() {
  const projectRoot = path.join(__dirname, '..');
  const src = path.join(projectRoot, 'assets', 'icon.png');
  const out = path.join(projectRoot, 'assets', 'tray-icon.png');
  const outTemplate = path.join(projectRoot, 'assets', 'tray-iconTemplate.png');

  if (!fs.existsSync(src)) {
    console.error(`❌ Source icon not found: ${src}`);
    process.exit(1);
  }

  // Create a 64x64 tray source icon (keeps appearance identical to app icon).
  // Use "contain" so we never crop the icon.
  const resized = await sharp(src)
    .resize(64, 64, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(resized).toFile(out);

  // macOS template icon:
  // Extract only the white glyph from the app icon (NOT the orange background),
  // otherwise the template icon becomes a white square in the menu bar.
  const { data, info } = await sharp(resized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const outRaw = Buffer.alloc(w * h * 4);

  let minX = w, minY = h, maxX = -1, maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // If original is fully transparent, keep transparent.
      if (a === 0) {
        outRaw[i] = 255;
        outRaw[i + 1] = 255;
        outRaw[i + 2] = 255;
        outRaw[i + 3] = 0;
        continue;
      }

      const alpha = computeTemplateAlpha(r, g, b);
      outRaw[i] = 255;
      outRaw[i + 1] = 255;
      outRaw[i + 2] = 255;
      outRaw[i + 3] = alpha;

      if (alpha > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const base = sharp(outRaw, { raw: { width: w, height: h, channels: 4 } });

  // If we found a glyph bounding box, crop to it to make the icon bigger in the status bar.
  const templ = (maxX >= 0 && maxY >= 0)
    ? base.extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    : base;

  await templ
    .resize(64, 64, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outTemplate);

  console.log(`✅ Generated tray icon: ${path.relative(projectRoot, out)}`);
  console.log(`✅ Generated macOS template tray icon: ${path.relative(projectRoot, outTemplate)}`);
}

main().catch((err) => {
  console.error('❌ Failed to generate tray icon:', err);
  process.exit(1);
});


