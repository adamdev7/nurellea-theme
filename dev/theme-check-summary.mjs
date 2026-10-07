// Runs `shopify theme check` and prints a grouped summary. Usage: node dev/theme-check-summary.mjs [--all]
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let raw;
try {
  raw = execSync('npx shopify theme check --output json', { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  raw = e.stdout;
}
const json = JSON.parse(raw.slice(raw.indexOf('[')));
writeFileSync(new URL('theme-check.json', import.meta.url), JSON.stringify(json, null, 1));

const rows = json.flatMap((f) =>
  f.offenses.map((o) => ({
    severity: o.severity,
    check: o.check,
    file: f.path.replace(/\\/g, '/').replace(/.*Nurellea Theme\//i, ''),
    line: (o.start_row ?? 0) + 1,
    message: o.message,
  }))
);
const errors = rows.filter((r) => r.severity === 'error');
const tally = {};
for (const r of rows) tally[`${r.severity} ${r.check}`] = (tally[`${r.severity} ${r.check}`] || 0) + 1;
console.log(`offenses: ${rows.length}, errors: ${errors.length}`);
console.log(tally);
const list = process.argv.includes('--all') ? errors : errors.slice(0, 80);
for (const r of list) console.log(`${r.check}  ${r.file}:${r.line}  ${r.message.slice(0, 160)}`);
