// Renders snippets/nurellea-plan-days.liquid with liquidjs against selling plans shaped like Shopify's Liquid objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Liquid } from 'liquidjs';
import { read } from './helpers.mjs';

const engine = new Liquid();
const SNIPPET = read('snippets/nurellea-plan-days.liquid');
const days = async (name, values = []) =>
  Number((await engine.parseAndRender(SNIPPET, { plan: { name, options: values.map((value) => ({ value })) } })).trim());

test('reads the delivery frequency of typical subscription plan names and options', async () => {
  assert.equal(await days('Delivery every 30 days'), 30);
  assert.equal(await days('Delivery every 60 days'), 60);
  assert.equal(await days('Deliver every 90 days, save 20%'), 90);
  assert.equal(await days('Subscribe & save', ['2 months']), 60);
  assert.equal(await days('Every 3 months'), 90);
  assert.equal(await days('Monthly subscription, save 20%'), 30);
  assert.equal(await days('Save 20% monthly'), 30, 'a discount percentage is not a frequency');
  assert.equal(await days('Quarterly'), 90);
  assert.equal(await days('Every 2 weeks'), 14);
  assert.equal(await days('Auto refill'), 0);
});

test('option values win over the plan name', async () => {
  assert.equal(await days('Every month', ['3 months']), 90);
});
