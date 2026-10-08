// Generates the Nurellea JSON templates and section groups.
// Copy rules: no medical claims, outcomes, timelines, ratings, counts or endorsements.
// Label facts live in Theme settings > Nurellea product facts (or product metafields), not here.
// Ingredient, benefit and FAQ copy below mirrors that label: 10 mushroom extracts, 250 mg each.
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
  shipping: q('How long does shipping take, and how much does it cost?', '<p>Orders are processed in 2–4 days, then delivered in 5–12 business days. Shipping is free on orders over $70 — that is any bundle of 2 or more bags. For a single bag, shipping costs are shown at checkout before you pay. See our <a href="/pages/shipping">shipping information</a> for details.</p>', 'Orders & shipping'),
  guarantee: q("What if they're not for me?", '<p>Every order is covered by our 30-day money-back guarantee. If you are not happy, <a href="/pages/contact">contact us</a> within 30 days of receiving your order and we will refund you. Full terms are in our <a href="/pages/returns">returns information</a>.</p>', 'Orders & shipping'),
  change: q('Can I change or cancel my order?', '<p>Please <a href="/pages/contact">contact us</a> as soon as possible with your order number. We will do our best to help if your order has not been shipped yet.</p>', 'Orders & shipping'),
  returns: q('What is your return policy?', '<p>Please see our <a href="/pages/returns">returns information</a> for eligibility and how to start a return.</p>', 'Orders & shipping'),
  inside: q("What's in Nurellea Mush Gummies?", "<p>Ten functional mushroom extracts, 250 mg each: Lion's Mane, Cordyceps, Chaga, Maitake, Shiitake, Reishi, Tremella, Royal Sun, Black Fungus and White Button. The other ingredients are glucose syrup, sugar, glucose, pectin, citric acid, natural raspberry flavor, sodium citrate, fruit and vegetable juice concentrate and a glazing agent (sunflower oil, carnauba wax). Full supplement facts are on the <a href=\"/pages/ingredients\">ingredients page</a>.</p>", 'Product'),
  take: q('How do I take them?', '<p>Take 2 gummies a day and chew thoroughly. Many people pair them with breakfast so the habit sticks. Do not exceed the recommended daily dose.</p>', 'Product'),
  medical: q('Can I take them with medication, or if I am pregnant or breastfeeding?', '<p>Please speak with your doctor or pharmacist before taking any food supplement if you are pregnant, breastfeeding, taking medication or have a medical condition. Always read the warnings on the label.</p>', 'Product'),
  diet: q('Are they vegan?', '<p>Yes. Nurellea Mush Gummies are vegan and non-GMO, and they are set with fruit pectin instead of gelatin.</p>', 'Product'),
  storage: q('How should I store them?', '<p>Store the bag in a cool, dry place away from direct sunlight, reseal it after each use and keep it out of reach of children.</p>', 'Product'),
  sugar: q('Do they contain sugar?', '<p>Yes, a little. Mushrooms are naturally bitter, so we use just enough sugar to make every gummy taste like raspberry — with no synthetic sweeteners. The full list is under Other ingredients on the product page.</p>', 'Product'),
  magic: q('Are these magic mushrooms?', '<p>No. Our gummies contain functional mushrooms, not psychoactive ones. There are no psychoactive compounds in them.</p>', 'Product'),
  sourcing: q('How are the mushrooms sourced?', '<p>We use 100% fruiting-body extracts from reputable producers, and the gummies are third-party lab tested.</p>', 'Product'),
  kids: q('Can children take them?', "<p>They are made for adults. If you are thinking about them for a child, please check with the child's healthcare provider first.</p>", 'Product'),
  side: q('Are there any side effects?', '<p>These mushrooms have been eaten around the world for centuries and are generally well tolerated. If you notice any reaction, stop taking them and speak with a healthcare professional.</p>', 'Product'),
  payment: q('Which payment methods do you accept?', '<p>All available payment methods are shown at checkout.</p>', 'Payments & account'),
  contact: q('How can I contact you?', '<p>Send us a message through our <a href="/pages/contact">contact page</a> and our team will reply by email.</p>', 'Payments & account'),
};

