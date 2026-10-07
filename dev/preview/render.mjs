// LOCAL MOCK PREVIEW. Renders the Nurellea sections from the real JSON templates with liquidjs and sample data
// (dev/preview/mock-data.mjs). It is NOT Shopify: Horizon's header, cart and app blocks are replaced by labelled
// stand-ins, filters are approximations, and no store, checkout or tracking service is contacted.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid, Drop } from 'liquidjs';
import * as mock from './mock-data.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = fileURLToPath(new URL('./out/', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const themeJson = (rel) => {
  const text = read(rel).replace(/^\s*\/\*[\s\S]*?\*\//, '').replace(/^\s*\/\/.*$/gm, '');
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'));
  }
};

/* ---------------- Drops ---------------- */
class ColorDrop extends Drop {
  constructor(input) {
    super();
    const s = String(input || '#000000').trim();
    let r = 0, g = 0, b = 0, a = 1;
    const m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (m) [r, g, b, a = 1] = m[1].split(',').map((x) => Number(x.trim()));
    else {
      const hex = s.replace('#', '');
      const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
      [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0);
    }
    Object.assign(this, { red: r, green: g, blue: b, alpha: a });
    this.rgb = `${r} ${g} ${b}`;
    this.rgba = `${r} ${g} ${b} / ${a}`;
    this.hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  }
  valueOf() { return this.alpha === 1 ? this.hex : `rgba(${this.red},${this.green},${this.blue},${this.alpha})`; }
  toString() { return this.valueOf(); }
}

const FONTS = {
  jost: { family: 'Jost', fallback_families: 'sans-serif' },
  dm_sans: { family: '"DM Sans"', fallback_families: 'sans-serif' },
  cormorant: { family: 'Cormorant', fallback_families: 'serif' },
};
class FontDrop extends Drop {
  constructor(handle, weight, style) {
    super();
    const m = String(handle).match(/^(.*)_([ni])(\d)$/) || [null, handle, 'n', '4'];
    const base = FONTS[m[1]] || { family: m[1], fallback_families: 'sans-serif' };
    Object.assign(this, base);
    this.handle = handle;
    this.weight = weight ?? Number(m[3]) * 100;
    this.style = style ?? (m[2] === 'i' ? 'italic' : 'normal');
    this.system = false;
  }
  valueOf() { return this.family; }
}

