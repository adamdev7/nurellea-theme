// Serves the local mock preview at http://localhost:4173 (rebuilds pages on start). Usage: npm run preview
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './render.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const HERE = fileURLToPath(new URL('./', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

const report = await build();
for (const r of report) console.log(`${r.errors.length ? 'ERR' : 'ok '} ${r.page}${r.errors.map((e) => `\n    ${e}`).join('')}`);

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  let file;
  if (path.startsWith('/assets/')) file = join(ROOT, normalize(path).replace(/^[\\/]+/, ''));
  else if (path === '/preview.css') file = join(HERE, 'preview.css');
  else {
    if (path === '/') path = '/index.html';
    if (!extname(path)) path += '.html';
    file = join(HERE, 'out', normalize(path).replace(/^[\\/]+/, ''));
  }
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not in mock preview (rendered by Shopify)');
  }
}).listen(PORT, () => console.log(`Mock preview: http://localhost:${PORT}/`));
