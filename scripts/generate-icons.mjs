import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const svg = readFileSync(join(publicDir, 'icon.svg'));

const sizes = [
  { size: 512, name: 'icon-512.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 32, name: 'favicon-32.png' },
];

for (const { size, name } of sizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(publicDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

console.log('Done!');
