/**
 * Generate fake sample images for development.
 * Run: node scripts/generate-samples.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'uploads', 'listings', 'samples');
const COUNT = 3;

// Simple colored placeholder images
const COLORS = [
  { bg: '#3b82f6', fg: '#ffffff', label: 'Electronics' },
  { bg: '#10b981', fg: '#ffffff', label: 'Furniture' },
  { bg: '#f59e0b', fg: '#ffffff', label: 'Clothing' },
];

async function generateImage(color, size, filename) {
  const svg = `
    <svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color.bg}"/>
      <text
        x="50%"
        y="50%"
        font-family="sans-serif"
        font-size="${Math.floor(size.width / 8)}px"
        font-weight="bold"
        fill="${color.fg}"
        text-anchor="middle"
        dominant-baseline="middle"
      >${color.label}</text>
    </svg>
  `;
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, filename));
  console.log(`  Created ${filename} (${size.width}x${size.height})`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (let i = 0; i < COUNT; i++) {
    const color = COLORS[i % COLORS.length];
    const prefix = `sample_${i + 1}`;
    console.log(`\nGenerating sample ${i + 1}: ${color.label}`);
    await generateImage(color, { width: 1200, height: 900 }, `${prefix}_original.jpg`);
    await generateImage(color, { width: 320, height: 240 }, `${prefix}_thumb.jpg`);
    await generateImage(color, { width: 900, height: 675 }, `${prefix}_medium.jpg`);
    await generateImage(color, { width: 1600, height: 1200 }, `${prefix}_large.jpg`);
  }

  console.log(`\n✅ Generated ${COUNT} sample image sets in ${OUTPUT_DIR}`);
  console.log('   Files: sample_N_original.jpg, sample_N_thumb.jpg, sample_N_medium.jpg, sample_N_large.jpg');
}

main().catch(console.error);
