// Splits full-page preview screenshots into viewport-sized slices for review. Usage: node dev/preview/slice.mjs name [...]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = fileURLToPath(new URL('./screens/', import.meta.url));
mkdirSync(join(dir, 'slices'), { recursive: true });
for (const name of process.argv.slice(2)) {
  const file = join(dir, `${name}.png`);
  const { width, height } = await sharp(file).metadata();
  const step = name.includes('mobile') ? 1500 : 1100;
  let i = 0;
  for (let y = 0; y < height; y += step) {
    i += 1;
    await sharp(file).extract({ left: 0, top: y, width, height: Math.min(step, height - y) }).toFile(join(dir, 'slices', `${name}-${i}.png`));
  }
  console.log(name, `${width}x${height}`, `${i} slices`);
}
