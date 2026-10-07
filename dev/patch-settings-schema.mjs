// One-off: replaces Luxory-specific trailing groups in config/settings_schema.json
// with Nurellea store settings + configurable integrations (no Luxory defaults).
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../config/settings_schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(file, 'utf8'));

const drop = new Set(['Product bundles', 'Order tracking (App Manager)', 'Meta CAPI (App Manager)']);
const kept = schema.filter((g) => !drop.has(g.name) && !String(g.name).startsWith('Nurellea') && g.name !== 'Checkout routing (Phoenix)');

const nurellea = {
  name: 'Nurellea store',
  settings: [
    {
      type: 'paragraph',
      content:
        'Business details and offers shown to customers. Leave a field blank until it is confirmed — blank fields are hidden on the storefront rather than filled with guesses.',
    },
    { type: 'header', content: 'Customer support' },
    { type: 'text', id: 'brand_support_email', label: 'Support email', info: 'Shown on Contact, FAQ, order status and policy pages.' },
    { type: 'text', id: 'brand_support_phone', label: 'Support phone (optional)' },
    { type: 'text', id: 'brand_support_hours', label: 'Support hours', info: 'Example: Monday–Friday, 9am–5pm ET' },
    { type: 'text', id: 'brand_response_time', label: 'Typical reply time', info: 'Only fill in if you can commit to it. Example: within 1 business day' },
    { type: 'header', content: 'Legal entity' },
    { type: 'text', id: 'brand_legal_name', label: 'Registered business name' },
    { type: 'textarea', id: 'brand_business_address', label: 'Business address', info: 'Used on Contact and legal pages.' },
    { type: 'header', content: 'Offers and promises' },
    {
      type: 'paragraph',
      content: 'Only enable offers your store actually honours. Prices, discounts and stock always come from Shopify product data and checkout — never from these fields.',
    },
    {
      type: 'number',
      id: 'free_shipping_threshold',
      label: 'Free shipping threshold (store currency, whole units)',
      info: 'Must match your Shopify shipping rates. Leave blank to hide all free-shipping messaging.',
    },
    { type: 'text', id: 'guarantee_text', label: 'Guarantee headline', info: 'Example: 30-day satisfaction guarantee. Must match your refund policy. Leave blank to hide.' },
    { type: 'text', id: 'shipping_summary', label: 'Short shipping note (product page)', info: 'Example: Ships from the US within 1–2 business days. Leave blank to show a link to the shipping policy only.' },
    {
      type: 'checkbox',
      id: 'subscriptions_enabled',
      label: 'Offer subscriptions',
      default: false,
      info: 'Requires a subscription app that creates selling plans, and a checkout that supports them. Plans only appear on products that have them.',
    },
    { type: 'url', id: 'subscription_portal_url', label: 'Manage subscription link', info: 'Customer portal URL from your subscription app.' },
    { type: 'header', content: 'Cart behaviour' },
    {
      type: 'checkbox',
      id: 'skip_cart_to_checkout',
      label: 'Skip cart and send shoppers straight to checkout',
      default: false,
      info: 'Legacy behaviour from the previous store. When off, shoppers use the cart drawer and cart page.',
    },
    { type: 'header', content: 'Reviews' },
    {
      type: 'checkbox',
      id: 'reviews_allow_submissions',
      label: 'Show “Write a review” form',
      default: true,
      info: 'Submissions are emailed to the store via the Shopify contact form for moderation. Nothing is published automatically.',
    },
    {
      type: 'checkbox',
      id: 'reviews_demo_preview',
      label: 'Show labelled sample reviews in the theme editor',
      default: false,
      info: 'Design preview only. Samples never render on the live storefront and are never included in structured data.',
    },
    { type: 'header', content: 'Search engines and launch' },
    {
      type: 'text',
      id: 'seo_primary_domain',
      label: 'Primary storefront domain',
      info: 'Example: www.nurellea.com. Pages served from any other host (preview, myshopify.com, staging) are marked noindex.',
    },
    {
      type: 'checkbox',
      id: 'seo_noindex_all',
      label: 'Keep entire storefront out of search results',
      default: false,
      info: 'Use for staging or before launch.',
    },
    { type: 'textarea', id: 'seo_default_description', label: 'Fallback meta description', info: 'Used when a page has no description of its own. Keep under 160 characters.' },
    { type: 'image_picker', id: 'share_image', label: 'Default social sharing image', info: '1200 × 630 px recommended. Falls back to the bundled Nurellea image.' },
    { type: 'header', content: 'Development' },
    {
      type: 'checkbox',
      id: 'show_placeholder_labels',
      label: 'Label placeholder images',
      default: true,
      info: 'Adds a small “Placeholder” tag to illustrated stand-ins until real photography is uploaded.',
    },
    {
      type: 'checkbox',
      id: 'legacy_vendor_scripts',
      label: 'Load legacy jQuery and vendor scripts',
      default: false,
      info: 'Render-blocking scripts from the previous theme. Enable only if an installed app requires jQuery.',
    },
  ],
};