/* ---------------- Settings ---------------- */
function buildSettings() {
  const schema = themeJson('config/settings_schema.json');
  const settings = {};
  const types = {};
  for (const group of schema) for (const s of group.settings || []) if (s.id) { types[s.id] = s.type; if ('default' in s) settings[s.id] = s.default; }
  Object.assign(settings, themeJson('config/settings_data.json').current);
  for (const [k, t] of Object.entries(types)) {
    if (t === 'font_picker' && settings[k]) settings[k] = new FontDrop(settings[k]);
    if (t === 'color' && settings[k]) settings[k] = new ColorDrop(settings[k]);
  }
  settings.color_schemes = Object.entries(settings.color_schemes || {}).map(([id, s]) => ({
    id,
    settings: Object.fromEntries(Object.entries(s.settings).map(([k, v]) => [k, typeof v === 'string' && /^(#|rgb)/.test(v) ? new ColorDrop(v) : v])),
  }));
  settings.nurellea_product = mock.product;
  settings.logo = null;
  return settings;
}

/* ---------------- Engine ---------------- */
const locale = themeJson('locales/en.default.json');
const lookup = (key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), locale);
const kw = (args) => Object.fromEntries(args.filter(Array.isArray));
const money = (c) => (c == null || c === '' ? '' : `$${(Number(c) / 100).toFixed(2)}`);
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`).join('');

const engine = new Liquid({
  root: [fileURLToPath(new URL('./overrides/', import.meta.url)), join(ROOT, 'snippets')],
  partials: [fileURLToPath(new URL('./overrides/', import.meta.url)), join(ROOT, 'snippets')],
  extname: '.liquid',
  jsTruthy: false,
  strictFilters: false,
  ownPropertyOnly: false,
});

const skipTag = (name) =>
  engine.registerTag(name, {
    parse(_t, remain) {
      while (remain.length) if (remain.shift().name === `end${name}`) return;
      throw new Error(`unclosed ${name}`);
    },
    render() { return ''; },
  });
['schema', 'doc', 'javascript', 'stylesheet'].forEach(skipTag);

const blockTag = (name, wrap) =>
  engine.registerTag(name, {
    parse(token, remain) {
      this.args = token.args;
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain);
      stream.on(`tag:end${name}`, () => stream.stop()).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error(`unclosed ${name}`); });
      stream.start();
    },
    * render(ctx, emitter) { yield* wrap.call(this, ctx, emitter); },
  });

blockTag('style', function* (ctx, emitter) {
  emitter.write('<style>');
  yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
  emitter.write('</style>');
});

const splitArgs = (s) => {
  const out = [];
  let cur = '', q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === ',') { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

blockTag('form', function* (ctx, emitter) {
  const parts = splitArgs(this.args);
  const type = parts.shift().replace(/['"]/g, '');
  const html = {};
  for (const p of parts) {
    const m = p.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (m) html[m[1]] = yield this.liquid.evalValue(m[2], ctx);
  }
  const action = { product: '/cart/add', contact: '/contact#contact_form', customer: '/contact#newsletter', new_comment: '/blogs/journal/sample-article/comments' }[type] || '#';
  emitter.write(`<form method="post" action="${action}" accept-charset="UTF-8"${attrs(html)}><input type="hidden" name="form_type" value="${type}">`);
  ctx.push({ form: { posted_successfully: false, 'posted_successfully?': false, errors: null, id: html.id } });
  yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
  ctx.pop();
  emitter.write('</form>');
});

blockTag('paginate', function* (ctx, emitter) {
  ctx.push({ paginate: { pages: 1, current_page: 1, current_offset: 0, items: 1, parts: [], previous: null, next: null, page_size: 12 } });
  yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
  ctx.pop();
});

const F = {
  asset_url: (n) => `/assets/${n}`,
  inline_asset_content: (n) => (existsSync(join(ROOT, 'assets', n)) ? read(`assets/${n}`) : ''),
  stylesheet_tag: (u) => `<link rel="stylesheet" href="${u}">`,
  script_tag: (u) => `<script src="${u}"></script>`,
  money,
  money_with_currency: (c) => `${money(c)} USD`,
  money_without_trailing_zeros: (c) => money(c).replace(/\.00$/, ''),
  money_without_currency: (c) => money(c).replace('$', ''),
  t: (key, ...args) => {
    let s = lookup(key);
    if (typeof s === 'object' && s) s = s[kw(args).count === 1 ? 'one' : 'other'] ?? JSON.stringify(s);
    if (s == null) return key.split('.').pop().replace(/_/g, ' ');
    return String(s).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => kw(args)[k] ?? '');
  },
  image_url: (img, ...args) => (img ? `${img.src || img}?width=${kw(args).width || 800}` : ''),
  image_tag: (url, ...args) => (url ? `<img${attrs({ src: url, ...kw(args) })}>` : ''),
  img_url: (img) => (img ? img.src || img : ''),
  metafield_tag: (f) => (f ? `<div>${f.value ?? ''}</div>` : ''),
  default_errors: () => '',
  payment_button: () => '<div class="shopify-payment-button"><button type="button" class="shopify-payment-button__button shopify-payment-button__button--unbranded button" disabled>Buy it now (shown on Shopify)</button></div>',
  payment_type_svg_tag: (t) => `<svg class="icon icon--full-color" viewBox="0 0 38 24" width="38" height="24" role="img" aria-label="${t}"><rect width="38" height="24" rx="3" fill="#fff" stroke="#d9cbc3"/><text x="19" y="15" font-size="7" text-anchor="middle" fill="#4a403c">${String(t).slice(0, 6)}</text></svg>`,
  placeholder_svg_tag: () => '<svg viewBox="0 0 100 100"></svg>',
  handleize: (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  handle: (s) => F.handleize(s),
  pluralize: (n, one, many) => (Number(n) === 1 ? one : many),
  external_video_tag: () => '',
  video_tag: () => '',
  model_viewer_tag: () => '',
  font_face: () => '',
  font_url: () => '',
  font_modify: (font, prop, val) => {
    if (!font) return font;
    const weights = { bold: 700, bolder: 700, normal: 400, lighter: 300 };
    return prop === 'weight' ? new FontDrop(font.handle, weights[val] ?? (Number(val) || font.weight), font.style) : new FontDrop(font.handle, font.weight, val === 'italic' ? 'italic' : 'normal');
  },
  color_brightness: (c) => { const d = c instanceof ColorDrop ? c : new ColorDrop(c); return (d.red * 299 + d.green * 587 + d.blue * 114) / 1000; },
  color_to_rgb: (c) => { const d = c instanceof ColorDrop ? c : new ColorDrop(c); return `rgb(${d.red}, ${d.green}, ${d.blue})`; },
  color_modify: (c) => c,
  find_index: (arr, prop, val) => (Array.isArray(arr) ? arr.findIndex((x) => x?.[prop] === val) : -1),
  link_to: (text, url) => `<a href="${url}">${text}</a>`,
  within: (url) => url,
  structured_data: () => '',
};
for (const [k, fn] of Object.entries(F)) engine.registerFilter(k, fn);

/* ---------------- Sections ---------------- */
function schemaOf(type) {
  const src = read(`sections/${type}.liquid`);
  const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  return m ? JSON.parse(m[1]) : {};
}

function resolveSetting(def, value) {
  if (!def) return value;
  if (def.type === 'product') return value ? mock.product : null;
  if (def.type === 'collection') return value ? mock.collection : null;
  if (def.type === 'blog') return value ? mock.blog : null;
  if (def.type === 'link_list') return value ? { handle: value, links: [] } : null;
  if (def.type === 'image_picker' || def.type === 'video') return null;
  if (def.type === 'color' && value) return new ColorDrop(value);
  return value;
}

function sectionObject(id, data) {
  const schema = schemaOf(data.type);
  const defs = Object.fromEntries((schema.settings || []).filter((s) => s.id).map((s) => [s.id, s]));
  const settings = {};
  for (const [k, d] of Object.entries(defs)) settings[k] = resolveSetting(d, 'default' in d ? d.default : undefined);
  for (const [k, v] of Object.entries(data.settings || {})) settings[k] = resolveSetting(defs[k], v);
  const blockDefs = Object.fromEntries((schema.blocks || []).map((b) => [b.type, b]));
  const order = data.block_order || Object.keys(data.blocks || {});
  const blocks = order
    .map((bid) => [bid, data.blocks[bid]])
    .filter(([, b]) => b && !b.disabled)
    .map(([bid, b]) => {
      const bdefs = Object.fromEntries((blockDefs[b.type]?.settings || []).filter((s) => s.id).map((s) => [s.id, s]));
      const bs = {};
      for (const [k, d] of Object.entries(bdefs)) bs[k] = resolveSetting(d, 'default' in d ? d.default : undefined);
      for (const [k, v] of Object.entries(b.settings || {})) bs[k] = resolveSetting(bdefs[k], v);
      return { id: bid, type: b.type, settings: bs, shopify_attributes: '' };
    });
  return { id, type: data.type, settings, blocks, index: 0 };
}

const STANDIN = (label) => `<div class="preview-standin">${label}</div>`;

async function renderSection(id, data, ctx) {
  if (data.disabled) return '';
  if (!data.type.startsWith('nurellea-') && data.type !== 'order-tracking') {
    return STANDIN(`Horizon section “${data.type}” — rendered by Shopify, not by this local mock preview`);
  }
  const section = sectionObject(id, data);
  try {
    const src = read(`sections/${data.type}.liquid`);
    const html = await engine.parseAndRender(src, { ...ctx, section }, { globals: ctx });
    return `<div id="shopify-section-${id}" class="shopify-section">${html}</div>`;
  } catch (e) {
    return `<div class="preview-error"><strong>${data.type}</strong>: ${String(e.message).replace(/</g, '&lt;')}</div>`;
  }
}

async function renderTemplate(file, ctx) {
  const t = themeJson(file);
  let out = '';
  for (const id of t.order) out += await renderSection(id, t.sections[id], ctx);
  return out;
}

/* ---------------- Pages ---------------- */
const settings = buildSettings();
const base = {
  settings,
  shop: mock.shop,
  routes: {
    root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update',
    cart_clear_url: '/cart/clear', all_products_collection_url: '/collections/all', search_url: '/search', account_url: '/account',
    account_login_url: '/account/login', collections_url: '/collections', predictive_search_url: '/search/suggest',
  },
  request: { design_mode: false, host: 'localhost', locale: { iso_code: 'en' }, path: '/' },
  localization: { language: { iso_code: 'en' }, country: { iso_code: 'US', currency: { iso_code: 'USD', symbol: '$' } } },
  cart: { item_count: 0, items: [], total_price: 0, currency: { iso_code: 'USD' } },
  linklists: {},
  customer: null,
  canonical_url: 'http://localhost:4173/',
  powered_by_link: '',
};

const PAGES = [
  { out: 'index', file: 'templates/index.json', title: 'Home', ctx: { request: { ...base.request, page_type: 'index', path: '/' }, template: { name: 'index' } } },
  { out: 'product', file: 'templates/product.json', title: 'Product', ctx: { product: mock.product, request: { ...base.request, page_type: 'product', path: mock.product.url }, template: { name: 'product' } } },
  { out: 'collection', file: 'templates/collection.json', title: 'Shop', ctx: { collection: mock.collection, request: { ...base.request, page_type: 'collection' }, template: { name: 'collection' } } },
  ...['about', 'ingredients', 'faq', 'contact', 'reviews', 'track-order', 'order-status', 'shipping', 'returns'].map((s) => ({
    out: `page-${s}`,
    file: `templates/page.${s}.json`,
    title: s,
    ctx: { page: mock.page(s.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())), request: { ...base.request, page_type: 'page', path: `/pages/${s}` }, template: { name: 'page', suffix: s } },
  })),
  { out: 'blog', file: 'templates/blog.json', title: 'Journal', ctx: { blog: mock.blog, request: { ...base.request, page_type: 'blog' }, template: { name: 'blog' } } },
  { out: 'article', file: 'templates/article.json', title: 'Article', ctx: { blog: mock.blog, article: mock.article, request: { ...base.request, page_type: 'article' }, template: { name: 'article' } } },
  { out: '404', file: 'templates/404.json', title: 'Not found', ctx: { request: { ...base.request, page_type: '404' }, template: { name: '404' } } },
];

async function headerMock() {
  const announcements = themeJson('sections/header-group.json');
  const ann = Object.values(announcements.sections).find((s) => s.type === 'header-announcements');
  const texts = ann ? Object.values(ann.blocks || {}).map((b) => b.settings?.text).filter(Boolean) : [];
  const logo = await engine.parseAndRender("{% render 'nurellea-logo', height: 30, loading: 'eager' %}", base, { globals: base });
  const links = [['Shop', '/collections/all'], ['Ingredients', '/pages/ingredients'], ['Reviews', '/pages/reviews'], ['About', '/pages/about'], ['FAQ', '/pages/faq']];
  return `<div class="color-scheme-5 preview-announce">${texts[0] || ''}</div>
  <header class="preview-header color-scheme-1">
    <a href="index.html" class="preview-header__logo">${logo}</a>
    <nav class="preview-header__nav">${links.map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}</nav>
    <div class="preview-header__icons"><span>Search</span><span>Account</span><span>Cart (0)</span></div>
  </header>
  <p class="preview-standin preview-standin--thin">Header above is a stand-in: Horizon’s header (menu “main-menu”, sticky, search, cart drawer) renders on Shopify.</p>`;
}

async function shell(page, body) {
  const vars = await engine.parseAndRender("{% render 'theme-styles-variables' %}{% render 'color-schemes' %}", base, { globals: base }).catch((e) => `<!-- variables failed: ${e.message} -->`);
  const footer = await renderTemplate('sections/footer-group.json', { ...base, ...page.ctx });
  const nav = PAGES.map((p) => `<a href="${p.out}.html"${p.out === page.out ? ' aria-current="page"' : ''}>${p.out}</a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>[MOCK] ${page.title} · Nurellea</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500&family=DM+Sans:wght@400;500;700&family=Cormorant:ital,wght@1,500&display=swap">
<link rel="icon" href="/assets/nurellea-icon-32.png">
${vars}
<link rel="stylesheet" href="/assets/base.css"><link rel="stylesheet" href="/theme-bundled.css"><link rel="stylesheet" href="/assets/nurellea.css"><link rel="stylesheet" href="/preview.css">
</head><body class="nl-template-${page.ctx.template.name}${page.ctx.template.suffix ? ` nl-template-${page.ctx.template.name}--${page.ctx.template.suffix}` : ''}">
<div class="preview-banner">LOCAL MOCK PREVIEW · sample data only (not Nurellea prices, ingredients or reviews) · <nav>${nav}</nav></div>
${await headerMock()}
<main id="MainContent">${body}</main>
${footer}
<script>window.__META_CAPI__ = { enabled: false };</script>
<script src="/assets/nurellea.js" defer></script>
</body></html>`;
}

// Shopify compiles every {% stylesheet %} block in the theme into one bundled file.
function bundleStylesheets() {
  const css = [];
  for (const dir of ['sections', 'blocks', 'snippets']) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const f of readdirSync(join(ROOT, dir)).filter((n) => n.endsWith('.liquid'))) {
      for (const m of read(`${dir}/${f}`).matchAll(/{%-?\s*stylesheet\s*-?%}([\s\S]*?){%-?\s*endstylesheet\s*-?%}/g)) css.push(`/* ${dir}/${f} */\n${m[1]}`);
    }
  }
  writeFileSync(join(OUT, 'theme-bundled.css'), css.join('\n'));
}

export async function build() {
  mkdirSync(OUT, { recursive: true });
  bundleStylesheets();
  const report = [];
  for (const page of PAGES) {
    const ctx = { ...base, ...page.ctx };
    const body = await renderTemplate(page.file, ctx);
    const html = await shell(page, body);
    writeFileSync(join(OUT, `${page.out}.html`), html);
    const errors = [...html.matchAll(/<div class="preview-error"><strong>([^<]+)<\/strong>: ([^<]*)/g)].map((m) => `${m[1]}: ${m[2]}`);
    report.push({ page: page.out, bytes: html.length, errors });
  }
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = await build();
  for (const r of report) console.log(`${r.errors.length ? 'ERR' : 'ok '} ${r.page} (${r.bytes} bytes)${r.errors.map((e) => `\n    ${e}`).join('')}`);
}
