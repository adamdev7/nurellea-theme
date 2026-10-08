// One-off: rebrands config/settings_data.json for Nurellea and removes the previous
// store's App Manager identifiers / token so nothing routes into that store.
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../config/settings_data.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));
const c = data.current;

const INK = '#2f2a27';
const TEXT = '#4a403c';
const ROSE = '#e79698';
const ROSE_DEEP = '#a3434f';
const BLUSH = '#fbedeb';
const PETAL = '#fdf7f5';
const SAND = '#f6efe8';
const LINE = '#eadfd8';

const scheme = (o) => ({
  settings: {
    background: o.bg,
    foreground_heading: o.heading ?? INK,
    foreground: o.text ?? TEXT,
    primary: o.primary ?? INK,
    primary_hover: o.primaryHover ?? ROSE_DEEP,
    border: o.border ?? LINE,
    shadow: '#2f2a27',
    primary_button_background: o.btnBg ?? INK,
    primary_button_text: o.btnText ?? '#ffffff',
    primary_button_border: o.btnBg ?? INK,
    primary_button_hover_background: o.btnHoverBg ?? ROSE_DEEP,
    primary_button_hover_text: o.btnHoverText ?? '#ffffff',
    primary_button_hover_border: o.btnHoverBg ?? ROSE_DEEP,
    secondary_button_background: 'rgba(0,0,0,0)',
    secondary_button_text: o.secText ?? INK,
    secondary_button_border: o.secText ?? INK,
    secondary_button_hover_background: o.secHoverBg ?? BLUSH,
    secondary_button_hover_text: o.secText ?? INK,
    secondary_button_hover_border: o.secText ?? INK,
    input_background: o.inputBg ?? '#ffffff',
    input_text_color: o.inputText ?? INK,
    input_border_color: o.inputBorder ?? '#d9cbc3',
    input_hover_background: o.inputHover ?? PETAL,
    variant_background_color: '#ffffff',
    variant_text_color: INK,
    variant_border_color: '#e2d6ce',
    variant_hover_background_color: PETAL,
    variant_hover_text_color: INK,
    variant_hover_border_color: ROSE,
    selected_variant_background_color: INK,
    selected_variant_text_color: '#ffffff',
    selected_variant_border_color: INK,
    selected_variant_hover_background_color: '#1f1b19',
    selected_variant_hover_text_color: '#ffffff',
    selected_variant_hover_border_color: '#1f1b19',
  },
});

const schemes = {
  'scheme-1': scheme({ bg: '#ffffff' }),
  'scheme-2': scheme({ bg: BLUSH, border: '#f0d5d1', secHoverBg: '#ffffff', inputHover: '#ffffff' }),
  'scheme-3': scheme({ bg: SAND, border: '#e6d9ce', secHoverBg: '#ffffff' }),
  'scheme-4': scheme({ bg: ROSE, text: INK, border: '#d97f82', primaryHover: '#ffffff', secHoverBg: '#f3b7b8' }),
  'scheme-5': scheme({
    bg: INK,
    heading: '#ffffff',
    text: '#f3e9e5',
    primary: '#f6c7c8',
    primaryHover: '#ffffff',
    border: '#4a423e',
    btnBg: ROSE,
    btnText: INK,
    btnHoverBg: '#ffffff',
    btnHoverText: INK,
    secText: '#ffffff',
    secHoverBg: '#3b3431',
    inputBg: '#3b3431',
    inputText: '#ffffff',
    inputBorder: '#6b605a',
    inputHover: '#443c39',
  }),
  'scheme-6': scheme({
    bg: 'rgba(0,0,0,0)',
    heading: '#ffffff',
    text: '#ffffff',
    primary: '#ffffff',
    primaryHover: '#fbedeb',
    border: '#ffffff66',
    btnBg: '#ffffff',
    btnText: INK,
    btnHoverBg: BLUSH,
    btnHoverText: INK,
    secText: '#ffffff',
    secHoverBg: '#ffffff1f',
  }),
  'scheme-58084d4c-a86e-4d0a-855e-a0966e5043f7': scheme({ bg: PETAL }),
};

Object.assign(c, {
  logo_height: 34,
  logo_height_mobile: 28,
  type_body_font: 'dm_sans_n4',
  type_subheading_font: 'jost_n5',
  type_heading_font: 'jost_n4',
  type_accent_font: 'cormorant_i5',
  type_size_paragraph: '16',
  type_line_height_paragraph: 'body-loose',
  type_size_h1: '56',
  type_letter_spacing_h1: 'heading-tight',
  type_size_h2: '44',
  type_letter_spacing_h2: 'heading-tight',
  type_size_h3: '30',
  type_size_h4: '22',
  type_size_h5: '15',
  type_size_h6: '13',
  page_width: 'narrow',
  card_hover_effect: 'lift',
  badge_position: 'top-left',
  badge_corner_radius: 100,
  badge_sale_color_scheme: 'scheme-4',
  badge_sold_out_color_scheme: 'scheme-5',
  primary_button_border_width: 0,
  button_border_radius_primary: 100,
  secondary_button_border_width: 1,
  button_border_radius_secondary: 100,
  cart_type: 'drawer',
  auto_open_cart_drawer: true,
  show_cart_note: false,
  show_add_discount_code: true,
  drawer_drop_shadow: true,
  input_border_width: 1,
  inputs_border_radius: 12,
  popover_border_radius: 16,
  popover_border: 'none',
  quick_add: true,
  mobile_quick_add: true,
  product_corner_radius: 20,
  card_corner_radius: 16,
  variant_button_radius: 12,
  // Integrations: configurable, no inherited store identifiers.
  app_manager_api_base: 'https://appmanager.store',
  app_manager_store_id: '',
  meta_capi_enabled: true,
  meta_capi_api_base: 'https://appmanager.store/api/v1',
  meta_capi_store_id: '',
  meta_capi_browser_token: '',
  phx_enabled: false,
  phx_checkout_url: '',
  phx_routing_mode: 'all',
  phx_product_allowlist: '',
  phx_buy_now_mode: 'variant_only',
  // Nurellea store defaults (blank until confirmed)
  brand_support_email: '',
  subscriptions_enabled: false,
  skip_cart_to_checkout: false,
  reviews_allow_submissions: true,
  reviews_demo_preview: false,
  seo_noindex_all: false,
  seo_default_description:
    'Nurellea makes women’s wellness gummies for a simple, enjoyable daily routine. Shop mush gummies, read the full ingredient details and find answers to common questions.',
  show_placeholder_labels: true,
  legacy_vendor_scripts: false,
  color_schemes: schemes,
});

delete c.logo; // previous store's uploaded logo; bundled Nurellea logo is used until a new one is uploaded

// GemPages app embed: keep the embed record, but disabled — no GemPages content is used by this theme.
for (const block of Object.values(c.blocks || {})) {
  if (String(block.type).includes('embed-gp-script-head')) block.disabled = true;
}

data.presets = { Horizon: { ...(data.presets?.Horizon || {}), color_schemes: schemes } };
delete data.presets.Nurellea;
writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('settings_data patched');
