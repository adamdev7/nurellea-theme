// Generates the Nurellea JSON templates and section groups.
// Copy rules: no medical claims, outcomes, timelines, ratings, counts or endorsements.
// Product facts are never written here — they come from product metafields.
import { writeFileSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const write = (path, data) => {
  writeFileSync(new URL(path, root), JSON.stringify(data, null, 2) + '\n');
  console.log('wrote', path);
};

const blocks = (prefix, list) => {
  const out = { blocks: {}, block_order: [] };
  list.forEach((b, i) => {
    const id = `${prefix}_${i + 1}`;
    out.blocks[id] = { type: b.type, settings: b.settings || {} };
    out.block_order.push(id);
  });
  return out;
};
const section = (type, settings = {}, blockList, extra = {}) => ({
  type,
  ...(blockList ? blocks(type.replace(/[^a-z]/g, '').slice(0, 8), blockList) : {}),
  settings,
  ...extra,
});
const template = (sections, extra = {}) => {
  const out = { ...extra, sections: {}, order: [] };
  for (const [id, s] of sections) {
    out.sections[id] = s;
    out.order.push(id);
  }
  return out;
};

const q = (question, answer, category) => ({ type: 'question', settings: { question, answer, category } });

const FAQ = {
  track: q('How do I track my order?', '<p>Use our <a href="/pages/track-order">order tracking page</a> with your order number and the email address you used at checkout. Shipping confirmation emails include tracking details when they are available.</p>', 'Orders & shipping'),
  shipping: q('Where do you ship, and how much does shipping cost?', '<p>Delivery destinations, options and costs are shown at checkout before you pay. See our <a href="/pages/shipping">shipping information</a> for details.</p>', 'Orders & shipping'),
  change: q('Can I change or cancel my order?', '<p>Please <a href="/pages/contact">contact us</a> as soon as possible with your order number. We will do our best to help if your order has not been shipped yet.</p>', 'Orders & shipping'),
  returns: q('What is your return policy?', '<p>Please see our <a href="/pages/returns">returns information</a> for eligibility and how to start a return.</p>', 'Orders & shipping'),
  inside: q("What's in Nurellea Gut Gummies?", '<p>The full ingredient list, supplement facts and allergen information are on our <a href="/pages/ingredients">ingredients page</a> and on the product page, exactly as they appear on the label.</p>', 'Product'),
  take: q('How do I take them?', '<p>Follow the directions on the label. The serving size and directions are also listed on the product page and the <a href="/pages/ingredients#how-to-use">how to use</a> section.</p>', 'Product'),
  medical: q('Can I take them if I am pregnant, breastfeeding or taking medication?', '<p>Please speak with your doctor or pharmacist before taking any food supplement if you are pregnant, breastfeeding, taking medication or have a medical condition. Always read the warnings on the label.</p>', 'Product'),
  diet: q('Are they suitable for my diet?', '<p>Dietary and allergen information is listed on the product page. If you cannot find what you need, <a href="/pages/contact">ask us</a> and we will check for you.</p>', 'Product'),
  storage: q('How should I store them?', '<p>Store them as directed on the label, and keep them out of reach of children.</p>', 'Product'),
  payment: q('Which payment methods do you accept?', '<p>All available payment methods are shown at checkout.</p>', 'Payments & account'),
  contact: q('How can I contact you?', '<p>Send us a message through our <a href="/pages/contact">contact page</a> and our team will reply by email.</p>', 'Payments & account'),
};

// ---------------- Homepage ----------------
write(
  'templates/index.json',
  template([
    ['hero', section('nurellea-hero', {
      color_scheme: 'scheme-2',
      eyebrow: 'Gut gummies for women',
      heading: 'A daily ritual that feels',
      heading_accent: 'like self-care',
      text: '<p>Nurellea Gut Gummies turn your daily supplement into a moment you look forward to — chewable, simple and made to fit the way you live.</p>',
      button_label: 'Shop Gut Gummies',
      button2_label: "See what's inside",
      button2_link: '/pages/ingredients',
      show_price_chip: true,
      chip_text: 'Chewable gummy format',
      chip_icon: 'sparkle',
    }, [
      { type: 'point', settings: { icon: 'list', text: 'Full label on every product page' } },
      { type: 'point', settings: { icon: 'package', text: 'Online order tracking' } },
      { type: 'point', settings: { icon: 'lock', text: 'Secure checkout' } },
    ])],
    ['strip', section('nurellea-trust-strip', { color_scheme: 'scheme-1', animate: true, speed: 44 }, [
      { type: 'item', settings: { icon: 'flower', text: "Made for women's daily routines" } },
      { type: 'item', settings: { icon: 'gummy', text: 'Chewable gummy format' } },
      { type: 'item', settings: { icon: 'list', text: 'Every ingredient listed, as on the label' } },
      { type: 'item', settings: { icon: 'package', text: 'Track your order online' } },
      { type: 'item', settings: { icon: 'chat', text: 'Friendly customer care' } },
    ])],
    ['why', section('nurellea-features', {
      color_scheme: 'scheme-1',
      eyebrow: 'Why Nurellea',
      heading: 'Wellness made',
      heading_accent: 'softer & simpler',
      text: '<p>We believe a daily routine should feel like a small act of care — not a chore.</p>',
      style: 'soft',
      center: true,
    }, [
      { type: 'feature', settings: { icon: 'gummy', title: 'Easy to take', text: '<p>No capsules to swallow — just a chewable gummy you can keep on your desk, nightstand or in your bag.</p>' } },
      { type: 'feature', settings: { icon: 'list', title: 'Transparent by design', text: '<p>Every ingredient and amount is listed on the product page, exactly as it appears on the label.</p>' } },
      { type: 'feature', settings: { icon: 'flower', title: 'Made for women', text: "<p>Created with women's everyday wellness routines in mind.</p>" } },
      { type: 'feature', settings: { icon: 'heart', title: 'A ritual you enjoy', text: '<p>A treat-like format that makes showing up for yourself feel easy and pleasant.</p>' } },
    ])],
    ['spotlight', section('nurellea-product-spotlight', {
      color_scheme: 'scheme-3',
      eyebrow: 'Meet the gummies',
      text: '<p>Everything you need to know — ingredients, supplement facts, directions and warnings — is on the product page, straight from the label.</p>',
      button_label: 'Shop now',
      link_label: 'Read the FAQ',
      link_url: '/pages/faq',
    }, [
      { type: 'point', settings: { text: 'Chewable gummy format' } },
      { type: 'point', settings: { text: 'Full label details on the product page' } },
      { type: 'point', settings: { text: 'Secure checkout and online order tracking' } },
    ])],
    ['ritual', section('nurellea-steps', {
      color_scheme: 'scheme-1',
      eyebrow: 'Your daily ritual',
      heading: 'Three simple steps,',
      heading_accent: 'every day',
      show_directions: false,
    }, [
      { type: 'step', settings: { title: 'Choose your option', text: '<p>Pick the option that suits you on the product page. Prices and availability are always shown before you add to cart.</p>' } },
      { type: 'step', settings: { title: 'Take as directed', text: '<p>Follow the serving directions on the label — they are also listed on the product page.</p>' } },
      { type: 'step', settings: { title: 'Make it yours', text: '<p>Keep your gummies somewhere you will see them every day, so your ritual becomes second nature.</p>' } },
    ])],
    ['ingredients', section('nurellea-ingredients', {
      color_scheme: 'scheme-2',
      eyebrow: "What's inside",
      heading: 'Ingredients you can',
      heading_accent: 'actually read',
      text: '<p>We list every ingredient and amount exactly as it appears on the label, so you always know what you are taking.</p>',
      columns: '4',
      button_label: 'View full label',
      button_link: '/pages/ingredients',
    })],
    ['approach', section('nurellea-image-text', {
      color_scheme: 'scheme-1',
      placeholder_label: 'Brand lifestyle photo',
      placeholder_art: 'portrait',
      ratio: '4 / 5',
      eyebrow: 'Our approach',
      heading: 'Wellness that feels',
      heading_accent: 'gentle',
      text: '<p>Nurellea was created to make daily wellness feel softer, simpler and more personal. We keep our labels clear, our communication honest and our products easy to fit into real life.</p>',
      button_label: 'About Nurellea',
      button_link: '/pages/about',
      button_style: 'secondary',
    }, [
      { type: 'point', settings: { title: 'Clear labels.', text: 'What is on the pack is what we show online.' } },
      { type: 'point', settings: { title: 'Honest words.', text: 'No exaggerated promises — just the facts.' } },
      { type: 'point', settings: { title: 'Real support.', text: 'A team you can contact with any question.' } },
    ])],
    ['reviews', section('nurellea-reviews', {
      scope: 'product',
      color_scheme: 'scheme-2',
      eyebrow: 'Reviews',
      heading: 'In their',
      heading_accent: 'own words',
      columns: '3',
      show_filters: false,
      page_size: 6,
      limit: 6,
      show_form: false,
      hide_when_empty: true,
      link_label: 'Read all reviews',
      link_url: '/pages/reviews',
    })],
    ['faq', section('nurellea-faq', {
      source: 'blocks',
      color_scheme: 'scheme-1',
      layout: 'split',
      eyebrow: 'FAQ',
      heading: 'Questions,',
      heading_accent: 'answered',
      contact_label: 'See all questions',
      contact_link: '/pages/faq',
    }, [FAQ.inside, FAQ.take, FAQ.medical, FAQ.track, FAQ.shipping])],
    ['cta', section('nurellea-cta', {
      color_scheme: 'scheme-1',
      show_logo: true,
      heading: 'Begin your',
      heading_accent: 'Nurellea ritual',
      text: '<p>A small moment of care, every day. Make Nurellea part of yours.</p>',
      button_label: 'Shop Gut Gummies',
    })],
  ])
);

// ---------------- Product ----------------
write(
  'templates/product.json',
  template([
    ['main', section('nurellea-main-product', {
      color_scheme: 'scheme-1',
      show_breadcrumbs: true,
      variant_heading: 'Choose your supply',
      default_variant_position: 3,
      bundle_discounts_live: false,
      unit_singular: 'bag',
      unit_plural: 'bags',
      supply_days_per_unit: 30,
      show_best_value: true,
      best_value_label: 'Best value',
      show_quantity: true,
      show_short_description: false,
      open_description: true,
      show_dynamic_checkout: false,
      show_sticky_bar: true,
      show_disclaimer: true,
    }, [
      { type: 'bundle_tier', settings: { quantity: 1, discount: 0 } },
      { type: 'bundle_tier', settings: { quantity: 2, discount: 10 } },
      { type: 'bundle_tier', settings: { quantity: 3, discount: 15 } },
      { type: 'assurance', settings: { icon: 'lock', text: 'Secure checkout' } },
      { type: 'assurance', settings: { icon: 'package', text: 'Track your order online', link: '/pages/track-order' } },
      { type: 'assurance', settings: { icon: 'chat', text: 'Questions? We are here to help', link: '/pages/contact' } },
    ])],
    ['ingredients', section('nurellea-ingredients', {
      color_scheme: 'scheme-3',
      eyebrow: "What's inside",
      heading: 'Ingredients you can',
      heading_accent: 'actually read',
      text: '<p>Each ingredient below is listed exactly as on the label. See the supplement facts above for amounts per serving.</p>',
      columns: '4',
      button_label: '',
    })],
    ['ritual', section('nurellea-steps', {
      color_scheme: 'scheme-1',
      eyebrow: 'How to use',
      heading: 'Your daily',
      heading_accent: 'ritual',
      show_directions: true,
    }, [
      { type: 'step', settings: { title: 'Read the label', text: '<p>Check the serving size, directions and warnings before your first serving.</p>' } },
      { type: 'step', settings: { title: 'Take as directed', text: '<p>Enjoy your gummies as described in the directions below.</p>' } },
      { type: 'step', settings: { title: 'Keep it consistent', text: '<p>Pair your gummies with something you already do every day to make the ritual stick.</p>' } },
    ])],
    ['reviews', section('nurellea-reviews', {
      scope: 'product',
      color_scheme: 'scheme-2',
      eyebrow: 'Reviews',
      heading: 'What customers',
      heading_accent: 'are saying',
      columns: '3',
      show_filters: true,
      page_size: 6,
      limit: 0,
      show_form: true,
      form_expanded: false,
      hide_when_empty: false,
    })],
    ['faq', section('nurellea-faq', {
      source: 'product',
      color_scheme: 'scheme-1',
      layout: 'split',
      eyebrow: 'FAQ',
      heading: 'Good to',
      heading_accent: 'know',
      contact_label: 'Still have a question? Contact us',
      contact_link: '/pages/contact',
    }, [FAQ.take, FAQ.medical, FAQ.diet, FAQ.storage, FAQ.shipping, FAQ.returns])],
  ])
);

// ---------------- Collection / shop ----------------
write(
  'templates/collection.json',
  template([
    ['hero', section('nurellea-page-hero', { color_scheme: 'scheme-2', show_breadcrumbs: true, eyebrow: 'Shop' })],
    ['grid', section('nurellea-collection', { color_scheme: 'scheme-1', columns: '3', per_page: 24 })],
    ['strip', section('nurellea-trust-strip', { color_scheme: 'scheme-1', animate: false, speed: 40 }, [
      { type: 'item', settings: { icon: 'lock', text: 'Secure checkout' } },
      { type: 'item', settings: { icon: 'package', text: 'Track your order online' } },
      { type: 'item', settings: { icon: 'chat', text: 'Friendly customer care' } },
    ])],
  ])
);

// ---------------- Pages ----------------
write(
  'templates/page.json',
  template([
    ['hero', section('nurellea-page-hero', { color_scheme: 'scheme-2', show_breadcrumbs: true })],
    ['content', section('nurellea-page-content', { color_scheme: 'scheme-1', show_page_content: true })],
  ])
);

write(
  'templates/page.about.json',
  template([
    ['hero', section('nurellea-page-hero', {
      color_scheme: 'scheme-2',
      eyebrow: 'Our story',
      heading: 'About',
      heading_accent: 'Nurellea',
      text: '<p>Gentle, honest wellness — made for the way women really live.</p>',
    })],
    ['content', section('nurellea-page-content', { color_scheme: 'scheme-1', show_page_content: true })],
    ['approach', section('nurellea-image-text', {
      color_scheme: 'scheme-3',
      placeholder_label: 'Brand photo',
      placeholder_art: 'botanical',
      ratio: '4 / 5',
      eyebrow: 'What we believe',
      heading: 'Care should feel',
      heading_accent: 'simple',
      text: '<p>Nurellea exists to make a daily ritual that feels kind, clear and easy to keep. That means being upfront about what is in our products and how to use them.</p>',
    }, [
      { type: 'point', settings: { title: 'Transparency.', text: 'Full label information is published for every product.' } },
      { type: 'point', settings: { title: 'Honesty.', text: 'We do not make promises our products cannot keep.' } },
      { type: 'point', settings: { title: 'Care.', text: 'Real people answer your questions.' } },
    ])],
    ['values', section('nurellea-features', {
      color_scheme: 'scheme-1',
      eyebrow: 'Our promise to you',
      heading: 'How we',
      heading_accent: 'work',
      style: 'card',
      center: true,
    }, [
      { type: 'feature', settings: { icon: 'list', title: 'Clear labels', text: '<p>Ingredients, amounts, directions and warnings — published online exactly as on the pack.</p>' } },
      { type: 'feature', settings: { icon: 'chat', title: 'Real conversations', text: '<p>Questions about your order or our products? Our team is one message away.</p>' } },
      { type: 'feature', settings: { icon: 'shield', title: 'Responsible words', text: '<p>We describe our products carefully and never use invented reviews or results.</p>' } },
    ])],
    ['cta', section('nurellea-cta', { color_scheme: 'scheme-1', show_logo: true, heading: 'Ready to begin your', heading_accent: 'ritual?', text: '', button_label: 'Shop Gut Gummies' })],
  ])
);

write(
  'templates/page.ingredients.json',
  template([
    ['hero', section('nurellea-page-hero', {
      color_scheme: 'scheme-2',
      eyebrow: 'Ingredients & how to use',
      heading: "What's inside",
      heading_accent: 'Nurellea',
      text: '<p>The complete label — ingredients, supplement facts, directions and warnings — in one place.</p>',
    })],
    ['ingredients', section('nurellea-ingredients', {
      color_scheme: 'scheme-1',
      eyebrow: 'Key ingredients',
      heading: 'Meet the',
      heading_accent: 'ingredients',
      text: '',
      columns: '3',
      button_label: 'Shop Gut Gummies',
    })],
    ['label', section('nurellea-label-facts', { color_scheme: 'scheme-3', eyebrow: 'The label', heading: 'Everything on the', heading_accent: 'label' })],
    ['ritual', section('nurellea-steps', {
      color_scheme: 'scheme-1',
      eyebrow: 'How to use',
      heading: 'Make it a',
      heading_accent: 'daily ritual',
      show_directions: false,
    }, [
      { type: 'step', settings: { title: 'Read the label', text: '<p>Check the serving size, directions and warnings before your first serving.</p>' } },
      { type: 'step', settings: { title: 'Take as directed', text: '<p>Follow the directions on the label — never exceed the recommended serving.</p>' } },
      { type: 'step', settings: { title: 'Store it well', text: '<p>Store as directed on the label and keep out of reach of children.</p>' } },
    ])],
    ['faq', section('nurellea-faq', { source: 'blocks', color_scheme: 'scheme-2', layout: 'split', eyebrow: 'FAQ', heading: 'Ingredient', heading_accent: 'questions', contact_label: 'Ask us anything', contact_link: '/pages/contact' }, [FAQ.medical, FAQ.diet, FAQ.storage])],
    ['cta', section('nurellea-cta', { color_scheme: 'scheme-1', show_logo: false, heading: 'Ready to try', heading_accent: 'Nurellea?', text: '', button_label: 'Shop Gut Gummies' })],
  ])
);

write(
  'templates/page.faq.json',
  template([
    ['hero', section('nurellea-page-hero', {
      color_scheme: 'scheme-2',
      eyebrow: 'Help centre',
      heading: 'Frequently asked',
      heading_accent: 'questions',
      text: '<p>Find answers about our gummies, orders, shipping and more.</p>',
    })],
    ['faq', section('nurellea-faq', {
      source: 'store',
      color_scheme: 'scheme-1',
      layout: 'stacked',
      eyebrow: '',
      heading: 'How can we',
      heading_accent: 'help?',
      contact_label: "Can't find your answer? Contact us",
      contact_link: '/pages/contact',
      show_search: true,
      card_style: false,
    }, [FAQ.inside, FAQ.take, FAQ.medical, FAQ.diet, FAQ.storage, FAQ.track, FAQ.shipping, FAQ.change, FAQ.returns, FAQ.payment, FAQ.contact])],
    ['cta', section('nurellea-cta', { color_scheme: 'scheme-1', show_logo: false, heading: 'Still', heading_accent: 'curious?', text: '<p>Our team is happy to help with anything not covered here.</p>', button_label: 'Contact us', button_link: '/pages/contact' })],
  ])
);

write(
  'templates/page.contact.json',
  template([
    ['hero', section('nurellea-page-hero', { color_scheme: 'scheme-2', eyebrow: 'Contact', heading: "Let's", heading_accent: 'talk', text: '<p>We would love to hear from you.</p>' })],
    ['contact', section('nurellea-contact', {
      color_scheme: 'scheme-1',
      eyebrow: 'Customer care',
      heading: "We're here to help",
      text: '<p>Questions about an order, our gummies or anything else? Send us a message and our team will get back to you by email.</p>',
    })],
    ['faq', section('nurellea-faq', { source: 'blocks', color_scheme: 'scheme-2', layout: 'split', eyebrow: 'Quick answers', heading: 'Before you', heading_accent: 'write', contact_label: 'See all FAQs', contact_link: '/pages/faq' }, [FAQ.track, FAQ.change, FAQ.returns])],
  ])
);

write(
  'templates/page.reviews.json',
  template([
    ['hero', section('nurellea-page-hero', {
      color_scheme: 'scheme-2',
      eyebrow: 'Reviews',
      heading: 'Customer',
      heading_accent: 'reviews',
      text: '<p>Reviews are checked by our team before they are published. Reviews marked "Verified purchase" have been matched to an order.</p>',
    })],
    ['reviews', section('nurellea-reviews', {
      scope: 'all',
      color_scheme: 'scheme-1',
      eyebrow: '',
      heading: 'All',
      heading_accent: 'reviews',
      columns: '3',
      show_filters: true,
      page_size: 9,
      limit: 0,
      show_form: true,
      form_expanded: true,
      hide_when_empty: false,
    })],
    ['cta', section('nurellea-cta', { color_scheme: 'scheme-1', show_logo: false, heading: 'Try it for', heading_accent: 'yourself', text: '', button_label: 'Shop Gut Gummies' })],
  ])
);

write(
  'templates/page.track-order.json',
  template([
    ['order_tracking', section('order-tracking', {
      eyebrow: 'Order tracking',
      heading: 'Track your order',
      subheading: 'Enter your order number and the email used at checkout to view shipment status and delivery updates.',
      color_scheme: 'scheme-2',
      show_help: true,
      help_title: 'Need help with your order?',
      help_text: 'Our team can help with delivery questions and order changes.',
      help_link: '/pages/contact',
      help_link_label: 'Contact support',
    })],
  ])
);

write(
  'templates/page.order-status.json',
  template([
    ['status', section('nurellea-order-status', { color_scheme: 'scheme-2', clear_cart_on_success: false })],
  ])
);

write(
  'templates/page.shipping.json',
  template([
    ['hero', section('nurellea-page-hero', { color_scheme: 'scheme-2', eyebrow: 'Help', heading: 'Shipping', heading_accent: 'information' })],
    ['policy', section('nurellea-policy', { policy: 'shipping', color_scheme: 'scheme-1' })],
  ])
);

write(
  'templates/page.returns.json',
  template([
    ['hero', section('nurellea-page-hero', { color_scheme: 'scheme-2', eyebrow: 'Help', heading: 'Returns &', heading_accent: 'refunds' })],
    ['policy', section('nurellea-policy', { policy: 'refund', color_scheme: 'scheme-1' })],
  ])
);

// ---------------- Blog / article / 404 ----------------
write(
  'templates/blog.json',
  template([
    ['hero', section('nurellea-page-hero', { color_scheme: 'scheme-2', eyebrow: 'Journal', heading_accent: '', text: '' })],
    ['blog', section('nurellea-blog', { color_scheme: 'scheme-1', per_page: 9 })],
  ])
);

write(
  'templates/article.json',
  template([
    ['article', section('nurellea-article', { color_scheme: 'scheme-1', show_author: true })],
    ['spotlight', section('nurellea-product-spotlight', {
      color_scheme: 'scheme-2',
      eyebrow: 'Shop the ritual',
      text: '',
      button_label: 'Shop now',
      link_label: 'Ingredients & how to use',
      link_url: '/pages/ingredients',
    })],
  ])
);

write('templates/404.json', template([['main', section('nurellea-404', { color_scheme: 'scheme-2' })]]));

// ---------------- Cart & password (Horizon sections, rebranded settings) ----------------
const readJsonc = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));

