// Captures full-page desktop (1440px) and mobile (390px, touch emulation) screenshots of the LOCAL MOCK PREVIEW
// by driving headless Edge/Chrome over the DevTools protocol. Requires `npm run preview` to be running.
// Usage: node dev/preview/screenshots.mjs [page ...]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('./screens/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const BROWSER = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!BROWSER) throw new Error('No Chromium-based browser found; set CHROME_PATH');

const ALL = ['index', 'product', 'collection', 'page-about', 'page-ingredients', 'page-faq', 'page-contact', 'page-reviews', 'page-track-order', 'page-order-status', 'page-shipping', 'blog', 'article', '404'];
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const SIZES = [
  { name: 'desktop', width: 1440, height: 900, mobile: false, scale: 1 },
  { name: 'mobile', width: 390, height: 844, mobile: true, scale: 2 },
];
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nl-shot-'))}`, 'about:blank'], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('browser did not start');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const listeners = new Set();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else listeners.forEach((fn) => fn(msg));
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const once = (method) => new Promise((r) => { const fn = (m) => { if (m.method === method) { listeners.delete(fn); r(m.params); } }; listeners.add(fn); });

await send('Page.enable');
await send('Runtime.enable');
try {
  for (const page of pages) {
    for (const size of SIZES) {
      await send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: size.scale, mobile: size.mobile });
      await send('Emulation.setTouchEmulationEnabled', { enabled: size.mobile });
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url: `http://localhost:4173/${page}.html` });
      await loaded;
      await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
      // Reveal-on-scroll content is shown so the full page is visible in one capture.
      await send('Runtime.evaluate', { expression: "document.querySelectorAll('.nl-reveal--pending').forEach((e) => e.classList.remove('nl-reveal--pending'))" });
      // A full-page capture never scrolls, so lazy images would stay blank.
      await send('Runtime.evaluate', {
        expression: "Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }); }))",
        awaitPromise: true,
      });
      await sleep(400);
      const { cssContentSize } = await send('Page.getLayoutMetrics');
      const overflow = (await send('Runtime.evaluate', { expression: 'document.documentElement.scrollWidth - document.documentElement.clientWidth', returnByValue: true })).result.value;
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: size.width, height: Math.ceil(cssContentSize.height), scale: size.name === 'mobile' ? 0.5 : 1 },
      });
      const file = join(OUT, `${page}-${size.name}.png`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(`saved ${page}-${size.name}.png (${size.width}x${Math.ceil(cssContentSize.height)})${overflow > 0 ? `  HORIZONTAL OVERFLOW ${overflow}px` : ''}`);
    }
  }
} finally {
  ws.close();
  proc.kill();
}
