// SAMPLE DATA for the local mock preview only, used to exercise the layout. Apart from the bag price and pouch
// photo (copied from the live product), none of it is Nurellea product information, ingredients or reviews.

const mf = (type, value) => ({ type, value });

const variant = (id, title, price, compare, available, badge, caption) => ({
  id,
  title,
  name: title,
  price,
  compare_at_price: compare,
  available,
  url: `/products/gut-gummies?variant=${id}`,
  sku: '',
  barcode: '',
  featured_media: null,
  unit_price_measurement: null,
  quantity_rule: { min: 1, max: null, increment: 1 },
  selling_plan_allocations: [],
  metafields: { nurellea: { badge: badge ? mf('single_line_text_field', badge) : undefined, caption: caption ? mf('single_line_text_field', caption) : undefined } },
  options: [title],
  option1: title,
});

// One variant, like the live product; bundle options are quantity-based theme blocks.
const variants = [variant(9001, 'Default Title', 4019, null, true, null, null)];

const pouch = { src: '/assets/nurellea-gut-gummies-pouch.webp', alt: 'Nurellea Gut Gummies pouch', width: 819, height: 819 };
const pouchMedia = { id: 5001, media_type: 'image', ...pouch, preview_image: pouch };

// Sample values layered over theme/section settings in the preview only, so optional UI (bundle discounts,
// free-shipping pill) can be checked. The real values are entered in the theme editor.
export const previewThemeSettings = { free_shipping_threshold: 50 };
export const previewSectionSettings = { 'nurellea-main-product': { bundle_discounts_live: true } };

const ingredient = (n) => ({
  name: mf('single_line_text_field', `Sample ingredient ${n}`),
  amount: mf('single_line_text_field', '— mg'),
  summary: mf('single_line_text_field', 'Ingredient summary is entered on the ingredient metaobject.'),
  image: undefined,
});

export const product = {
  id: 7001,
  title: 'Gut Gummies (sample product)',
  handle: 'gut-gummies',
  url: '/products/gut-gummies',
  type: 'Gummies',
  vendor: 'Nurellea',
  available: true,
  description: '<p>Sample product description. The real description is written in Shopify admin → Products.</p>',
  content: '<p>Sample product description. The real description is written in Shopify admin → Products.</p>',
  price: 4019,
  price_min: 4019,
  price_max: 4019,
  compare_at_price: null,
  compare_at_price_max: null,
  price_varies: false,
  has_only_default_variant: true,
  requires_selling_plan: false,
  selling_plan_groups: [],
  options: ['Title'],
  options_with_values: [{ name: 'Title', position: 1, values: ['Default Title'], selected_value: 'Default Title' }],
  variants,
  selected_or_first_available_variant: variants[0],
  first_available_variant: variants[0],
  selected_variant: null,
  featured_image: pouch,
  featured_media: pouchMedia,
  media: [pouchMedia],
  images: [pouch],
  tags: [],
  metafields: {
    nurellea: {
      subtitle: mf('single_line_text_field', 'Sample subtitle from the product metafield'),
      highlights: mf('list.single_line_text_field', ['Sample highlight', 'Sample highlight']),
      benefits: mf('list.single_line_text_field', ['Sample benefit line one', 'Sample benefit line two', 'Sample benefit line three']),
      ingredients: mf('list.metaobject_reference', [ingredient(1), ingredient(2), ingredient(3), ingredient(4)]),
      allergens: mf('multi_line_text_field', 'Sample allergen statement.'),
      serving_size: mf('single_line_text_field', 'Sample serving size'),
      servings_per_container: mf('single_line_text_field', '—'),
      directions: mf('multi_line_text_field', 'Sample directions entered in the product metafield.'),
      warnings: mf('multi_line_text_field', 'Sample warning text entered in the product metafield.'),
      storage: mf('multi_line_text_field', 'Sample storage note.'),
      supplement_facts: mf('json', {
        serving_size: 'Sample serving',
        servings_per_container: '—',
        rows: [
          { name: 'Sample ingredient 1', amount: '— mg', dv: '†' },
          { name: 'Sample ingredient 2', amount: '— mg', dv: '†' },
        ],
        footnote: '† Daily value not established. Sample table only.',
      }),
    },
    reviews: {},
  },
};

export const collection = {
  id: 5001,
  title: 'Shop',
  handle: 'all',
  url: '/collections/all',
  description: '',
  products: [product],
  all_products_count: 1,
  products_count: 1,
  sort_by: 'manual',
  default_sort_by: 'manual',
  sort_options: [
    { name: 'Featured', value: 'manual' },
    { name: 'Price, low to high', value: 'price-ascending' },
    { name: 'Price, high to low', value: 'price-descending' },
  ],
  image: null,
  metafields: {},
};

export const article = {
  id: 3001,
  title: 'Sample journal article',
  handle: 'sample-article',
  url: '/blogs/journal/sample-article',
  author: 'Nurellea',
  published_at: '2026-09-01T09:00:00Z',
  excerpt: '<p>Sample excerpt. Journal posts are written in Shopify admin → Blog posts.</p>',
  excerpt_or_content: '<p>Sample excerpt. Journal posts are written in Shopify admin → Blog posts.</p>',
  content: '<p>This is sample article content used only to preview the article layout.</p><h2>A sample subheading</h2><p>Real articles are written in Shopify admin.</p>',
  image: null,
  tags: ['Routine'],
  comments: [],
  comments_count: 0,
  comments_enabled: true,
  comment_post_url: '/blogs/journal/sample-article/comments',
  moderated: true,
  metafields: {},
};

export const blog = {
  id: 2001,
  title: 'Journal',
  handle: 'journal',
  url: '/blogs/journal',
  articles: [article],
  articles_count: 1,
  all_tags: ['Routine'],
  tags: ['Routine'],
  comments_enabled: true,
  metafields: {},
};

export const shop = {
  name: 'Nurellea',
  url: 'http://localhost:4173',
  secure_url: 'http://localhost:4173',
  domain: 'localhost',
  email: '',
  currency: 'USD',
  money_format: '${{amount}}',
  enabled_payment_types: ['visa', 'master', 'american_express', 'paypal'],
  policies: [],
  shipping_policy: null,
  refund_policy: null,
  privacy_policy: null,
  terms_of_service: null,
  metaobjects: { nurellea_review: { values: [] }, nurellea_faq: { values: [] } },
};

export const page = (title) => ({
  id: 4001,
  title,
  handle: title.toLowerCase().replace(/\s+/g, '-'),
  url: `/pages/${title.toLowerCase().replace(/\s+/g, '-')}`,
  content: `<p>Sample page body for “${title}”. This text is entered in Shopify admin → Pages.</p>`,
  metafields: {},
});