const phoenix = {
  name: 'Checkout routing (Phoenix)',
  settings: [
    {
      type: 'paragraph',
      content:
        'Routes cart checkout and Buy Now buttons to the Phoenix external checkout and fires its checkout_load / failed_to_redirect events plus the Meta CAPI InitiateCheckout beacon. When disabled or the URL is blank, shoppers use native Shopify checkout.',
    },
    { type: 'checkbox', id: 'phx_enabled', label: 'Enable Phoenix checkout redirect', default: false },
    {
      type: 'text',
      id: 'phx_checkout_url',
      label: 'Phoenix checkout URL',
      info: 'Nurellea’s own checkout domain, starting with https://. Never reuse another store’s checkout domain.',
    },
    {
      type: 'select',
      id: 'phx_routing_mode',
      label: 'Route',
      options: [
        { value: 'all', label: 'All carts' },
        { value: 'allowlist', label: 'Only carts containing allow-listed products' },
      ],
      default: 'all',
    },
    { type: 'text', id: 'phx_product_allowlist', label: 'Allow-listed product IDs', info: 'Comma-separated Shopify product IDs. Used only when Route is set to allow-list.' },
    {
      type: 'select',
      id: 'phx_buy_now_mode',
      label: 'Buy Now behaviour',
      options: [
        { value: 'variant_only', label: 'Checkout with only the selected variant' },
        { value: 'full_cart', label: 'Checkout with the whole cart' },
        { value: 'single', label: 'Clear cart, add one unit, checkout' },
      ],
      default: 'variant_only',
    },
  ],
};

const tracking = {
  name: 'Order tracking (App Manager)',
  settings: [
    {
      type: 'paragraph',
      content:
        'Connects the Track your order page to App Manager (https://appmanager.store). Copy the Nurellea Store ID from App Manager → Tracking → Shopify connection. Until it is set, the page shows a “not configured” message instead of querying another store.',
    },
    {
      type: 'text',
      id: 'app_manager_api_base',
      label: 'App Manager API URL',
      default: 'https://appmanager.store',
      info: 'Base URL only — no trailing slash and no /api/track-order (e.g. https://appmanager.store).',
    },
    { type: 'text', id: 'app_manager_store_id', label: 'App Manager Store ID', info: 'Nurellea store UUID from App Manager → Tracking → Shopify connection.' },
  ],
};

const metaCapi = {
  name: 'Meta CAPI (App Manager)',
  settings: [
    {
      type: 'paragraph',
      content:
        'Sends the Meta funnel to App Manager (PageView, ViewContent, Search, AddToCart, InitiateCheckout + Attribution cache). Purchase stays server-side from Shopify order webhooks. Copy the Nurellea Store ID and browser token from App Manager → Server-Side Tracking → Settings. No events are sent until both are set.',
    },
    { type: 'checkbox', id: 'meta_capi_enabled', label: 'Enable Meta CAPI storefront tracking', default: true },
    { type: 'text', id: 'meta_capi_api_base', label: 'App Manager API base (with /api/v1)', default: 'https://appmanager.store/api/v1' },
    { type: 'text', id: 'meta_capi_store_id', label: 'App Manager Store ID', info: 'Falls back to the Order tracking Store ID if left blank.' },
    {
      type: 'text',
      id: 'meta_capi_browser_token',
      label: 'Browser event token',
      info: 'Required. From App Manager → Server-Side Tracking → Settings. Without this token, funnel events are not sent.',
    },
  ],
};

writeFileSync(file, JSON.stringify([...kept, nurellea, phoenix, tracking, metaCapi], null, 2) + '\n');
console.log('settings_schema groups:', [...kept, nurellea, phoenix, tracking, metaCapi].map((g) => g.name).join(' | '));
