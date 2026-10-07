// STATIC: inspects theme files only. Catches broken references, schema typos, leftover previous-brand content
// and claim/review-integrity regressions before anything is pushed to a Shopify theme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, read, listFiles, parseThemeJson } from './helpers.mjs';

const exists = (rel) => existsSync(join(ROOT, rel));
const liquidFiles = ['layout', 'sections', 'snippets', 'blocks', 'templates'].flatMap((d) => listFiles(d, '.liquid'));
const jsonTemplates = [...listFiles('templates', '.json'), ...listFiles('sections', '.json')];

const schemaCache = new Map();
function schemaOf(rel) {
  if (!schemaCache.has(rel)) {
    const src = exists(rel) ? read(rel) : '';
    const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
    schemaCache.set(rel, m ? JSON.parse(m[1]) : null);
  }
  return schemaCache.get(rel);
}

test('all theme JSON files parse', () => {
  for (const f of [...jsonTemplates, ...listFiles('config', '.json'), ...listFiles('locales', '.json')]) {
    assert.doesNotThrow(() => parseThemeJson(read(f)), f);
  }
});

test('output tags survive Shopify\'s tokenizer (a lone "}" inside {{ }} ends the tag early)', () => {
  // Mirrors Liquid's PartialTemplateParser: `{{` runs to the first `}` or `}}`.
  const rawBodies = /\{%-?\s*(raw|schema|javascript|stylesheet)\s*-?%\}[\s\S]*?\{%-?\s*end\1\s*-?%\}/g;
  const tokenizer = /\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}?/g;
  const broken = [];
  for (const f of liquidFiles) {
    const src = read(f).replace(rawBodies, '');
    for (const m of src.matchAll(tokenizer)) {
      if (m[0].startsWith('{{') && !m[0].endsWith('}}')) broken.push(`${f}: ${m[0].slice(0, 80)}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('schemas and templates follow Shopify upload rules (dev/schema-lint.mjs)', () => {
  const out = spawnSync(process.execPath, [join(ROOT, 'dev', 'schema-lint.mjs')], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stdout + out.stderr);
});

test('every section schema parses as JSON', () => {
  for (const f of [...listFiles('sections', '.liquid'), ...listFiles('blocks', '.liquid')]) {
    assert.doesNotThrow(() => schemaOf(f), f);
  }
});

test('templates and section groups only reference sections and blocks that exist', () => {
  const problems = [];
  const checkBlocks = (owner, blocks, localTypes) => {
    for (const [id, b] of Object.entries(blocks || {})) {
      const t = b.type;
      if (t.startsWith('shopify://') || t === '@app') continue;
      if (localTypes.has(t)) continue;
      if (!exists(`blocks/${t}.liquid`)) problems.push(`${owner}: block "${id}" type "${t}" not found`);
      else {
        const s = schemaOf(`blocks/${t}.liquid`);
        checkBlocks(`${owner} > ${t}`, b.blocks, new Set((s?.blocks || []).map((x) => x.type).filter((x) => !x.startsWith('@'))));
      }
    }
  };
  for (const f of jsonTemplates) {
    const data = parseThemeJson(read(f));
    if (!data.sections) continue;
    for (const [id, s] of Object.entries(data.sections)) {
      if (s.type.startsWith('shopify://')) continue;
      const rel = `sections/${s.type}.liquid`;
      if (!exists(rel)) {
        problems.push(`${f}: section "${id}" type "${s.type}" not found`);
        continue;
      }
      const schema = schemaOf(rel);
      const local = new Set((schema?.blocks || []).map((x) => x.type).filter((x) => !x.startsWith('@')));
      checkBlocks(`${f} > ${s.type}`, s.blocks, local);
    }
    for (const id of data.order || []) if (!data.sections[id]) problems.push(`${f}: order lists missing section ${id}`);
  }
  assert.deepEqual(problems, []);
});

test('templates and section groups use valid select values everywhere, and only known settings in Nurellea sections', () => {
  const problems = [];
  const checkSettings = (owner, settings, schemaSettings, strict) => {
    const byId = new Map((schemaSettings || []).filter((s) => s.id).map((s) => [s.id, s]));
    for (const [key, value] of Object.entries(settings || {})) {
      const def = byId.get(key);
      if (!def) {
        if (strict) problems.push(`${owner}: unknown setting "${key}"`);
        continue;
      }
      if ((def.type === 'select' || def.type === 'radio') && !def.options.some((o) => o.value === value)) {
        problems.push(`${owner}: "${key}" = ${JSON.stringify(value)} is not an option`);
      }
    }
  };
  const checkBlocks = (owner, blocks, parentSchema, strict) => {
    for (const [bid, b] of Object.entries(blocks || {})) {
      if (b.type.startsWith('shopify://') || b.type === '@app') continue;
      const local = (parentSchema?.blocks || []).find((x) => x.type === b.type && x.settings);
      const blockSchema = local || schemaOf(`blocks/${b.type}.liquid`);
      checkSettings(`${owner} > ${bid}`, b.settings, blockSchema?.settings, strict);
      checkBlocks(`${owner} > ${bid}`, b.blocks, blockSchema, strict);
    }
  };
  for (const f of jsonTemplates) {
    const data = parseThemeJson(read(f));
    for (const [id, s] of Object.entries(data.sections || {})) {
      if (s.type.startsWith('shopify://')) continue;
      const strict = s.type.startsWith('nurellea-');
      const schema = schemaOf(`sections/${s.type}.liquid`);
      checkSettings(`${f} > ${id}`, s.settings, schema?.settings, strict);
      checkBlocks(`${f} > ${id}`, s.blocks, schema, strict);
    }
  }
  assert.deepEqual(problems, []);
});

test('every rendered snippet, included section and literal asset exists', () => {
  const problems = [];
  for (const f of liquidFiles) {
    const src = read(f).replace(/\{%-?\s*(doc|comment)\s*-?%\}[\s\S]*?\{%-?\s*end\1\s*-?%\}/g, '');
    for (const [, name] of src.matchAll(/\brender\s+'([^']+)'/g)) {
      if (!exists(`snippets/${name}.liquid`)) problems.push(`${f}: render '${name}'`);
    }
    for (const [, name] of src.matchAll(/\{%-?\s*section\s+'([^']+)'/g)) {
      if (!exists(`sections/${name}.liquid`)) problems.push(`${f}: section '${name}'`);
    }
    // Only literal names: `'file.css' | asset_url`, not `x | append: '-320.webp' | asset_url`.
    for (const [, name] of src.matchAll(/(?<!append:\s*)'(\w[\w.-]*\.(?:css|js|png|jpe?g|webp|svg|gif|woff2?))'\s*\|\s*asset_url/g)) {
      if (!exists(`assets/${name}`) && !exists(`assets/${name}.liquid`)) problems.push(`${f}: asset '${name}'`);
    }
  }
  assert.deepEqual([...new Set(problems)], []);
});

test('no previous-brand (Luxory / jewelry / VIP membership) content remains in the storefront', () => {
  const pattern = /luxory|lux_catalog|vip-collection|theme_vip|jewel|bracelet|necklace|membership|courage|122,000/i;
  const files = [
    ...liquidFiles,
    ...jsonTemplates,
    ...listFiles('config', '.json'),
    ...listFiles('locales', '.json').filter((f) => !f.includes('.schema.')),
    ...listFiles('assets').filter((f) => /\.(js|css|liquid|json)$/.test(f)),
  ];
  const hits = files.filter((f) => pattern.test(read(f)));
  assert.deepEqual(hits, []);
});

test('Nurellea copy contains no unsupported health claims, urgency or invented social proof', () => {
  const files = [
    ...listFiles('sections', '.liquid').filter((f) => f.includes('nurellea')),
    ...listFiles('snippets', '.liquid').filter((f) => f.includes('nurellea')),
    ...jsonTemplates,
    'config/settings_data.json',
  ];
  const banned = [
    /clinically/i, /\bproven\b/i, /\bcures?\b(?! or prevent)/i, /weight[- ]loss|lose weight|burn fat/i,
    /doctor[- ]recommended|dietitian[- ]approved/i, /selling fast|only \d+ left|hurry|limited time/i,
    /\b\d{1,3}(,\d{3})+\+?\s*(happy|customers|reviews|sold)/i, /\b#1\b|best[- ]selling/i,
    /probiotic|prebiotic|cfu\b/i, /dermatologist|as seen (in|on)/i,
    /boosts? (your )?immun|reduces? (stress|anxiety|bloating|inflammation)|cholesterol|hormon/i,
    /next[- ]day|1[-–]2 (business )?days|fast shipping/i,
  ];
  const problems = [];
  for (const f of files) {
    const src = read(f);
    for (const re of banned) {
      const m = src.match(re);
      if (m) problems.push(`${f}: "${m[0]}"`);
    }
  }
  assert.deepEqual(problems, []);
});

test('review integrity: demo reviews are editor-only, verified badge needs an order reference, rating markup needs real reviews', () => {
  const reviews = read('sections/nurellea-reviews.liquid');
  assert.match(reviews, /settings\.reviews_demo_preview and request\.design_mode/);
  assert.doesNotMatch(reviews, /application\/ld\+json/, 'review list must not emit structured data');
  const verifiedUses = [...reviews.matchAll(/verified_purchase/g)].length;
  assert.ok(verifiedUses > 0);
  assert.match(reviews, /order_reference/);

  const pdp = read('sections/nurellea-main-product.liquid');
  const ld = pdp.slice(pdp.indexOf('application/ld+json'));
  assert.match(ld, /if review_count > 0[\s\S]*aggregateRating/);
  assert.doesNotMatch(ld, /"review"\s*:/, 'no individual Review markup on the PDP');
});

test('Product JSON-LD is emitted by exactly one section on the product template', () => {
  const product = parseThemeJson(read('templates/product.json'));
  const emitters = Object.values(product.sections)
    .map((s) => `sections/${s.type}.liquid`)
    .filter((rel) => exists(rel) && /"@type"\s*:\s*"Product"|structured_data/.test(read(rel)));
  assert.deepEqual(emitters, ['sections/nurellea-main-product.liquid']);
});

test('integrations stay configurable and default to off / blank for Nurellea', () => {
  const data = parseThemeJson(read('config/settings_data.json')).current;
  assert.equal(data.phx_enabled, false);
  assert.equal((data.phx_checkout_url || '').trim(), '');
  assert.equal(data.app_manager_store_id, '');
  assert.equal(data.meta_capi_store_id, '');
  assert.equal(data.meta_capi_browser_token, '');
  for (const key of ['subscriptions_enabled', 'legacy_vendor_scripts']) {
    assert.equal(typeof (data[key] ?? false), 'boolean', `${key} must stay a merchant toggle`);
  }
  assert.notEqual(data.skip_cart_to_checkout, true);
  const embeds = Object.values(data.blocks || {});
  for (const e of embeds) if (/gp-|gempages/i.test(e.type)) assert.equal(e.disabled, true, `${e.type} should stay disabled`);
});

test('preserved integration markers and contracts are still present', () => {
  const layout = read('layout/theme.liquid');
  assert.match(layout, /PHX:REDIRECT_SCRIPT:START/);
  assert.match(layout, /PHX:REDIRECT_SCRIPT:END/);
  assert.match(read('snippets/meta-capi-attribution.liquid'), /window\.__META_CAPI__/);
  const pdp = read('sections/nurellea-main-product.liquid');
  for (const contract of ['<product-form-component', 'on:submit="/handleSubmit"', 'ref="variantId"', "'add-to-cart-button'", 'data-type: \'add-to-cart-form\'', 'name="quantity"']) {
    assert.ok(pdp.includes(contract), `PDP lost Horizon contract: ${contract}`);
  }
  assert.match(read('snippets/cart-summary.liquid'), /name="checkout"/, 'Phoenix hooks button[name="checkout"]');
});

test('private and staging pages are noindexed', () => {
  const seo = read('snippets/nurellea-seo.liquid');
  for (const t of ['cart', 'search', 'password', 'customers', 'order-status', 'track-order', 'seo_noindex_all', 'seo_primary_domain']) {
    assert.ok(seo.includes(t), `nurellea-seo should handle ${t}`);
  }
  assert.match(read('layout/theme.liquid'), /render 'nurellea-seo'/);
  assert.match(read('snippets/meta-tags.liquid'), /canonical/);
});
