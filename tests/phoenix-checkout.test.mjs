// MOCKED: renders the Phoenix block of layout/theme.liquid with liquidjs and runs the resulting script in jsdom.
// The Phoenix SDK is never downloaded (jsdom does not load external scripts) and no checkout is created.
// Test-only transformation: assignments to window.location.href are captured instead of navigating.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Liquid } from 'liquidjs';
import { createWindow, read, mockResponse, tick, ready } from './helpers.mjs';

const layout = read('layout/theme.liquid');
const start = layout.indexOf('{%- liquid\n      assign phx_checkout_url');
const endMarker = "using native Shopify checkout.');</script>\n    {%- endif -%}";
const end = layout.indexOf(endMarker) + endMarker.length;
const PHX_TEMPLATE = layout.slice(start, end);

const engine = new Liquid();
engine.registerFilter('json', (v) => JSON.stringify(v ?? null));

const render = (settings, design_mode = false) =>
  engine.parseAndRender(PHX_TEMPLATE, { settings, request: { design_mode } });

const BASE = {
  phx_enabled: true,
  phx_checkout_url: 'https://checkout.nurellea.example/start',
  phx_routing_mode: 'all',
  phx_product_allowlist: '',
  phx_buy_now_mode: 'variant_only',
};

test('the Phoenix block was found in theme.liquid', () => {
  assert.ok(start > 0 && end > start, 'PHX block markers moved; update this test');
  assert.match(PHX_TEMPLATE, /PHX:REDIRECT_SCRIPT:START/);
  assert.match(PHX_TEMPLATE, /PHX:REDIRECT_SCRIPT:END/);
});

test('Phoenix is off by default: no redirect script, native Shopify checkout', async () => {
  const out = await render({ ...BASE, phx_enabled: false });
  assert.doesNotMatch(out, /PHX:REDIRECT_SCRIPT:START/);
  assert.doesNotMatch(out, /<script/);
});

test('enabled without a URL, or with a non-https URL, falls back to native checkout', async () => {
  for (const url of ['', '   ', 'http://checkout.example/x', 'javascript:alert(1)']) {
    const out = await render({ ...BASE, phx_checkout_url: url });
    assert.doesNotMatch(out, /PHX:REDIRECT_SCRIPT:START/, `url ${JSON.stringify(url)}`);
  }
  const editorOut = await render({ ...BASE, phx_checkout_url: '' }, true);
  assert.match(editorOut, /console\.warn\('\[PHX\]/, 'theme editor shows a configuration warning');
});

test('no hard-coded checkout URL or store remains in the script', async () => {
  const out = await render(BASE);
  const urls = out.match(/https:\/\/[^\s'"`)]+/g) || [];
  const allowed = new Set(['https://checkout.nurellea.example/start', 'https://io.ecommcheckout.com/phoenix.min.js']);
  for (const u of urls) assert.ok(allowed.has(u), `unexpected URL in Phoenix script: ${u}`);
});

async function runCheckout(settings, cart) {
  const out = await render(settings);
  const script = out.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/window\.location\.href\s*=/g, 'window.__phxNav =');
  const env = createWindow({
    url: 'https://nurellea.test/cart?utm_source=newsletter',
    html: '<!doctype html><html><body><form action="/cart" method="post"><button type="submit" name="checkout">Check out</button></form></body></html>',
    routes: (url) => (url.endsWith('/cart.js') ? mockResponse(cart) : undefined),
  });
  env.window.Shopify = { shop: 'nurellea-test.myshopify.com' };
  env.window.eval(script);
  await ready(env.window);
  env.window.document.querySelector('[name="checkout"], button').click();
  await tick(50);
  return env;
}

const CART = {
  token: 'c1%3Fkey%3Dabc',
  items: [{ product_id: 42, variant_id: 7, quantity: 1, price: 2400 }],
  total_price: 2400,
  item_count: 1,
  currency: { iso_code: 'USD' },
};

test('cart checkout button hands off to the configured Nurellea Phoenix URL with store + cart + UTM', async () => {
  const { window } = await runCheckout(BASE, CART);
  assert.ok(window.__phxNav, 'no redirect happened');
  const dest = new URL(window.__phxNav);
  assert.equal(dest.origin + dest.pathname, 'https://checkout.nurellea.example/start');
  assert.equal(dest.searchParams.get('store'), 'nurellea-test');
  assert.equal(dest.searchParams.get('cart'), 'c1?key=abc');
  assert.equal(dest.searchParams.get('utm_source'), 'newsletter');
});

test('allowlist mode keeps non-listed products on native Shopify checkout', async () => {
  const { window } = await runCheckout({ ...BASE, phx_routing_mode: 'allowlist', phx_product_allowlist: '1, 2' }, CART);
  assert.equal(window.__phxNav, '/checkout');
});

test('allowlist mode routes listed products to Phoenix', async () => {
  const { window } = await runCheckout({ ...BASE, phx_routing_mode: 'allowlist', phx_product_allowlist: '42' }, CART);
  assert.match(String(window.__phxNav), /^https:\/\/checkout\.nurellea\.example\/start\?/);
});
