# Nurellea theme — launch checklist and content model

This theme is the Horizon 3.5.1 codebase rebuilt for Nurellea. Every integration is **off or blank by default**; nothing routes to another store until the values below are entered for Nurellea. Anything marked _Needed_ has not been supplied and must not be guessed.

Work lives on branch `nurellea-redesign`. The untouched starting point is preserved as commit `f2b54e1` on branch `luxory-baseline`.

---

## 1. Before you upload

- Connect the Shopify CLI to the **Nurellea** store, never the Luxory store: `npx shopify theme push --unpublished --store <nurellea-store>.myshopify.com`. Do not use `theme dev` or `push` against a store you have not confirmed.
- Run `npm test` (static audit + mocked integration tests) and `npm run theme:check:summary`.
- Keep the store password page on (Online Store → Preferences) until the checklist is done. The password template is branded.

## 2. Theme settings (Customize → Theme settings)

| Group | Setting | Current | Action |
| --- | --- | --- | --- |
| Nurellea product | `nurellea_product` | blank | Pick the Gut Gummies product. Home, header and CTA sections read price, image and URL from it. |
| Brand & support | `brand_support_email` | blank | _Needed:_ Nurellea support address. |
| | `brand_support_phone`, `brand_support_hours`, `brand_response_time` | blank | Optional. Only enter real commitments; hidden when blank. |
| | `brand_legal_name`, `brand_business_address` | blank | _Needed_ for footer/legal and Organization JSON-LD. |
| | `brand_instagram` … `brand_youtube` | blank | Nurellea profiles only. |
| SEO | `seo_primary_domain` | blank | _Needed:_ Nurellea's primary domain (e.g. `nurellea.com`). When set, every other host (the `myshopify.com` address, staging domains) gets `noindex, nofollow`. Canonicals come from Shopify's primary domain setting. |
| | `seo_noindex_all` | off | Turn **on** in any staging/duplicate theme that could be published on a public domain. |
| | `seo_default_description` | set | Review wording. |
| Checkout (Phoenix) | `phx_enabled` | off | Turn on only after the Nurellea checkout URL is verified. |
| | `phx_checkout_url` | blank | _Needed:_ Nurellea's Phoenix/ecommcheckout entry URL (must be `https://`). The editor shows a warning while blank. |
| | `phx_routing_mode`, `phx_product_allowlist` | all / blank | Use `allowlist` + product IDs to route only Nurellea products. |
| | `phx_buy_now_mode` | `variant_only` | Unchanged contract. |
| Order tracking (App Manager) | `app_manager_api_base` | `https://appmanager.store` | Confirm with App Manager that this is the correct host for Nurellea's tenant. |
| | `app_manager_store_id` | blank | _Needed:_ Nurellea's App Manager store ID. Until set, lookups show "configuration missing" and make no request. |
| Meta CAPI | `meta_capi_enabled` | on | Inert until the two values below exist. |
| | `meta_capi_api_base` | `https://appmanager.store/api/v1` | Confirm for Nurellea. |
| | `meta_capi_store_id`, `meta_capi_browser_token` | blank | _Needed:_ Nurellea's CAPI store ID and **browser** token (public, not a secret API key). Purchase events stay server-side; the theme never sends Purchase. |
| | Meta Pixel / Shopify customer events | — | Connect Nurellea's pixel in Shopify → Customer events. Do not reuse Luxory's pixel ID. |
| Subscriptions | `subscriptions_enabled`, `subscription_portal_url` | off / blank | Leave off unless a subscription app with Nurellea selling plans is installed. The PDP only shows plans that exist on the product. No Luxory membership/trial is carried over. |
| Cart | `skip_cart_to_checkout` | off | Optional. |
| Reviews | `reviews_allow_submissions` | on | Submissions go to the store contact inbox (Shopify contact form) for moderation. |
| | `reviews_demo_preview` | off | Shows labelled sample reviews **in the theme editor only**. Never visible on the live store or in structured data. |

## 3. Pages to create (Online Store → Pages)