const cart = readJsonc('templates/cart.json');
delete cart.sections.product_list_NNFgcy;
cart.order = cart.order.filter((id) => id !== 'product_list_NNFgcy');
cart.sections['cart-section'].blocks['cart-page-title'].settings.title = 'Your cart';
cart.sections['cart-section'].blocks['cart-page-title'].settings.type_preset = 'h3';
cart.sections['cart-section'].blocks['cart-page-summary'].settings.color_scheme = 'scheme-2';
cart.sections['cart-section'].blocks['cart-page-summary'].settings.border_radius = 20;
cart.sections['cart-section'].settings['padding-block-start'] = 40;
cart.sections['cart-section'].settings['padding-block-end'] = 64;
cart.sections.cart_assurance = section('nurellea-trust-strip', { color_scheme: 'scheme-1', animate: false, speed: 40 }, [
  { type: 'item', settings: { icon: 'lock', text: 'Secure checkout' } },
  { type: 'item', settings: { icon: 'package', text: 'Track your order online' } },
  { type: 'item', settings: { icon: 'chat', text: 'Questions? Our team is here to help' } },
]);
cart.order = [...new Set([...cart.order, 'cart_assurance'])];
write('templates/cart.json', cart);

const pw = readJsonc('templates/password.json');
const main = pw.sections.main;
main.settings.color_scheme = 'scheme-2';
main.blocks.logo.settings.pixel_height = 64;
main.blocks.text.settings.text = '<h1>Something gentle is on its way</h1>';
main.blocks.text.settings.alignment = 'center';
main.blocks.text.settings.font = 'var(--font-heading--family)';
main.blocks['text-2'].settings.text = '<p>Nurellea is getting ready to launch. Join the list to hear first when we open our doors.</p>';
main.blocks['text-2'].settings.alignment = 'center';
main.blocks['email-signup'].settings.border_radius = 100;
main.blocks['email-signup'].settings.label = 'Notify me';
write('templates/password.json', pw);

