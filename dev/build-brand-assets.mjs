// Builds Nurellea brand assets from the supplied logo (white-background raster).
// Output goes to /assets. Re-run with: npm run brand:assets -- <path-to-logo>
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src =
  process.argv[2] ||
  'C:/Users/adaml/.cursor/projects/c-Users-adaml-Downloads-Nurellea-Theme/assets/c__Users_adaml_AppData_Roaming_Cursor_User_workspaceStorage_02072307d0062fc25a072dfd8ea3eac9_images_Nurellea_Logo-887caed1-819d-4321-9bc1-044e9a21b5cf.png';
const out = (name) => resolve(root, 'assets', name);

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => {
  const i = (y * W + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};

// 1. Sample ink colours: dark = low luminance; pink = high red-minus-green.
const darks = [];
const pinks = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b] = px(x, y);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < 70) darks.push([r, g, b]);
    else if (r - g > 55 && r > 200) pinks.push([r, g, b]);
  }
}
const median = (arr) => {
  const ch = [0, 1, 2].map((c) => arr.map((p) => p[c]).sort((a, b) => a - b)[Math.floor(arr.length / 2)]);
  return ch;
};
const DARK = median(darks);
// Use the most saturated quartile of pink pixels (anti-aliased edges are paler).
pinks.sort((a, b) => b[0] - b[1] - (a[0] - a[1]));
const PINK = median(pinks.slice(0, Math.max(1, Math.floor(pinks.length / 3))));
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
console.log('dark ink', hex(DARK), 'pink ink', hex(PINK), `(${darks.length}/${pinks.length} px)`);

// 2. Two-ink colour-to-alpha unmix against white.
const rgba = Buffer.alloc(W * H * 4);
const unmix = (c, ink) => {
  // c = white*(1-a) + ink*a  ->  a = dot(white-c, white-ink)/|white-ink|^2
  const d = [255 - ink[0], 255 - ink[1], 255 - ink[2]];
  const v = [255 - c[0], 255 - c[1], 255 - c[2]];
  const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const a = Math.max(0, Math.min(1, (v[0] * d[0] + v[1] * d[1] + v[2] * d[2]) / dd));
  const res = [0, 1, 2].reduce((s, k) => s + (v[k] - a * d[k]) ** 2, 0);
  return { a, res };
};
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = px(x, y);
    const i = (y * W + x) * 4;
    const dk = unmix(c, DARK);
    const pk = unmix(c, PINK);
    const use = pk.res < dk.res ? { ...pk, ink: PINK } : { ...dk, ink: DARK };
    let a = use.a;
    if (a < 0.06) a = 0;
    rgba[i] = use.ink[0];
    rgba[i + 1] = use.ink[1];
    rgba[i + 2] = use.ink[2];
    rgba[i + 3] = Math.round(a * 255);
  }
}

// 3. Bounding boxes from alpha profile.
const rowInk = new Array(H).fill(0);
const colInkFor = (y0, y1) => {
  const cols = new Array(W).fill(0);
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) cols[x] += rgba[(y * W + x) * 4 + 3] > 40 ? 1 : 0;
  return cols;
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) rowInk[y] += rgba[(y * W + x) * 4 + 3] > 40 ? 1 : 0;
const runs = [];
let start = -1;
for (let y = 0; y <= H; y++) {
  const on = y < H && rowInk[y] > 0;
  if (on && start < 0) start = y;
  if (!on && start >= 0) {
    runs.push([start, y]);
    start = -1;
  }
}
// Wordmark = tallest run; tagline = last run below it.
const sorted = [...runs].sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
const word = sorted[0];
const below = runs.filter((r) => r[0] > word[1]);
const tag = below.length ? [below[0][0], below[below.length - 1][1]] : null;
const span = (cols) => {
  const first = cols.findIndex((v) => v > 0);
  const last = cols.length - 1 - [...cols].reverse().findIndex((v) => v > 0);
  return [first, last + 1];
};
const [wx0, wx1] = span(colInkFor(word[0], word[1]));
console.log('wordmark box', wx0, word[0], wx1, word[1], 'tagline rows', tag);

const pad = 6;
const raw = sharp(rgba, { raw: { width: W, height: H, channels: 4 } });

