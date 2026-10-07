// MOCKED: exercises assets/meta-capi-attribution.js in jsdom with a fake fetch. No beacon reaches App Manager.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindow, read, mockResponse, tick } from './helpers.mjs';

const SCRIPT = read('assets/meta-capi-attribution.js');
const PDP_HTML = `<!doctype html><html><body>
  <form action="/cart/add" method="post" data-type="add-to-cart-form">
    <input type="hidden" name="id" value="111">
    <input name="quantity" value="2">
    <button type="submit" name="add">Add</button>
  </form></body></html>`;

function boot(config) {
  const env = createWindow({
    url: 'https://nurellea.test/products/gut-gummies',
    html: PDP_HTML,
    routes: (url) => (url.endsWith('/cart.js') ? mockResponse({ token: 'tok123', items: [] }) : undefined),
  });
  env.window.__META_CAPI__ = config;
  env.window.eval(SCRIPT);
  const beacons = () =>
    env.calls
      .filter((c) => c.url.includes('/browser-event'))
      .map((c) => ({ url: c.url, body: JSON.parse(c.init.body) }));
  return { ...env, beacons };
}

const CONFIGURED = {
  enabled: true,
  apiBase: 'https://appmanager.example/api/v1',
  storeId: 'nurellea-test-store',
  browserToken: 'test-token',
  currency: 'USD',
  pageType: 'product',
  productId: 999,
  variantId: 111,
  productPrice: 24,
};

test('no beacons are sent while the Nurellea store ID / token are not configured', async () => {
  const { window, beacons } = boot({ ...CONFIGURED, storeId: '', browserToken: '' });
  window.MetaCapiAttribution.fireAddToCart(111, 1, 24);
  await tick(500);
  assert.equal(beacons().length, 0);
});

test('a Horizon add-to-cart (form submit + fetch /cart/add) produces exactly one AddToCart beacon', async () => {
  const { window, beacons } = boot(CONFIGURED);
  const form = window.document.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Mirrors assets/product-form.js: POST FormData to Theme.routes.cart_add_url
    window.fetch('/cart/add', { method: 'POST', body: new window.FormData(form) });
  });
  form.requestSubmit(form.querySelector('button'));
  await tick(50);

  const atc = beacons().filter((b) => b.body.event_name === 'AddToCart');
  assert.equal(atc.length, 1, 'duplicate AddToCart beacons');
  assert.deepEqual(atc[0].body.content_ids, ['111']);
  assert.equal(atc[0].body.num_items, 2);
  assert.equal(atc[0].body.value, 48);
  assert.match(atc[0].url, /\/meta-capi\/stores\/nurellea-test-store\/browser-event\?token=test-token$/);
});

test('AddToCart uses the variant price kept in sync by the product page', async () => {
  const { window, beacons } = boot({ ...CONFIGURED });
  window.__META_CAPI__.variantId = 222;
  window.__META_CAPI__.productPrice = 39.5;
  window.fetch('/cart/add.js', { method: 'POST', body: JSON.stringify({ id: 222, quantity: 1 }) });
  await tick(50);
  const atc = beacons().filter((b) => b.body.event_name === 'AddToCart');
  assert.equal(atc.length, 1);
  assert.equal(atc[0].body.value, 39.5);
});

test('a failed /cart/add request does not fire AddToCart from the network hook', async () => {
  const env = createWindow({
    url: 'https://nurellea.test/products/gut-gummies',
    routes: (url) => (url.includes('/cart/add') ? mockResponse({ status: 422 }, { status: 422 }) : mockResponse({ token: 't' })),
  });
  env.window.__META_CAPI__ = CONFIGURED;
  env.window.eval(SCRIPT);
  env.window.fetch('/cart/add.js', { method: 'POST', body: JSON.stringify({ id: 5, quantity: 1 }) });
  await tick(50);
  const atc = env.calls.filter((c) => c.url.includes('/browser-event') && JSON.parse(c.init.body).event_name === 'AddToCart');
  assert.equal(atc.length, 0);
});

test('PageView is deduplicated per path within a session', async () => {
  const first = boot(CONFIGURED);
  await tick(50);
  const pv = first.beacons().filter((b) => b.body.event_name === 'PageView');
  assert.equal(pv.length, 1);
  first.window.eval(SCRIPT); // a second load of the script on the same page/session
  await tick(50);
  assert.equal(first.beacons().filter((b) => b.body.event_name === 'PageView').length, 1);
});

test('the storefront never emits a browser-side Purchase event', () => {
  for (const file of ['assets/meta-capi-attribution.js', 'assets/nurellea.js', 'layout/theme.liquid', 'sections/nurellea-order-status.liquid']) {
    assert.doesNotMatch(read(file), /['"]Purchase['"]/, `${file} must not send Purchase; it is confirmed server-side`);
  }
});
