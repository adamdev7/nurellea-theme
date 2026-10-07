// Checks section/block schemas and JSON template values against Shopify's upload rules
// that theme check does not enforce. Usage: node dev/schema-lint.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (rel) => readFileSync(ROOT + rel, 'utf8');
const list = (dir, ext) => readdirSync(ROOT + dir).filter((f) => f.endsWith(ext)).map((f) => `${dir}/${f}`);
const lenientJson = (src) => JSON.parse(src.replace(/^\uFEFF?\s*\/\*[\s\S]*?\*\//, ''));
const schemaOf = (rel) => {
  const m = read(rel).match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  return m ? JSON.parse(m[1]) : null;
};

const problems = [];
const RICH_START = /^\s*<(p|ul|ol|h[1-6])[\s>]/i;
const URL_DEFAULTS = new Set(['/collections', '/collections/all']);
const LINK_LIST_DEFAULTS = new Set(['main-menu', 'footer', 'customer-account-main-menu']);
const NO_DEFAULT = new Set(['article', 'blog', 'collection', 'page', 'product', 'image_picker', 'video', 'metaobject', 'product_list', 'collection_list', 'article_list', 'metaobject_list']);

function checkSettingDefs(owner, defs) {
  const ids = new Set();
  for (const s of defs || []) {
    if (!s.id) continue;
    if (ids.has(s.id)) problems.push(`${owner}: duplicate setting id "${s.id}"`);
    ids.add(s.id);
    const d = s.default;
    if (s.type === 'url' && d !== undefined && !URL_DEFAULTS.has(d)) problems.push(`${owner}: url "${s.id}" default ${JSON.stringify(d)} (only /collections or /collections/all allowed)`);
    if (s.type === 'richtext' && d !== undefined && !RICH_START.test(d)) problems.push(`${owner}: richtext "${s.id}" default must start with <p>, <ul>, <ol> or <h1-6>`);
    if (s.type === 'inline_richtext' && d !== undefined && /<p[\s>]/i.test(d)) problems.push(`${owner}: inline_richtext "${s.id}" default cannot contain <p>`);
    if (s.type === 'range') {
      if (d === undefined) problems.push(`${owner}: range "${s.id}" needs a default`);
      else if (d < s.min || d > s.max) problems.push(`${owner}: range "${s.id}" default ${d} outside ${s.min}-${s.max}`);
      const steps = (s.max - s.min) / (s.step || 1);
      if (steps > 101) problems.push(`${owner}: range "${s.id}" has ${steps} steps (max 101)`);
      if (d !== undefined && Math.abs(((d - s.min) / (s.step || 1)) % 1) > 1e-9) problems.push(`${owner}: range "${s.id}" default ${d} not on step`);
    }
    if ((s.type === 'select' || s.type === 'radio') && d !== undefined && !s.options.some((o) => o.value === d)) problems.push(`${owner}: ${s.type} "${s.id}" default ${JSON.stringify(d)} not an option`);
    if (s.type === 'select' && s.options.some((o) => o.label === undefined)) problems.push(`${owner}: select "${s.id}" option missing label`);
    if (!s.label && !['header', 'paragraph', 'color_scheme_group'].includes(s.type)) problems.push(`${owner}: "${s.id}" missing label`);
    if (NO_DEFAULT.has(s.type) && d !== undefined) problems.push(`${owner}: ${s.type} "${s.id}" cannot have a default`);
    if (s.type === 'link_list' && d !== undefined && !LINK_LIST_DEFAULTS.has(d)) problems.push(`${owner}: link_list "${s.id}" default must be a built-in menu`);
    if (s.type === 'video_url' && !Array.isArray(s.accept)) problems.push(`${owner}: video_url "${s.id}" needs "accept"`);
    if (s.type === 'color' && d !== undefined && d !== '' && !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(d)) problems.push(`${owner}: color "${s.id}" default ${d} is not hex`);
    if (s.type === 'number' && d !== undefined && typeof d !== 'number') problems.push(`${owner}: number "${s.id}" default is not a number`);
  }
}

for (const group of lenientJson(read('config/settings_schema.json'))) {
  checkSettingDefs(`config/settings_schema.json > ${group.name}`, group.settings);
}

const sectionSchemas = new Map();
for (const f of [...list('sections', '.liquid'), ...list('blocks', '.liquid')]) {
  let schema;
  try { schema = schemaOf(f); } catch (e) { problems.push(`${f}: schema JSON error ${e.message}`); continue; }
  if (!schema) continue;
  sectionSchemas.set(f, schema);
  if (schema.name && !String(schema.name).startsWith('t:') && schema.name.length > 25) problems.push(`${f}: name longer than 25 characters`);
  checkSettingDefs(f, schema.settings);
  for (const b of schema.blocks || []) {
    if (b.name && !String(b.name).startsWith('t:') && b.name.length > 25) problems.push(`${f}: block "${b.type}" name longer than 25 characters`);
    checkSettingDefs(`${f} > block ${b.type}`, b.settings);
  }
  for (const p of schema.presets || []) {
    if (p.name && !String(p.name).startsWith('t:') && p.name.length > 25) problems.push(`${f}: preset name longer than 25 characters`);
  }
}

function checkValues(owner, values, defs) {
  const byId = new Map((defs || []).filter((s) => s.id).map((s) => [s.id, s]));
  for (const [k, v] of Object.entries(values || {})) {
    const s = byId.get(k);
    if (!s) continue;
    if (s.type === 'richtext' && v !== '' && !RICH_START.test(v)) problems.push(`${owner}: richtext "${k}" value must start with <p>/<ul>/<ol>/<h*>`);
    if (s.type === 'inline_richtext' && /<p[\s>]/i.test(v)) problems.push(`${owner}: inline_richtext "${k}" contains <p>`);
    if (s.type === 'range' && (typeof v !== 'number' || v < s.min || v > s.max)) problems.push(`${owner}: range "${k}" = ${v} outside ${s.min}-${s.max}`);
    if (s.type === 'url' && v !== '' && !/^(\/|https?:\/\/|shopify:\/\/|mailto:|tel:|#)/.test(v)) problems.push(`${owner}: url "${k}" = ${v}`);
    if (s.type === 'checkbox' && typeof v !== 'boolean') problems.push(`${owner}: checkbox "${k}" not boolean`);
    if (s.type === 'number' && v !== null && typeof v !== 'number') problems.push(`${owner}: number "${k}" not a number`);
  }
}

const schemeIds = new Set(Object.keys(lenientJson(read('config/settings_data.json')).current.color_schemes || {}));
for (const f of [...list('templates', '.json'), ...list('sections', '.json')]) {
  const data = lenientJson(read(f));
  const sections = Object.entries(data.sections || {});
  if (f.startsWith('templates/') && sections.length > 25) problems.push(`${f}: more than 25 sections`);
  for (const [id, s] of sections) {
    const schema = sectionSchemas.get(`sections/${s.type}.liquid`);
    if (!schema) continue;
    checkValues(`${f} > ${id}`, s.settings, schema.settings);
    for (const [k, v] of Object.entries(s.settings || {})) {
      const def = (schema.settings || []).find((x) => x.id === k);
      if (def?.type === 'color_scheme' && v && !schemeIds.has(v)) problems.push(`${f} > ${id}: color scheme "${v}" does not exist`);
    }
    const blocks = Object.entries(s.blocks || {});
    if (schema.max_blocks && blocks.length > schema.max_blocks) problems.push(`${f} > ${id}: ${blocks.length} blocks > max_blocks ${schema.max_blocks}`);
    for (const [bid, b] of blocks) {
      const local = (schema.blocks || []).find((x) => x.type === b.type);
      const bSchema = local?.settings ? local : sectionSchemas.get(`blocks/${b.type}.liquid`);
      if (bSchema) checkValues(`${f} > ${id} > ${bid}`, b.settings, bSchema.settings);
      if (local?.limit && blocks.filter(([, x]) => x.type === b.type).length > local.limit) problems.push(`${f} > ${id}: too many "${b.type}" blocks (limit ${local.limit})`);
    }
    if (s.block_order && s.block_order.some((bid) => !s.blocks?.[bid])) problems.push(`${f} > ${id}: block_order references a missing block`);
    if (s.block_order && new Set(s.block_order).size !== s.block_order.length) problems.push(`${f} > ${id}: block_order lists a block twice`);
  }
  if (data.order && data.order.some((sid) => !data.sections?.[sid])) problems.push(`${f}: order references a missing section`);
  if (data.order && new Set(data.order).size !== data.order.length) problems.push(`${f}: order lists a section twice`);
}

console.log(problems.length ? problems.join('\n') : 'no problems');
process.exitCode = problems.length ? 1 : 0;