Create each page and choose the matching template:

| Handle | Template | Content source |
| --- | --- | --- |
| `about` | `page.about` | Page body + section copy. _Needed:_ real brand story (no founder history was invented). |
| `ingredients` | `page.ingredients` | Product metafields + ingredient metaobjects. |
| `faq` | `page.faq` | `nurellea_faq` metaobjects (or section blocks). |
| `contact` | `page.contact` | Shopify contact form. |
| `reviews` | `page.reviews` | `nurellea_review` metaobjects or a review-app block. |
| `track-order` | `page.track-order` | App Manager lookup. |
| `order-status` | `page.order-status` | Checkout return states (see §6). Set to hidden from search; already noindexed. |
| `shipping` | `page.shipping` | Shows Shopify's shipping policy when set; otherwise a "being finalised" notice. |
| `returns` | `page.returns` | Shows Shopify's refund policy when set. |

Privacy policy and terms of service are Shopify policies (Settings → Policies) and render at `/policies/…`. _Needed:_ all four policies written for Nurellea.

Blog: the footer's fallback "Journal" link points to Shopify's default blog, `/blogs/news`. Rename that blog's title to "Journal" (keep the handle) or update the footer menu if you use another handle.

## 4. Navigation

- `main-menu`: Shop (`/collections/all` or the product), Ingredients, Reviews, About, FAQ.
- `footer`: the footer section has three link columns; assign menus or keep the built-in fallback links (Shop all, Gut Gummies, Ingredients, Reviews / FAQ, Track your order, Shipping, Returns, Contact / About, Journal).

## 5. Content model

Single source of truth: product facts live on the **product**; prices, compare-at prices, stock, discounts and totals always come from Shopify variants and cart.

### Product metafields — namespace `nurellea`

| Key | Type | Used for |
| --- | --- | --- |
| `subtitle` | Single line text | Line under the product title. |
| `intro` | Rich text or multi-line text | Short description on PDP and spotlight. |
| `highlights` | List of single line text | Up to 4 pills above the title. |
| `benefits` | List of single line text | Check list under the price. **Only verified, compliant statements.** |
| `ingredients` | List of metaobject references → `nurellea_ingredient` | Ingredient cards (home, ingredients page, PDP). |
| `ingredients_text` | Multi-line text | Full ingredient list exactly as printed. |
| `allergens` | Multi-line text | Allergen statement. |
| `supplement_facts` | JSON | Facts table. Shape: `{ "serving_size": "", "servings_per_container": "", "rows": [{ "name": "", "amount": "", "dv": "" }], "footnote": "" }` |
| `supplement_facts_image` | File (image) | Optional label photo shown with the table. |
| `serving_size`, `servings_per_container` | Single line text | Serving info. |
| `directions` | Multi-line text | Directions from the label. |
| `storage` | Multi-line text | Storage guidance. |
| `warnings` | Multi-line text | Warnings from the label. |
| `faqs` | List of metaobject references → `nurellea_faq` | Product-specific FAQs on the PDP. |

Variant metafields — namespace `nurellea`: `badge` (single line, e.g. "Most popular" — only if true) and `caption` (single line, e.g. "30 gummies").

Ratings: `reviews.rating` and `reviews.rating_count` (Shopify standard, written by a review app or by you from moderated reviews). `aggregateRating` JSON-LD is emitted only when the count is above 0.

### Metaobjects (Settings → Custom data → Metaobjects, storefront access on)

- **`nurellea_ingredient`**: `name` (single line), `amount` (single line, as on label), `summary` (multi-line, factual, no health claims), `image` (file), `source_note` (single line, optional).
- **`nurellea_faq`**: `question` (single line), `answer` (rich text), `category` (single line; drives the topic filter).
- **`nurellea_review`**: `author`, `location`, `title`, `body`, `rating` (integer 1–5), `submitted_on` (date), `product` (product reference), `image` (file, optional), `reply` (multi-line, optional), `order_reference` (single line), `verified_purchase` (boolean). Enable the **Publishable** capability.

