// MOCKED DOM: runs assets/nurellea.js in jsdom against hand-written markup that mirrors the section output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindow, read, tick, ready } from './helpers.mjs';

const SCRIPT = read('assets/nurellea.js');

const productJson = {
  strings: { save: 'Save', in_stock: 'In stock', sold_out: 'Sold out', add_to_cart: 'Add to cart' },
  variants: [
    { id: 1, title: '1 jar', available: true, price: '$24.00', price_cents: 2400, compare_at: '', savings: '', featured_media_id: null },
    { id: 2, title: '3 jars', available: true, price: '$60.00', price_cents: 6000, compare_at: '$72.00', savings: '$12.00', featured_media_id: null },
    { id: 3, title: '6 jars', available: false, price: '$108.00', price_cents: 10800, compare_at: '', savings: '', featured_media_id: null },
  ],
};

const PDP = `<!doctype html><html><body>
<div data-nl-product>
  <script type="application/json" data-nl-product-json>${JSON.stringify(productJson)}</script>
  <span data-nl-price></span><s data-nl-compare></s><span data-nl-save></span><span data-nl-stock></span>
  <form data-type="add-to-cart-form" action="/cart/add" method="post">
    <input type="hidden" name="id" value="1">
    <label><input type="radio" name="nl-variant" value="1" data-nl-variant-input checked>1</label>
    <label><input type="radio" name="nl-variant" value="2" data-nl-variant-input>3</label>
    <label><input type="radio" name="nl-variant" value="3" data-nl-variant-input>6</label>
    <div data-nl-buy-area><div data-nl-qty><button type="button" data-nl-qty-minus>-</button><input name="quantity" type="number" min="1" value="1"><button type="button" data-nl-qty-plus>+</button></div>
    <button type="submit" name="add"><span data-nl-atc-label>Add to cart</span></button></div>
  </form>
</div>
<div data-nl-sticky-atc><span data-nl-price></span><button type="button" data-nl-sticky-submit><span data-nl-atc-label>Add to cart</span></button></div>
</body></html>`;

async function bootPdp() {
  const env = createWindow({ url: 'https://nurellea.test/products/gut-gummies', html: PDP });
  env.window.__META_CAPI__ = { variantId: 1, productPrice: 24 };
  env.window.eval(SCRIPT);
  await ready(env.window);
  return env;
}

const choose = (window, value) => {
  const input = window.document.querySelector(`input[data-nl-variant-input][value="${value}"]`);
  input.checked = true;
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
};

test('choosing a bundle updates the form variant id, URL, prices and Meta CAPI config', async () => {
  const { window } = await bootPdp();
  const doc = window.document;
  assert.equal(doc.querySelector('[data-nl-price]').textContent, '$24.00');
  choose(window, 2);
  assert.equal(doc.querySelector('input[name="id"]').value, '2');
  assert.equal(new URL(window.location.href).searchParams.get('variant'), '2');
  assert.equal(doc.querySelector('[data-nl-price]').textContent, '$60.00');
  assert.equal(doc.querySelector('[data-nl-sticky-atc] [data-nl-price]').textContent, '$60.00');
  assert.equal(doc.querySelector('[data-nl-compare]').textContent, '$72.00');
  assert.equal(doc.querySelector('[data-nl-save]').textContent, 'Save $12.00');
  assert.equal(window.__META_CAPI__.variantId, 2);
  assert.equal(window.__META_CAPI__.productPrice, 60);
});

test('sold-out variants disable both add-to-cart buttons and say so', async () => {
  const { window } = await bootPdp();
  choose(window, 3);
  const main = window.document.querySelector('button[name="add"]');
  const sticky = window.document.querySelector('[data-nl-sticky-submit]');
  assert.equal(main.disabled, true);
  assert.equal(sticky.disabled, true);
  assert.equal(main.textContent.trim(), 'Sold out');
  assert.equal(window.document.querySelector('[data-nl-stock]').textContent, 'Sold out');
});

test('sticky bar submits through the main product form (single add-to-cart path)', async () => {
  const { window } = await bootPdp();
  const form = window.document.querySelector('form');
  let submits = 0;
  let submitter = null;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submits += 1;
    submitter = e.submitter;
  });
  window.document.querySelector('[data-nl-sticky-submit]').click();
  assert.equal(submits, 1);
  assert.equal(submitter?.name, 'add');
});

test('quantity stepper respects the minimum', async () => {
  const { window } = await bootPdp();
  const input = window.document.querySelector('input[name="quantity"]');
  window.document.querySelector('[data-nl-qty-minus]').click();
  assert.equal(input.value, '1');
  window.document.querySelector('[data-nl-qty-plus]').click();
  assert.equal(input.value, '2');
});

