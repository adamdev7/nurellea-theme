// MOCKED: renders sections/order-tracking.liquid with liquidjs (schema/stylesheet stripped). No App Manager request is made.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Liquid } from 'liquidjs';
import { read } from './helpers.mjs';

const SOURCE = read('sections/order-tracking.liquid')
  .replace(/{%\s*stylesheet\s*%}[\s\S]*?{%\s*endstylesheet\s*%}/, '')
  .replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/, '')
  .replace(/{%\s*render 'nurellea-icon'[^%]*%}/g, '<svg data-icon></svg>');

const engine = new Liquid();
engine.registerFilter('t', (key) => key);
engine.registerFilter('asset_url', (name) => `/cdn/${name}`);

const SECTION_SETTINGS = {
  color_scheme: 'scheme-2',
  show_help: true,
  help_title: 'Need help with your order?',
  help_text: 'Our team can help.',
  help_link: '/pages/contact',
  help_link_label: 'Contact support',
  show_shipping_summary: true,
  fallback_heading: "Where's my order?",
  fallback_text: 'We email tracking details when your order ships.',
};

const render = (settings, { design_mode = false, accounts = true } = {}) =>
  engine.parseAndRender(SOURCE, {
    section: { id: 'main', settings: SECTION_SETTINGS },
    settings: {
      app_manager_api_base: 'https://appmanager.store',
      shipping_summary: 'Orders are processed in 2–4 days, then delivered in 5–12 business days.',
      ...settings,
    },
    shop: { customer_accounts_enabled: accounts },
    routes: { account_url: '/account' },
    request: { design_mode },
  });

test('without a Store ID shoppers get a help card, not a broken lookup form', async () => {
  const out = await render({ app_manager_store_id: '' });
  assert.match(out, /Where's my order\?/);
  assert.match(out, /href="\/account"/);
  assert.match(out, /href="\/pages\/contact"/);
  assert.match(out, /processed in 2–4 days/);
  assert.doesNotMatch(out, /data-order-tracking/);
  assert.doesNotMatch(out, /data-tracking-form/);
  assert.doesNotMatch(out, /order-tracking\.js/);
  assert.doesNotMatch(out, /Setup needed/, 'setup note is editor-only');
});

test('the merchant sees a setup note in the theme editor until the Store ID is set', async () => {
  const out = await render({ app_manager_store_id: '' }, { design_mode: true });
  assert.match(out, /Setup needed/);
});

test('the account link is hidden when customer accounts are off', async () => {
  const out = await render({ app_manager_store_id: '' }, { accounts: false });
  assert.doesNotMatch(out, /href="\/account"/);
});

test('with a Store ID the lookup form, script and shipping times render', async () => {
  const out = await render({ app_manager_store_id: 'store-uuid-123' });
  assert.match(out, /data-order-tracking/);
  assert.match(out, /data-store-id="store-uuid-123"/);
  assert.match(out, /data-api-base="https:\/\/appmanager\.store"/);
  assert.match(out, /data-tracking-form/);
  assert.match(out, /\/cdn\/order-tracking\.js/);
  assert.match(out, /processed in 2–4 days/);
  assert.doesNotMatch(out, /Where's my order\?/);
});

test('a non-HTTPS API URL keeps the page in fallback mode', async () => {
  const out = await render({ app_manager_store_id: 'store-uuid-123', app_manager_api_base: 'http://localhost:3000' });
  assert.doesNotMatch(out, /data-tracking-form/);
});
