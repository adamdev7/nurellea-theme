// Removes the white studio background from generated packshots: flood-fills light, low-saturation pixels from the
// image edge and converts them with a white "color to alpha", so soft shadows stay as translucent shade.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

sharp.cache(false);

const ASSETS = path.join(__dirname, '..', 'assets');
const files = process.argv.slice(2);

async function cutout(name) {
  const src = path.join(ASSETS, name);
  const { data, info } = await sharp(fs.readFileSync(src)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const light = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    light[i] = mn >= 186 && mx - mn <= 16 ? 1 : 0;
  }
  const bg = new Uint8Array(n);
  const stack = [];
  const push = (i) => { if (light[i] && !bg[i]) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    let r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    let a = 255;
    if (bg[i]) {
      const mn = Math.min(r, g, b);
      a = Math.round(Math.min(255, Math.max(0, (255 - mn) * 1.35)));
      if (mn >= 247) a = 0;
      if (a > 0) {
        const af = a / 255;
        r = Math.round(Math.max(0, Math.min(255, (r - 255 * (1 - af)) / af)));
        g = Math.round(Math.max(0, Math.min(255, (g - 255 * (1 - af)) / af)));
        b = Math.round(Math.max(0, Math.min(255, (b - 255 * (1 - af)) / af)));
      }
    }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = a;
  }
  // Soften the hard edge between kept and removed pixels.
  const alpha = Buffer.alloc(n);
  for (let i = 0; i < n; i++) alpha[i] = out[i * 4 + 3];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (bg[i] === bg[i - 1] && bg[i] === bg[i + 1] && bg[i] === bg[i - w] && bg[i] === bg[i + w]) continue;
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += alpha[i + dy * w + dx];
      out[i * 4 + 3] = Math.round(s / 9);
    }
  }
  const buf = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  fs.writeFileSync(src, buf);
  console.log(`${name} -> ${Math.round(buf.length / 1024)}KB`);
}

(async () => { for (const f of files) await cutout(f); })();
