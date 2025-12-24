/**
 * Generate Windows ICO file from PNG
 * ICO files need multiple sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIco() {
    const inputPng = path.join(__dirname, '../assets/icon.png');
    const outputIco = path.join(__dirname, '../assets/icon.ico');

    // ICO format requires multiple sizes
    const sizes = [16, 32, 48, 64, 128, 256];

    console.log('Generating ICO file from:', inputPng);

    // Generate PNG files at different sizes
    const pngBuffers = await Promise.all(
        sizes.map(async (size) => {
            const buffer = await sharp(inputPng)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toBuffer();

            console.log(`✓ Generated ${size}x${size}`);
            return { size, buffer };
        })
    );

    // Create ICO file header and directory
    const numImages = pngBuffers.length;

    // ICO header (6 bytes)
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0);        // Reserved (must be 0)
    icoHeader.writeUInt16LE(1, 2);        // Image type (1 = ICO)
    icoHeader.writeUInt16LE(numImages, 4); // Number of images

    // Calculate offsets
    let offset = 6 + (numImages * 16); // Header + directory entries

    // Create directory entries (16 bytes each)
    const directoryEntries = pngBuffers.map(({ size, buffer }) => {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(size === 256 ? 0 : size, 0);  // Width (0 means 256)
        entry.writeUInt8(size === 256 ? 0 : size, 1);  // Height (0 means 256)
        entry.writeUInt8(0, 2);                         // Color palette (0 = no palette)
        entry.writeUInt8(0, 3);                         // Reserved
        entry.writeUInt16LE(1, 4);                      // Color planes
        entry.writeUInt16LE(32, 6);                     // Bits per pixel
        entry.writeUInt32LE(buffer.length, 8);          // Image size in bytes
        entry.writeUInt32LE(offset, 12);                // Image offset

        offset += buffer.length;
        return entry;
    });

    // Combine all parts
    const icoFile = Buffer.concat([
        icoHeader,
        ...directoryEntries,
        ...pngBuffers.map(({ buffer }) => buffer)
    ]);

    // Write ICO file
    fs.writeFileSync(outputIco, icoFile);

    console.log(`\n✅ ICO file generated successfully: ${outputIco}`);
    console.log(`   File size: ${(icoFile.length / 1024).toFixed(2)} KB`);
    console.log(`   Contains ${numImages} sizes: ${sizes.join(', ')}`);
}

generateIco().catch(err => {
    console.error('Error generating ICO:', err);
    process.exit(1);
});