const MUSHROOMS = [
  ['Focus', "Lion's Mane", '<p>A shaggy white mushroom prized in traditional practice for the mind.</p>', ['Calm, clear focus', 'Everyday brain health']],
  ['Energy', 'Cordyceps', '<p>A traditional favourite for natural, steady energy.</p>', ['Sustained everyday energy', 'Recovery after activity']],
  ['Mood', 'Reishi', '<p>Valued for centuries as a mushroom for calm evenings.</p>', ['A calmer wind-down', 'Restful sleep']],
  ['Gut health', 'Shiitake', '<p>A kitchen staple with a long tradition in digestive wellness.</p>', ['Healthy digestion', 'Gut comfort']],
  ['Antioxidants', 'Chaga', '<p>A birch-growing mushroom naturally rich in antioxidants.</p>', ['Antioxidant support', 'Overall wellness']],
  ['Wellbeing', 'Maitake', "<p>The 'dancing mushroom', traditionally used for whole-body balance.</p>", ['Normal immune function', 'Everyday balance']],
  ['Beauty', 'Tremella', "<p>The 'snow mushroom', used in traditional beauty rituals.</p>", ['Skin hydration', 'Hair, skin & nail care']],
  ['Defences', 'Royal Sun', "<p>A sweet, almond-scented mushroom traditionally used for the body's defences.</p>", ['Natural defences', 'Healthy bones']],
  ['Digestion', 'White Button', '<p>The familiar everyday mushroom, traditionally used to support digestion.</p>', ['Healthy digestion', 'Gut balance']],
  ['Liver', 'Black Fungus', '<p>Wood ear mushroom, a staple of traditional Asian cooking and wellness.</p>', ['Liver health', 'Healthy circulation']],
].map(([tag, name, text, bullets]) => ({
  type: 'ingredient',
  settings: { tag, name, amount: '250 mg', text, bullets: `<ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` },
}));