const REVIEWS = `<!doctype html><html><body>
<div data-nl-reviews data-page-size="2">
  <select data-nl-reviews-sort><option value="newest">n</option><option value="lowest">l</option></select>
  <button data-nl-reviews-filter="all"></button><button data-nl-reviews-filter="verified"></button><button data-nl-reviews-filter="rating-5"></button>
  <span data-nl-reviews-count></span><p data-nl-reviews-empty hidden>none</p>
  <div data-nl-reviews-list>
    <article data-nl-review id="a" data-rating="5" data-date="2026-01-01" data-verified="true"></article>
    <article data-nl-review id="b" data-rating="3" data-date="2026-03-01" data-verified="false"></article>
    <article data-nl-review id="c" data-rating="5" data-date="2026-02-01" data-verified="false"></article>
  </div>
  <button data-nl-reviews-more>more</button>
</div></body></html>`;

test('reviews filter (verified, rating) and sort operate only on rendered, moderated entries', async () => {
  const env = createWindow({ html: REVIEWS });
  env.window.eval(SCRIPT);
  await ready(env.window);
  const doc = env.window.document;
  const visibleIds = () => [...doc.querySelectorAll('[data-nl-review]')].filter((e) => !e.hidden).map((e) => e.id);
  assert.deepEqual(visibleIds(), ['b', 'c'], 'newest first, page size 2');
  doc.querySelector('[data-nl-reviews-more]').click();
  assert.deepEqual(visibleIds(), ['b', 'c', 'a']);
  doc.querySelector('[data-nl-reviews-filter="verified"]').click();
  assert.deepEqual(visibleIds(), ['a']);
  assert.equal(doc.querySelector('[data-nl-reviews-count]').textContent, '1');
  doc.querySelector('[data-nl-reviews-filter="rating-5"]').click();
  assert.deepEqual(visibleIds(), ['c', 'a']);
  const sort = doc.querySelector('[data-nl-reviews-sort]');
  doc.querySelector('[data-nl-reviews-filter="all"]').click();
  sort.value = 'lowest';
  sort.dispatchEvent(new env.window.Event('change'));
  assert.equal(visibleIds()[0], 'b');
});

test('with no published reviews, the "no reviews match this filter" message stays hidden', async () => {
  const env = createWindow({ html: '<div data-nl-reviews><div data-nl-reviews-list></div><p data-nl-reviews-empty hidden>none match</p><button data-nl-reviews-more hidden></button></div>' });
  env.window.eval(SCRIPT);
  await ready(env.window);
  assert.equal(env.window.document.querySelector('[data-nl-reviews-empty]').hidden, true);
});

test('FAQ search hides non-matching questions and shows the empty state', async () => {
  const env = createWindow({
    html: `<div data-nl-faq><input data-nl-faq-search><div data-nl-faq-group><details data-nl-faq-item data-category="orders"><summary>Where is my order?</summary></details>
      <details data-nl-faq-item data-category="product"><summary>How do I take them?</summary></details></div><p data-nl-faq-empty hidden></p></div>`,
  });
  env.window.eval(SCRIPT);
  await ready(env.window);
  const doc = env.window.document;
  const search = doc.querySelector('[data-nl-faq-search]');
  search.value = 'order';
  search.dispatchEvent(new env.window.Event('input'));
  const shown = [...doc.querySelectorAll('[data-nl-faq-item]')].filter((e) => !e.hidden);
  assert.equal(shown.length, 1);
  search.value = 'zzz';
  search.dispatchEvent(new env.window.Event('input'));
  await tick();
  assert.equal(doc.querySelector('[data-nl-faq-empty]').hidden, false);
});

test('order-status page shows the right panel and never reports a purchase', () => {
  const section = read('sections/nurellea-order-status.liquid');
  const script = section.match(/<script>([\s\S]*?)<\/script>/)[1].replace("{{ routes.cart_clear_url }}", '/cart/clear');
  const markup = section.match(/<section[\s\S]*?<\/section>/)[0].replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g, '');
  for (const [state, panel] of [['success', 'success'], ['declined', 'failed'], ['canceled', 'cancelled'], ['', 'default'], ['<script>', 'default']]) {
    const env = createWindow({ url: `https://nurellea.test/pages/order-status?state=${encodeURIComponent(state)}`, html: `<body>${markup}</body>` });
    env.window.eval(script);
    const visible = [...env.window.document.querySelectorAll('[data-state-panel]')].filter((p) => !p.hidden).map((p) => p.dataset.statePanel);
    assert.deepEqual(visible, [panel], `state=${state}`);
    assert.equal(env.calls.length, 0, 'no network calls (cart clear is opt-in, no tracking)');
  }
});
