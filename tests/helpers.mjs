// Shared helpers for the theme test-suite. Everything here runs locally against mocked network calls:
// no request leaves the machine and no live store, checkout or tracking backend is contacted.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));

export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Shopify allows a leading block comment and (in locale files) trailing commas; strip both before parsing. */
export function parseThemeJson(text) {
  const noComment = text.replace(/^\s*\/\*[\s\S]*?\*\//, '').replace(/^\s*\/\/.*$/gm, '');
  try {
    return JSON.parse(noComment);
  } catch {
    return JSON.parse(noComment.replace(/,(\s*[}\]])/g, '$1'));
  }
}

export function listFiles(dir, ext) {
  const abs = join(ROOT, dir);
  const out = [];
  for (const name of readdirSync(abs)) {
    const full = join(abs, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(relative(ROOT, full), ext));
    else if (!ext || name.endsWith(ext)) out.push(relative(ROOT, full).replace(/\\/g, '/'));
  }
  return out;
}

/**
 * Minimal Response stand-in that works across the jsdom/Node realm boundary.
 * @param {unknown} body
 * @param {{ status?: number, contentType?: string }} [opts]
 */
export function mockResponse(body, { status = 200, contentType = 'application/json' } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const res = {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => text,
    json: async () => JSON.parse(text),
    clone: () => res,
  };
  return res;
}

/**
 * Creates a jsdom window with a recording fetch mock.
 * @param {{ url?: string, html?: string, routes?: (url: string, init: any) => any }} [opts]
 */
export function createWindow({ url = 'https://nurellea.test/', html = '<!doctype html><html><head></head><body></body></html>', routes } = {}) {
  const virtualConsole = new VirtualConsole();
  const logs = [];
  virtualConsole.on('log', (...a) => logs.push(['log', ...a]));
  virtualConsole.on('warn', (...a) => logs.push(['warn', ...a]));
  virtualConsole.on('error', (...a) => logs.push(['error', ...a]));
  virtualConsole.on('jsdomError', (e) => logs.push(['jsdomError', e.message]));
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  const calls = [];
  window.fetch = (input, init = {}) => {
    const u = typeof input === 'string' ? input : input.url;
    calls.push({ url: String(u), init });
    const handled = routes?.(String(u), init);
    return Promise.resolve(handled ?? mockResponse({}));
  };
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  return { dom, window, calls, logs };
}

export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** jsdom fires DOMContentLoaded asynchronously; scripts that defer init to it need this before assertions. */
export const ready = (window) =>
  window.document.readyState === 'loading'
    ? new Promise((r) => window.document.addEventListener('DOMContentLoaded', () => setTimeout(r, 0), { once: true }))
    : tick();