// ---------------- Homepage ----------------
write(
  'templates/index.json',
  template([
    ['hero', section('nurellea-hero', {
      color_scheme: 'scheme-2',
      eyebrow: 'Mush gummies for women',
      heading: 'A daily ritual that feels',
      heading_accent: 'like self-care',
      text: '<p>10 functional mushrooms in 2 raspberry gummies a day. A daily supplement you will actually look forward to — vegan, lab tested and made to fit the way you live.</p>',
      button_label: 'Shop Mush Gummies',
      button2_label: "See what's inside",
      button2_link: '/pages/ingredients',
      show_price_chip: true,
      chip_text: '10 mushrooms in 1 gummy',
      chip_icon: 'sparkle',
    }, [
      { type: 'point', settings: { icon: 'leaf', text: 'Vegan & non-GMO' } },
      { type: 'point', settings: { icon: 'truck', text: 'Free shipping on 2+ bags' } },
      { type: 'point', settings: { icon: 'shield', text: '30-day money-back guarantee' } },
    ])],
    ['strip', section('nurellea-trust-strip', { color_scheme: 'scheme-1', animate: true, speed: 44 }, [
      { type: 'item', settings: { icon: 'mushroom', text: '10 functional mushrooms' } },
      { type: 'item', settings: { icon: 'gummy', text: 'Just 2 gummies a day' } },
      { type: 'item', settings: { icon: 'leaf', text: 'Vegan & non-GMO' } },
      { type: 'item', settings: { icon: 'flask', text: 'Lab tested' } },
      { type: 'item', settings: { icon: 'heart', text: 'Raspberry flavor' } },
      { type: 'item', settings: { icon: 'shield', text: '30-day money-back guarantee' } },
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
      { type: 'point', settings: { text: '10 functional mushroom extracts, 250 mg each' } },
      { type: 'point', settings: { text: '100% fruiting body, vegan and lab tested' } },
      { type: 'point', settings: { text: 'Free shipping on 2+ bags, 30-day money-back guarantee' } },
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
      eyebrow: 'Our 10-in-1 mushroom blend',
      heading: "What's inside",
      heading_accent: 'every gummy',
      text: '<p>250 mg of each functional mushroom extract, made from 100% fruiting body. Tap a card to see what it is traditionally used for.*</p>',
      layout: 'tap',
      columns: '5',
      show_disclaimer: true,
      button_label: 'View full label',
      button_link: '/pages/ingredients',
    }, MUSHROOMS)],
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
    }, [FAQ.inside, FAQ.take, FAQ.sugar, FAQ.shipping, FAQ.guarantee])],
    ['cta', section('nurellea-cta', {
      color_scheme: 'scheme-1',
      show_logo: true,
      heading: 'Begin your',
      heading_accent: 'Nurellea ritual',
      text: '<p>A small moment of care, every day. Make Nurellea part of yours.</p>',
      button_label: 'Shop Mush Gummies',
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
      bundle_discounts_live: true,
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
      { type: 'assurance', settings: { icon: 'truck', text: 'Track your order online', link: '/pages/track-order' } },
      { type: 'assurance', settings: { icon: 'chat', text: 'Questions? We are here to help', link: '/pages/contact' } },
    ])],
    ['highlights', section('nurellea-trust-strip', { color_scheme: 'scheme-4', animate: true, speed: 36 }, [
      { type: 'item', settings: { icon: 'mushroom', text: '10 functional mushrooms' } },
      { type: 'item', settings: { icon: 'leaf', text: 'Vegan' } },
      { type: 'item', settings: { icon: 'sparkle', text: 'Non-GMO' } },
      { type: 'item', settings: { icon: 'flask', text: 'Lab tested' } },
      { type: 'item', settings: { icon: 'heart', text: 'Raspberry flavor' } },
      { type: 'item', settings: { icon: 'flower', text: 'Filler & palm oil free' } },
      { type: 'item', settings: { icon: 'shield', text: '30-day money-back guarantee' } },
    ])],
    ['benefits', section('nurellea-benefit-orbit', {
      color_scheme: 'scheme-2',
      eyebrow: '10 mushrooms. 1 gummy.',
      heading: 'Elevate your',
      heading_accent: 'everyday',
      text: '<p>Each mushroom in the blend was chosen for its own traditional role, so two gummies cover your whole-body routine.*</p>',
      button_label: 'Start your ritual',
      show_disclaimer: true,
    }, [
      { type: 'benefit', settings: { icon: 'brain', title: 'Calm focus', text: "Lion's Mane, traditionally used to support focus and mental clarity." } },
      { type: 'benefit', settings: { icon: 'bolt', title: 'Natural energy', text: 'Cordyceps, traditionally used to support everyday energy and stamina.' } },
      { type: 'benefit', settings: { icon: 'moon', title: 'Balanced mood', text: 'Reishi, long valued for calm, relaxation and restful sleep.' } },
      { type: 'benefit', settings: { icon: 'leaf', title: 'Gut & digestion', text: 'Shiitake & White Button, traditionally used to support healthy digestion.' } },
      { type: 'benefit', settings: { icon: 'shield', title: 'Immune support', text: "Chaga & Royal Sun, rich in antioxidants and used to support the body's natural defences." } },
      { type: 'benefit', settings: { icon: 'sparkle', title: 'Skin & beauty', text: "Tremella, the 'snow mushroom', traditionally used to support skin hydration." } },
    ])],
    ['ingredients', section('nurellea-ingredients', {
      color_scheme: 'scheme-1',
      eyebrow: 'Our 10-in-1 mushroom blend',
      heading: "What's inside",
      heading_accent: 'every gummy',
      text: '<p>250 mg of each functional mushroom extract, made from 100% fruiting body. Tap a card to see what it is traditionally used for.*</p>',
      layout: 'tap',
      columns: '5',
      show_disclaimer: true,
      button_label: 'See full ingredients',
    }, MUSHROOMS)],
    ['ritual', section('nurellea-steps', {
      color_scheme: 'scheme-3',
      eyebrow: 'How it works',
      heading: 'Ready in 3',
      heading_accent: 'simple steps',
      show_directions: false,
    }, [
      { type: 'step', settings: { title: 'Take 2 gummies', text: '<p>Chew 2 raspberry gummies once a day. No water, pills or powders needed.</p>' } },
      { type: 'step', settings: { title: 'Make it a habit', text: '<p>Keep the bag next to your coffee or toothbrush so your ritual takes seconds.</p>' } },
      { type: 'step', settings: { title: 'Stay consistent', text: '<p>Functional mushrooms are made for daily use. A 3-bag bundle covers a full 90 days.</p>' } },
    ])],
    ['compare', section('nurellea-comparison', {
      color_scheme: 'scheme-1',
      eyebrow: 'Why gummies',
      heading: 'Nurellea vs.',
      heading_accent: 'the rest',
      us_label: 'Nurellea',
      them_label: 'Typical capsules & powders',
      footnote: 'Based on common capsule and powder formats. Individual products differ.',
      button_label: 'Choose your bundle',
    }, [
      { type: 'row', settings: { feature: '10 functional mushrooms in one', them: 'varies', them_text: 'Varies' } },
      { type: 'row', settings: { feature: 'Chewable gummy — no pills or powders', them: 'no' } },
      { type: 'row', settings: { feature: '100% fruiting body extract', them: 'varies', them_text: 'Varies' } },
      { type: 'row', settings: { feature: 'Tastes like raspberry', them: 'varies', them_text: 'Often earthy' } },
      { type: 'row', settings: { feature: 'Vegan & non-GMO', them: 'varies', them_text: 'Varies' } },
      { type: 'row', settings: { feature: 'Third-party lab tested', them: 'varies', them_text: 'Varies' } },
      { type: 'row', settings: { feature: '30-day money-back guarantee', them: 'varies', them_text: 'Varies' } },
    ])],
    ['timeline', section('nurellea-timeline', {
      color_scheme: 'scheme-2',
      eyebrow: 'Your routine',
      heading: 'Your first',
      heading_accent: '90 days',
      text: '<p>A simple guide to building the habit. Consistency is the whole idea behind a daily supplement.</p>',
      footnote: 'Everyone is different. This is a routine guide, not a promise of results.',
    }, [
      { type: 'stage', settings: { label: 'Day 1', title: 'Start your ritual', text: '<p>Take your first 2 gummies with breakfast. A fixed time makes it easier to remember.</p>' } },
      { type: 'stage', settings: { label: 'Week 2', title: 'Build the habit', text: '<p>Your daily gummies start to feel automatic. Keep the bag where you will see it every morning.</p>' } },
      { type: 'stage', settings: { label: 'Month 1', title: 'Check in with yourself', text: '<p>Notice how your routine feels. A short note on energy, focus and digestion can help — everyone is different.</p>' } },
      { type: 'stage', settings: { label: 'Month 3', title: 'Make it yours', text: '<p>A 3-bag bundle covers the full 90 days, so you never run out mid-routine.</p>' } },
    ])],
    ['guarantee', section('nurellea-guarantee', {
      color_scheme: 'scheme-3',
      days: 30,
      seal_text: 'Money-back guarantee',
      eyebrow: 'Try it risk-free',
      heading: 'Our 30-day',
      heading_accent: 'money-back guarantee',
      text: '<p>We want you to love your ritual. If Nurellea Mush Gummies are not for you, contact us within 30 days of receiving your order and we will refund you.</p>',
      button_label: 'Try Nurellea today',
    })],
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
      heading: 'Ask us',
      heading_accent: 'anything',
      contact_label: 'Still have a question? Contact us',
      contact_link: '/pages/contact',
    }, [FAQ.sugar, FAQ.inside, FAQ.take, FAQ.diet, FAQ.magic, FAQ.sourcing, FAQ.medical, FAQ.kids, FAQ.side, FAQ.shipping, FAQ.guarantee])],
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
    ['cta', section('nurellea-cta', { color_scheme: 'scheme-1', show_logo: true, heading: 'Ready to begin your', heading_accent: 'ritual?', text: '', button_label: 'Shop Mush Gummies' })],
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
      eyebrow: 'Our 10-in-1 mushroom blend',
      heading: 'Meet the',
      heading_accent: 'mushrooms',
      text: '<p>250 mg of each functional mushroom extract, made from 100% fruiting body. Tap a card to see what it is traditionally used for.*</p>',
      layout: 'tap',
      columns: '5',
      show_disclaimer: true,
      button_label: 'Shop Mush Gummies',
    }, MUSHROOMS)],
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
    ['cta', section('nurellea-cta', { color_scheme: 'scheme-1', show_logo: false, heading: 'Ready to try', heading_accent: 'Nurellea?', text: '', button_label: 'Shop Mush Gummies' })],
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
    }, [FAQ.inside, FAQ.take, FAQ.sugar, FAQ.diet, FAQ.magic, FAQ.sourcing, FAQ.medical, FAQ.kids, FAQ.side, FAQ.storage, FAQ.track, FAQ.shipping, FAQ.change, FAQ.guarantee, FAQ.returns, FAQ.payment, FAQ.contact])],
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
    ['cta', section('nurellea-cta', { color_scheme: 'scheme-1', show_logo: false, heading: 'Try it for', heading_accent: 'yourself', text: '', button_label: 'Shop Mush Gummies' })],
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
      show_shipping_summary: true,
      fallback_heading: "Where's my order?",
      fallback_text: "As soon as your order ships, we email you a shipping confirmation with your tracking details. Can't find it? Check your spam folder or get in touch and we'll look it up for you.",
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
    ['policy', section('nurellea-policy', {
      policy: 'shipping',
      color_scheme: 'scheme-1',
      summary: '<p><strong>Processing:</strong> orders are processed in 2–4 days.</p><p><strong>Delivery:</strong> 5–12 business days after dispatch. Tracking details are emailed when available.</p><p><strong>Free shipping</strong> on orders over $70 (any bundle of 2 or more bags). For a single bag, shipping costs are shown at checkout before you pay.</p>',
    })],
  ])
);

write(
  'templates/page.returns.json',
  template([
    ['hero', section('nurellea-page-hero', { color_scheme: 'scheme-2', eyebrow: 'Help', heading: 'Returns &', heading_accent: 'refunds' })],
    ['policy', section('nurellea-policy', {
      policy: 'refund',
      color_scheme: 'scheme-1',
      summary: '<p><strong>30-day money-back guarantee.</strong> If you are not happy with your order, <a href="/pages/contact">contact us</a> within 30 days of receiving it and we will refund you. The full terms are below.</p>',
    })],
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
    settings: { text: 'Meet Nurellea Mush Gummies — your new daily ritual', link: '/collections/all', font: 'var(--font-subheading--family)', font_size: '0.875rem', weight: '', letter_spacing: 'normal', case: 'none' },
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
