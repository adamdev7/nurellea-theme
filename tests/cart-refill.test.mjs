// MOCKED: runs assets/component-cart-items.js in jsdom with its @theme/* imports replaced by small stubs.
// /cart/change requests are recorded, never sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindow, read, mockResponse, tick } from './helpers.mjs';

const SOURCE = read('assets/component-cart-items.js').replace(/^import[\s\S]*?from\s+'[^']+';\s*/gm, '');

const STUBS = `
  class Component extends HTMLElement {
    connectedCallback() {}
    disconnectedCallback() {}
    get refs() { return { cartItemRows: Array.from(this.querySelectorAll('[ref="cartItemRows[]"]')), quantitySelectors: [] }; }
  }
  const fetchConfig = (type, { body }) => ({ method: 'POST', body });
  const debounce = (fn) => fn;
  const onAnimationEnd = (el, cb) => cb();
  const prefersReducedMotion = () => true;
  const resetShimmer = () => {};
  const startViewTransition = (cb) => cb();
  const morphSection = (id, html) => {
    const next = new DOMParser().parseFromString(html, 'text/html').querySelector('cart-items-component');
    document.querySelector('cart-items-component').innerHTML = next.innerHTML;
  };
  const sectionRenderer = { renderSection: async () => {} };
  const ThemeEvents = { cartUpdate: 'cart:update', discountUpdate: 'discount:update', quantitySelectorUpdate: 'quantity-selector:update' };
  class CartUpdateEvent extends Event {
    constructor(resource, sourceId, data) { super('cart:update', { bubbles: true }); this.detail = { resource, sourceId, data }; }
  }
  class CartAddEvent extends CartUpdateEvent {}
  class DiscountUpdateEvent extends Event {}
  class QuantitySelectorUpdateEvent extends Event {}
  const cartPerformance = { createStartingMarker: () => null, measureFromMarker: () => {} };
  window.Theme = { routes: { cart_change_url: '/cart/change' } };
`;

const PLANS = '301:30,601:60,901:90,';
const row = ({ key = 'k1', plan = '301', qty = 1, units = 1, subscription = true } = {}) =>
  `<tr ref="cartItemRows[]" data-key="${key}"${
    subscription ? ` data-nl-refill-plan="${plan}" data-nl-refill-plans="${PLANS}" data-nl-refill-units="${units}" data-nl-refill-qty="${qty}"` : ''
  }></tr>`;
const cartHtml = (rows) => `<cart-items-component data-section-id="s1"><table><tbody>${rows}</tbody></table></cart-items-component>`;

function boot(rows, responseRows = rows) {
  const env = createWindow({
    html: `<!doctype html><html><body>${cartHtml(rows)}</body></html>`,
    routes: (url) => (url === '/cart/change' ? mockResponse({ items: [], sections: { s1: cartHtml(responseRows()) } }) : undefined),
  });
  env.window.eval(`${STUBS}\n${SOURCE}`);
  const changes = () => env.calls.filter((c) => c.url === '/cart/change').map((c) => JSON.parse(c.init.body));
  return { ...env, cart: env.window.document.querySelector('cart-items-component'), changes };
}

test('changing the bags of an auto refill line in the cart switches its frequency: 1 → 30 days, 2 → 60, 3 → 90', async () => {
  for (const [quantity, plan] of [[2, 601], [3, 901]]) {
    const { cart, changes } = boot(row(), () => row({ plan: String(plan), qty: quantity }));
    cart.updateQuantity({ line: 1, quantity, action: 'change' });
    await tick(10);
    assert.equal(changes()[0].selling_plan, plan, `${quantity} bags`);
    assert.equal(changes()[0].quantity, quantity);
    assert.equal(changes().length, 1, 'no follow-up change once the plan matches');
  }
  const { cart, changes } = boot(row({ plan: '901', qty: 3 }), () => row({ plan: '301', qty: 1 }));
  cart.updateQuantity({ line: 1, quantity: 1, action: 'change' });
  await tick(10);
  assert.equal(changes()[0].selling_plan, 301, 'back down to 1 bag → every 30 days');
});

test('more than 3 bags stays on the 90-day plan', async () => {
  const fromMonthly = boot(row(), () => row({ plan: '901', qty: 5 }));
  fromMonthly.cart.updateQuantity({ line: 1, quantity: 5, action: 'change' });
  await tick(10);
  assert.equal(fromMonthly.changes()[0].selling_plan, 901);

  const already90 = boot(row({ plan: '901', qty: 3 }), () => row({ plan: '901', qty: 6 }));
  already90.cart.updateQuantity({ line: 1, quantity: 6, action: 'change' });
  await tick(10);
  assert.equal('selling_plan' in already90.changes()[0], false, 'plan unchanged, only the quantity');
});

test('one-time purchase lines never get a selling plan', async () => {
  const { cart, changes } = boot(row({ subscription: false }), () => row({ subscription: false }));
  cart.updateQuantity({ line: 1, quantity: 3, action: 'change' });
  await tick(10);
  assert.equal('selling_plan' in changes()[0], false);
});

test('adding more of the same product (merged into a 2-bag line on the monthly plan) is corrected to every 60 days', async () => {
  const { window, changes } = boot(row(), () => row({ plan: '601', qty: 2 }));
  const merged = cartHtml(row({ qty: 2, plan: '301' }));
  window.document.dispatchEvent(
    new window.CustomEvent('cart:update', { detail: { data: { sections: { s1: merged } } } })
  );
  await tick(10);
  assert.deepEqual(
    changes().map(({ line, quantity, selling_plan }) => ({ line, quantity, selling_plan })),
    [{ line: 1, quantity: 2, selling_plan: 601 }]
  );
});

test('a plan switch Shopify does not apply is not retried in a loop', async () => {
  const { window, changes } = boot(row(), () => row({ plan: '301', qty: 2, key: 'k9' }));
  window.document.dispatchEvent(
    new window.CustomEvent('cart:update', { detail: { data: { sections: { s1: cartHtml(row({ qty: 2, key: 'k9' })) } } } })
  );
  await tick(30);
  assert.equal(changes().length, 1);
});
