// Removes previous-brand locale namespaces (jewelry, bundle, lux_catalog) from storefront locale files.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = new URL('../locales/', import.meta.url);
const DROP = ['jewelry', 'bundle', 'lux_catalog'];

for (const name of readdirSync(dir)) {
  if (name.includes('.schema.')) continue;
  const file = new URL(name, dir);
  const text = readFileSync(file, 'utf8');
  try {
    const data = JSON.parse(text);
    const hit = DROP.filter((k) => k in data);
    if (!hit.length) continue;
    hit.forEach((k) => delete data[k]);
    writeFileSync(file, JSON.stringify(data));
    console.log(name, 'removed', hit.join(', '));
  } catch {
    // Lenient JSON (trailing commas): cut the top-level blocks textually.
    let out = text;
    for (const key of DROP) {
      const start = out.indexOf(`\n  "${key}": {`);
      if (start === -1) continue;
      let depth = 0;
      let i = out.indexOf('{', start);
      for (; i < out.length; i++) {
        if (out[i] === '{') depth++;
        else if (out[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      let end = i + 1;
      if (out[end] === ',') end++;
      out = out.slice(0, start) + out.slice(end);
      console.log(name, 'removed', key);
    }
    out = out.replace(/,(\s*)\}\s*$/, '$1}\n');
    writeFileSync(file, out);
  }
}