### Review moderation workflow

1. Customer submits the review form → arrives in the store's contact inbox (no fake success: Shopify confirms or returns field errors).
2. Staff check the content. If verifying, match the order and fill `order_reference`; set `verified_purchase` only when matched.
3. Create the `nurellea_review` entry as **Draft**, then **Active** to publish. Drafts never render.
4. Update `reviews.rating` / `reviews.rating_count` on the product to reflect published reviews only.

The "Verified purchase" badge renders only when `verified_purchase` is true **and** `order_reference` is filled.

## 6. Checkout return URLs (Phoenix)

Configure Nurellea's Phoenix/ecommcheckout account to return customers to:

- Success: `/pages/order-status?state=success`
- Failure/declined: `/pages/order-status?state=failed`
- Cancelled: `/pages/order-status?state=cancelled`

These pages are informational only and fire no purchase events. Purchase attribution must come from the confirmed-order webhook on the server side, as before.

Phoenix sends `store` (from `Shopify.shop`), `cart` (token) and UTM parameters. Confirm the Nurellea Phoenix account is mapped to the Nurellea `myshopify` domain.

## 7. Assets still needed

All imagery currently shows labelled placeholders ("Placeholder · …").

- Product photography: jar/pack front, back label, gummy close-up, lifestyle. Licensed or owned.
- Hero and brand lifestyle photo(s).
- Ingredient images (or leave the botanical placeholder icon off by removing images).
- Supplement facts / label image matching the final pack.
- **Vector logo (SVG)** — the current files were cropped and resized from the supplied raster logo. Re-export from the vector master at the same names: `assets/nurellea-logo-{320,640}.{png,webp}` (full lockup), `assets/nurellea-wordmark-{320,640}.{png,webp}` and `nurellea-wordmark-light-640.png` (wordmark), `assets/nurellea-icon-{32,180,512}.png` (favicon / touch icon).
- Final social share image (current `assets/nurellea-social-share.jpg` is built from the logo and palette only).

## 8. Facts that must come from Nurellea (not invented in the theme)

Formula and ingredient amounts, serving size, servings per container, directions, warnings, allergens, storage, flavour, gummy shape/count, certifications (vegan, gluten-free etc.), country of manufacture, shipping zones/costs/times, return window, subscription terms, support hours, company legal name and address, founder/brand story, and any reviews or ratings.

## 9. Known checker output

`shopify theme check` reports only pre-existing items outside the Nurellea code:

- `MatchingTranslations` (~2,060): non-English locale files lack some English keys. Shopify falls back to English. Fix only if launching other languages.
- `UnknownFilter 'raw'` in `sections/gp-variant-selected.liquid` (GemPages app section, kept for app compatibility; GemPages embeds are disabled in settings).

## 10. Verification tooling

- `npm test` — static audit (schemas, references, banned claims, Luxory residue, review/JSON-LD integrity, integration defaults) plus **mocked** browser tests for Meta CAPI dedupe, Phoenix handoff/fallback, order tracking, PDP variant logic, reviews, FAQ and order-status states. No live network calls.
- `npm run preview` — local mock preview at `http://localhost:4173` with labelled sample data. It renders the Nurellea sections with a Liquid emulator; Horizon's own header, cart drawer and checkout are stand-ins and must be checked on a Shopify preview theme.
- `node dev/preview/screenshots.mjs` — desktop (1440) and mobile (390) captures into `dev/preview/screens/`.

### Still to verify on a Nurellea **unpublished preview theme** (not possible locally)

Horizon header/cart drawer with the Nurellea logo, real add-to-cart and cart drawer update, discount codes in cart, native checkout fallback, Phoenix redirect with the real URL, App Manager lookup against a real order, Meta CAPI beacon reaching the Nurellea endpoint once (Events Manager test events), contact and review form submission emails, `/sitemap.xml` and `/robots.txt` on the Nurellea domain, and Rich Results Test for Product/Organization/Breadcrumb JSON-LD.
