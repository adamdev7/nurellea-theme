// Adds the primary product reference, social profiles and disclaimer to the "Nurellea store" settings group.
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../config/settings_schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(file, 'utf8'));
const group = schema.find((g) => g.name === 'Nurellea store');
if (!group) throw new Error('Nurellea store group missing — run patch-settings-schema.mjs first');

const has = (id) => group.settings.some((s) => s.id === id);
const insertAt = (idx, items) => group.settings.splice(idx, 0, ...items.filter((s) => !s.id || !has(s.id)));

if (!has('nurellea_product')) {
  insertAt(0, [
    { type: 'header', content: 'Primary product' },
    {
      type: 'product',
      id: 'nurellea_product',
      label: 'Gut Gummies product',
      info: 'Single source of truth for price, variants, stock and product facts used across the homepage, ingredients and FAQ sections. Sections can override it.',
    },
  ]);
}

if (!has('brand_instagram')) {
  group.settings.push(
    { type: 'header', content: 'Social profiles' },
    { type: 'paragraph', content: 'Only add verified Nurellea profiles. Used in the footer and Organization structured data.' },
    { type: 'url', id: 'brand_instagram', label: 'Instagram' },
    { type: 'url', id: 'brand_tiktok', label: 'TikTok' },
    { type: 'url', id: 'brand_facebook', label: 'Facebook' },
    { type: 'url', id: 'brand_pinterest', label: 'Pinterest' },
    { type: 'url', id: 'brand_youtube', label: 'YouTube' }
  );
}

if (!has('supplement_disclaimer')) {
  group.settings.push(
    { type: 'header', content: 'Compliance' },
    {
      type: 'textarea',
      id: 'supplement_disclaimer',
      label: 'Supplement disclaimer (footer + product page)',
      info: 'Confirm the wording required for your selling markets with your compliance advisor.',
      default:
        'Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle. Do not exceed the recommended daily dose. If you are pregnant, breastfeeding, taking medication or have a medical condition, consult your doctor before use. This product is not intended to diagnose, treat, cure or prevent any disease.',
    }
  );
}

writeFileSync(file, JSON.stringify(schema, null, 2) + '\n');
console.log('Nurellea store settings:', group.settings.filter((s) => s.id).map((s) => s.id).join(', '));
