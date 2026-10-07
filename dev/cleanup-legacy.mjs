// Lists (default) or removes (--apply) previous-brand storefront files from the Nurellea working copy.
// The originals remain in the "luxory-baseline" git commit.
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const patterns = [
  /^jewelry-/,
  /^membership/,
  /^gp-section-/,
  /^luxury-catalog/,
  /^theme_vip/,
  /^checkout-membership/,
  /^load-css\.liquid$/,
  /^product-bundle-builder/,
  /\.gem-/,
  /gp-template-bk-default/,
  /^product\.(bracelet|necklace)\.json$/,
  /^page\.(email|membership|membership_cancellation)\.json$/,
  /^password\.email\.liquid$/,
];
const dirs = ['sections', 'snippets', 'assets', 'templates', 'layout', 'blocks'];
const apply = process.argv.includes('--apply');
const hits = [];
for (const d of dirs) {
  for (const f of readdirSync(join(root, d))) {
    if (patterns.some((re) => re.test(f))) hits.push(`${d}/${f}`);
  }
}
for (const h of hits) {
  if (apply) rmSync(join(root, h));
  console.log(apply ? 'removed' : 'would remove', h);
}
console.log(`${hits.length} file(s)`);