// ---------------- Header & footer groups ----------------
const header = JSON.parse(readFileSync(new URL('sections/header-group.json', root), 'utf8'));
const ann = header.sections.header_announcements_9jGBFp;
ann.settings.color_scheme = 'scheme-5';
ann.settings.padding_block_start = undefined;
ann.settings['padding-block-start'] = 10;
ann.settings['padding-block-end'] = 10;
ann.blocks = {
  announcement_1: {
    type: '_announcement',
    settings: { text: 'Meet Nurellea Gut Gummies — your new daily ritual', link: '/collections/all', font: 'var(--font-subheading--family)', font_size: '0.875rem', weight: '', letter_spacing: 'normal', case: 'none' },
    blocks: {},
  },
  announcement_2: {
    type: '_announcement',
    settings: { text: 'Full ingredient details on every product page', link: '/pages/ingredients', font: 'var(--font-subheading--family)', font_size: '0.875rem', weight: '', letter_spacing: 'normal', case: 'none' },
    blocks: {},
  },
};
ann.block_order = ['announcement_1', 'announcement_2'];
delete ann.settings.padding_block_start;
const hdr = header.sections.header_section;
hdr.blocks['header-menu'].settings.menu = 'main-menu';
hdr.blocks['header-menu'].settings.menu_style = 'text';
hdr.blocks['header-menu'].settings.type_font_primary_link = 'subheading';
hdr.blocks['header-menu'].settings.type_font_primary_size = '1rem';
Object.assign(hdr.settings, {
  logo_position: 'left',
  menu_position: 'center',
  show_search: true,
  search_position: 'right',
  enable_sticky_header: 'scroll-up',
  divider_width: 1,
  divider_size: 'full-width',
  color_scheme_top: 'scheme-1',
  enable_transparent_header_home: false,
  section_height: 'standard',
});
write('sections/header-group.json', header);

write('sections/footer-group.json', {
  type: 'footer',
  name: 'Footer',
  sections: {
    nurellea_footer: section('nurellea-footer', {
      color_scheme: 'scheme-2',
      logo_variant: 'lockup',
      newsletter_heading: 'Join the Nurellea list',
      newsletter_text: '<p>News, rituals and first access to launches — straight to your inbox.</p>',
      menu_1_heading: 'Shop',
      menu_1: '',
      menu_2_heading: 'Help',
      menu_2: '',
      menu_3_heading: 'Nurellea',
      menu_3: '',
      show_payment_icons: true,
    }),
  },
  order: ['nurellea_footer'],
});
