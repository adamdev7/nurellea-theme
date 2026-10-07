// MOCKED: runs assets/order-tracking.js in jsdom against a fake App Manager response. No real order is looked up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindow, read, mockResponse, tick } from './helpers.mjs';

const SCRIPT = read('assets/order-tracking.js');

const html = ({ apiBase = 'https://appmanager.store', storeId = '' } = {}) => `<!doctype html><html><body>
<div data-order-tracking data-active-state="form" data-api-base="${apiBase}" data-store-id="${storeId}"
     data-config-error="Order tracking is not set up yet." data-service-error="Service unavailable">
  <div data-tracking-state="form"><form data-tracking-form>
    <input data-tracking-order name="order"><input data-tracking-email name="email">
    <button data-tracking-submit type="submit">Track</button></form></div>
  <div data-tracking-state="loading" hidden></div>
  <div data-tracking-state="error" hidden><p data-tracking-error-message></p></div>
  <div data-tracking-state="result" hidden>
    <span data-tracking-status-badge></span><span data-tracking-status-label></span><p data-tracking-status-message></p>
    <div data-tracking-shipment-details></div><div data-tracking-shipment-meta></div>
    <span data-tracking-number></span><span data-tracking-carrier></span><span data-tracking-estimated-delivery></span>
    <ol data-tracking-timeline></ol><span data-order-number></span><span data-order-date></span><span data-order-total></span>
    <ul data-order-line-items></ul><button data-tracking-reset></button>
  </div>
</div></body></html>`;

function boot(opts, routes, query = '?order=1001&email=jane%40example.com') {
  const env = createWindow({ url: `https://nurellea.test/pages/track-order${query}`, html: html(opts), routes });
  env.window.eval(SCRIPT);
  return env;
}

test('blank App Manager store ID shows the configuration message and makes no request', async () => {
  const { window, calls } = boot({ storeId: '' });
  await tick(20);
  assert.equal(calls.length, 0);
  assert.equal(window.document.querySelector('[data-tracking-error-message]').textContent, 'Order tracking is not set up yet.');
});

test('the theme ships with no App Manager store ID (Nurellea must configure its own)', () => {
  const data = read('config/settings_data.json');
  assert.match(data, /"app_manager_store_id":\s*""/);
  assert.match(data, /"meta_capi_store_id":\s*""/);
  assert.match(data, /"meta_capi_browser_token":\s*""/);
});

test('configured lookup calls GET {apiBase}/api/track-order with store_id, order_number and email', async () => {
  const { window, calls } = boot({ storeId: 'nurellea-test' }, (url) =>
    url.includes('/api/track-order')
      ? mockResponse({ order_number: '#1001', shipped: false, status: 'unfulfilled', line_items: [], timeline: [] })
      : undefined
  );
  await tick(30);
  assert.equal(calls.length, 1);
  const u = new URL(calls[0].url);
  assert.equal(u.origin + u.pathname, 'https://appmanager.store/api/track-order');
  assert.equal(u.searchParams.get('store_id'), 'nurellea-test');
  assert.equal(u.searchParams.get('order_number'), '1001');
  assert.equal(u.searchParams.get('email'), 'jane@example.com');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(window.document.querySelector('[data-order-tracking]').dataset.activeState, 'result');
});

test('404 from App Manager is reported as order-not-found, never as success', async () => {
  const { window } = boot({ storeId: 'nurellea-test' }, (url) =>
    url.includes('/api/track-order') ? mockResponse({ detail: 'Order not found' }, { status: 404 }) : undefined
  );
  await tick(30);
  assert.equal(window.document.querySelector('[data-tracking-error-message]').textContent, 'Order not found');
  assert.equal(window.document.querySelector('[data-order-tracking]').dataset.activeState, 'error');
});

test('localhost API bases are refused', async () => {
  const { calls } = boot({ storeId: 'x', apiBase: 'http://localhost:3000' });
  await tick(20);
  assert.equal(calls.length, 0);
});