async function crop(x0, y0, x1, y1, base, widths) {
  const left = Math.max(0, x0 - pad);
  const top = Math.max(0, y0 - pad);
  const width = Math.min(W, x1 + pad) - left;
  const height = Math.min(H, y1 + pad) - top;
  const buf = await raw.clone().extract({ left, top, width, height }).png().toBuffer();
  const meta = { width, height };
  for (const w of widths) {
    await sharp(buf).resize({ width: w }).png({ compressionLevel: 9 }).toFile(out(`${base}-${w}.png`));
    await sharp(buf).resize({ width: w }).webp({ quality: 92, alphaQuality: 100 }).toFile(out(`${base}-${w}.webp`));
  }
  return { buf, meta };
}

// Source raster is ~645px wide at the wordmark, so outputs stop at native size.
const wordmark = await crop(wx0, word[0], wx1, word[1], 'nurellea-wordmark', [320, 640]);
let lockup = wordmark;
if (tag) {
  const [lx0, lx1] = span(colInkFor(word[0], tag[1]));
  lockup = await crop(Math.min(lx0, wx0), word[0], Math.max(lx1, wx1), tag[1], 'nurellea-logo', [320, 640]);
}

// Wordmark in white (for dark backgrounds)
{
  const { data: wd, info: wi } = await sharp(wordmark.buf).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < wd.length; i += 4) {
    const isPink = wd[i] - wd[i + 1] > 40;
    if (!isPink) {
      wd[i] = 255;
      wd[i + 1] = 255;
      wd[i + 2] = 255;
    }
  }
  await sharp(wd, { raw: { width: wi.width, height: wi.height, channels: 4 } })
    .resize({ width: 640 })
    .png({ compressionLevel: 9 })
    .toFile(out('nurellea-wordmark-light-640.png'));
}

// 4. Favicon from the first glyph ("n").
{
  const cols = colInkFor(word[0], word[1]);
  let gx0 = cols.findIndex((v) => v > 0);
  let gx1 = gx0;
  while (gx1 < W && cols[gx1] > 0) gx1++;
  const glyphRows = new Array(H).fill(0);
  for (let y = word[0]; y < word[1]; y++)
    for (let x = gx0; x < gx1; x++) glyphRows[y] += rgba[(y * W + x) * 4 + 3] > 40 ? 1 : 0;
  const gy0 = glyphRows.findIndex((v) => v > 0);
  const gy1 = H - [...glyphRows].reverse().findIndex((v) => v > 0);
  const glyph = await raw
    .clone()
    .extract({ left: gx0, top: gy0, width: gx1 - gx0, height: gy1 - gy0 })
    .png()
    .toBuffer();
  const S = 512;
  const glyphSized = await sharp(glyph).resize({ width: 300, height: 300, fit: 'inside' }).toBuffer();
  const gm = await sharp(glyphSized).metadata();
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" rx="112" fill="#FBEDEB"/><circle cx="${S * 0.73}" cy="${S * 0.27}" r="${S * 0.07}" fill="${hex(PINK)}"/></svg>`
  );
  const icon = await sharp(bg)
    .composite([{ input: glyphSized, left: Math.round((S - gm.width) / 2), top: Math.round((S - gm.height) / 2 + 18) }])
    .png()
    .toBuffer();
  for (const s of [32, 180, 512]) await sharp(icon).resize(s, s).png().toFile(out(`nurellea-icon-${s}.png`));
}

// 5. Social share image 1200x630.
{
  const OW = 1200;
  const OH = 630;
  const logoW = 640;
  const logoBuf = await sharp(lockup.buf).resize({ width: logoW }).toBuffer();
  const lm = await sharp(logoBuf).metadata();
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}">
    <defs><radialGradient id="g" cx="0.85" cy="0.1" r="0.9"><stop offset="0" stop-color="#F7DCD9"/><stop offset="1" stop-color="#FBF6F2"/></radialGradient></defs>
    <rect width="${OW}" height="${OH}" fill="url(#g)"/>
    <circle cx="1080" cy="560" r="190" fill="#F4D3D0" opacity="0.55"/>
    <circle cx="110" cy="70" r="120" fill="#F4D3D0" opacity="0.45"/>
  </svg>`);
  await sharp(bg)
    .composite([{ input: logoBuf, left: Math.round((OW - lm.width) / 2), top: Math.round((OH - lm.height) / 2) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out('nurellea-social-share.jpg'));
}

writeFileSync(
  resolve(root, 'dev', 'brand-colors.json'),
  JSON.stringify(
    { dark_ink: hex(DARK), pink_ink: hex(PINK), wordmark: wordmark.meta, lockup: lockup.meta },
    null,
    2
  )
);
console.log('done', { wordmark: wordmark.meta, lockup: lockup.meta });
