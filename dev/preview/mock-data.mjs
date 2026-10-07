// SAMPLE DATA for the local mock preview only. Every value here is a placeholder used to exercise the layout;
// none of it is Nurellea product information, pricing, ingredients or reviews.

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

const variants = [
  variant(9001, '1 jar', 2900, null, true, null, 'Sample caption'),
  variant(9002, '2 jars', 5400, 5800, true, 'Sample badge', 'Sample caption'),
  variant(9003, '3 jars', 7500, 8700, false, null, 'Sample caption'),
];

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
  price: 2900,
  price_min: 2900,
  price_max: 7500,
  compare_at_price: null,
  compare_at_price_max: 8700,
  price_varies: true,
  has_only_default_variant: false,
  requires_selling_plan: false,
  selling_plan_groups: [],
  options: ['Bundle'],
  options_with_values: [{ name: 'Bundle', position: 1, values: variants.map((v) => v.title), selected_value: '1 jar' }],
  variants,
  selected_or_first_available_variant: variants[0],
  first_available_variant: variants[0],
  selected_variant: null,
  featured_image: null,
  featured_media: null,
  media: [],
  images: [],
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
