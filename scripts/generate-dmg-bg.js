const sharp = require('sharp');
const path = require('path');

const width = 600;
const height = 400;

const svgImage = `
<svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
  
  <!-- Arrow (Orange #F97316) -->
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
    refX="0" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#F97316" />
    </marker>
  </defs>
  <line x1="190" y1="220" x2="350" y2="220" stroke="#F97316" 
  stroke-width="4" marker-end="url(#arrowhead)" />

  <!-- Title -->
  <text x="300" y="60" font-family="sans-serif" font-size="28" 
  text-anchor="middle" fill="#333333" font-weight="bold">Install ImageBox</text>

  <!-- Instructions Box -->
  <rect x="30" y="290" width="540" height="90" rx="8" fill="#FFF7ED" stroke="#F97316" stroke-width="1" stroke-opacity="0.2" />

  <!-- Instructions Text -->
  <text x="300" y="315" font-family="sans-serif" font-size="13" 
  text-anchor="middle" fill="#333333">
    Drag the icon to the Applications folder
  </text>
  
  <text x="300" y="340" font-family="sans-serif" font-size="12" 
  text-anchor="middle" fill="#DC2626" font-weight="bold">
    If "App is damaged" error appears, run this in Terminal:
  </text>
  
  <text x="300" y="365" font-family="monospace" font-size="11" 
  text-anchor="middle" fill="#1f2937" font-weight="bold">
    sudo xattr -rd com.apple.quarantine /Applications/ImageBox.app
  </text>
</svg>
`;

sharp(Buffer.from(svgImage))
    .png()
    .toFile(path.join(__dirname, '../assets/dmg-background.png'))
    .then(info => {
        console.log('DMG background generated successfully:', info);
    })
    .catch(err => {
        console.error('Error generating DMG background:', err);
        process.exit(1);
    });
