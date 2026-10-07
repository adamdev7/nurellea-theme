/* Nurellea storefront interactions. No tracking or checkout logic lives here:
   add-to-cart is handled by Horizon's <product-form-component>, checkout by the existing routing script,
   and analytics by meta-capi-attribution.js. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Reveal on scroll (only for content below the fold) ---------- */
  function initReveal(root = document) {
    const items = $$('[data-nl-reveal]:not([data-nl-reveal-init])', root);
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.setAttribute('data-nl-reveal-init', ''));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove('nl-reveal--pending');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    const fold = window.innerHeight;
    items.forEach((el) => {
      el.setAttribute('data-nl-reveal-init', '');
      if (el.getBoundingClientRect().top > fold) {
        el.classList.add('nl-reveal--pending');
        io.observe(el);
      }
    });
  }

  /* ---------- Gallery ---------- */
  class Gallery {
    constructor(root) {
      this.root = root;
      this.viewport = $('[data-nl-gallery-viewport]', root);
      this.slides = $$('[data-nl-gallery-slide]', root);
      this.thumbs = $$('[data-nl-gallery-thumb]', root);
      this.dots = $$('[data-nl-gallery-dot]', root);
      this.prev = $('[data-nl-gallery-prev]', root);
      this.next = $('[data-nl-gallery-next]', root);
      this.counter = $('[data-nl-gallery-counter]', root);
      this.index = 0;
      if (!this.viewport || this.slides.length === 0) return;

      this.prev?.addEventListener('click', () => this.go(this.index - 1));
      this.next?.addEventListener('click', () => this.go(this.index + 1));
      this.thumbs.forEach((t, i) => t.addEventListener('click', () => this.go(i)));
      this.dots.forEach((d, i) => d.addEventListener('click', () => this.go(i)));
      this.viewport.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.go(this.index + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.index - 1); }
      });

      let raf = 0;
      this.viewport.addEventListener(
        'scroll',
        () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const w = this.viewport.clientWidth || 1;
            const i = Math.round(Math.abs(this.viewport.scrollLeft) / w);
            if (i !== this.index) this.setActive(i);
          });
        },
        { passive: true }
      );
      this.setActive(0);
    }

    go(i) {
      const clamped = Math.max(0, Math.min(this.slides.length - 1, i));
      const slide = this.slides[clamped];
      if (!slide) return;
      const rtl = getComputedStyle(this.viewport).direction === 'rtl';
      this.viewport.scrollTo({
        left: (rtl ? -1 : 1) * slide.offsetLeft - (rtl ? 0 : this.slides[0].offsetLeft),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
      this.setActive(clamped);
    }

    goToMedia(mediaId) {
      if (!mediaId) return;
      const i = this.slides.findIndex((s) => s.dataset.mediaId === String(mediaId));
      if (i >= 0) this.go(i);
    }

    setActive(i) {
      this.index = i;
      this.slides.forEach((s, n) => s.setAttribute('aria-hidden', n === i ? 'false' : 'true'));
      this.thumbs.forEach((t, n) => t.setAttribute('aria-current', n === i ? 'true' : 'false'));
      this.dots.forEach((d, n) => d.setAttribute('aria-current', n === i ? 'true' : 'false'));
      if (this.prev) this.prev.disabled = i === 0;
      if (this.next) this.next.disabled = i === this.slides.length - 1;
      if (this.counter) this.counter.textContent = `${i + 1} / ${this.slides.length}`;
    }
  }

  /* ---------- Product (variant/bundle cards, purchase options, sticky bar) ---------- */
  class ProductController {
    constructor(root) {
      this.root = root;
      const dataEl = $('script[data-nl-product-json]', root);
      if (!dataEl) return;
      try {
        this.data = JSON.parse(dataEl.textContent || '{}');
      } catch {
        return;
      }
      this.variants = this.data.variants || [];
      this.form = $('form[data-type="add-to-cart-form"]', root);
      this.idInput = this.form ? $('input[name="id"]', this.form) : null;
      this.planInput = this.form ? $('input[name="selling_plan"]', this.form) : null;
      this.atcButton = this.form ? $('button[name="add"]', this.form) : null;
      this.gallery = root.__nlGallery || null;
      this.sticky = $('[data-nl-sticky-atc]', document);

      $$('input[data-nl-variant-input]', root).forEach((input) =>
        input.addEventListener('change', () => input.checked && this.selectVariant(input.value, true))
      );
      $$('input[data-nl-plan-input]', root).forEach((input) =>
        input.addEventListener('change', () => input.checked && this.selectPlan(input.value))
      );

      // Bundle options add N units of the selected variant; the matching Shopify automatic discount prices them.
      this.tierInputs = $$('input[data-nl-tier-input]', root);
      this.tierQtyInput = this.form ? $('input[data-nl-tier-qty]', this.form) : null;
      this.formComponent = root.querySelector('product-form-component');
      this.tierInputs.forEach((input) =>
        input.addEventListener('change', () => input.checked && this.selectTier(Number(input.value)))
      );
      const checkedTier = this.tierInputs.find((input) => input.checked);
      this.tierIndex = checkedTier ? Number(checkedTier.value) : 0;

      const initial = this.idInput?.value;
      this.current = this.variants.find((v) => String(v.id) === String(initial)) || this.variants[0];
      this.currentPlan = this.planInput?.value || '';
      if (this.tierInputs.length) this.selectTier(this.tierIndex);
      else this.render();
      this.initSticky();
    }

    tier(variant = this.current) {
      if (!this.tierInputs.length || !variant || !Array.isArray(variant.tiers)) return null;
      return variant.tiers[this.tierIndex] || null;
    }

    selectTier(index) {
      const input = this.tierInputs[index];
      if (!input) return;
      this.tierIndex = index;
      const qty = String(Math.max(1, parseInt(input.dataset.qty, 10) || 1));
      if (this.tierQtyInput) this.tierQtyInput.value = qty;
      if (this.formComponent) this.formComponent.dataset.quantityDefault = qty;
      this.syncAttribution();
      this.render();
    }

    syncAttribution() {
      // Keep the attribution config in sync so AddToCart beacons carry the real per-unit price of what is added.
      const capi = window.__META_CAPI__;
      const v = this.current;
      if (!v || !capi || typeof capi !== 'object') return;
      const tier = this.tier(v);
      capi.variantId = v.id;
      capi.productPrice = (tier && typeof tier.each_cents === 'number' ? tier.each_cents : v.price_cents) / 100;
    }

    selectVariant(id, userInitiated) {
      const variant = this.variants.find((v) => String(v.id) === String(id));
      if (!variant) return;
      this.current = variant;
      if (this.idInput) {
        this.idInput.value = String(variant.id);
        this.idInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (userInitiated) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', String(variant.id));
        window.history.replaceState(window.history.state, '', url.toString());
        if (variant.featured_media_id) this.gallery?.goToMedia(variant.featured_media_id);
      }
      this.syncAttribution();
      this.render();
    }

    selectPlan(planId) {
      this.currentPlan = planId || '';
      if (this.planInput) {
        this.planInput.value = this.currentPlan;
        this.planInput.disabled = !this.currentPlan;
      }
      this.render();
    }

    priceFor(variant) {
      if (this.currentPlan && variant.plans && variant.plans[this.currentPlan]) {
        return variant.plans[this.currentPlan];
      }
      return variant;
    }

    render() {
      const v = this.current;
      if (!v) return;
      const p = this.priceFor(v);
      const set = (sel, text) => $$(sel, this.root).concat(this.sticky ? $$(sel, this.sticky) : []).forEach((el) => {
        if (text) {
          el.textContent = text;
          el.hidden = false;
        } else {
          el.textContent = '';
          el.hidden = true;
        }
      });
      const tier = this.currentPlan ? null : this.tier(v);
      const tierTitle = this.tierInputs.length ? this.tierInputs[this.tierIndex]?.dataset.title || '' : '';
      const variantTitle = this.variants.length > 1 ? v.title : '';
      if (tier) {
        set('[data-nl-price]', tier.total);
        set('[data-nl-compare]', tier.full || '');
        set('[data-nl-save]', tier.save ? `${this.data.strings.save} ${tier.save}` : '');
      } else {
        set('[data-nl-price]', p.price);
        set('[data-nl-compare]', p.compare_at || '');
        set('[data-nl-save]', p.savings ? `${this.data.strings.save} ${p.savings}` : '');
      }
      set('[data-nl-unit]', v.unit_price || '');
      set('[data-nl-variant-title]', [variantTitle, tierTitle].filter(Boolean).join(' · '));
      this.renderTiers(v);

      $$('[data-nl-stock]', this.root).forEach((el) => {
        el.dataset.available = String(v.available);
        el.textContent = v.available ? this.data.strings.in_stock : this.data.strings.sold_out;
      });

      const buttons = [this.atcButton, this.sticky ? $('[data-nl-sticky-submit]', this.sticky) : null].filter(Boolean);
      buttons.forEach((btn) => {
        btn.disabled = !v.available;
        const label = $('[data-nl-atc-label]', btn) || $('.add-to-cart-text__content span span', btn);
        if (label) label.textContent = v.available ? this.data.strings.add_to_cart : this.data.strings.sold_out;
      });

      $$('[data-nl-plan-price]', this.root).forEach((el) => {
        const plan = el.dataset.nlPlanPrice;
        const src = plan && v.plans ? v.plans[plan] : v;
        if (src) el.textContent = src.price;
      });
    }

    renderTiers(v) {
      if (!this.tierInputs.length || !Array.isArray(v.tiers)) return;
      const perDay = this.data.strings.per_day || '[amount]/day';
      $$('[data-nl-tier]', this.root).forEach((card) => {
        const t = v.tiers[Number(card.dataset.nlTier)];
        if (!t) return;
        const put = (sel, text) => $$(sel, card).forEach((el) => {
          el.textContent = text || '';
          el.hidden = !text;
        });
        put('[data-nl-tier-total]', t.total);
        put('[data-nl-tier-each]', t.each);
        put('[data-nl-tier-full]', t.full);
        put('[data-nl-tier-perday]', t.per_day ? perDay.replace('[amount]', t.per_day) : '');
        put('[data-nl-tier-save]', t.save ? `${this.data.strings.save} ${t.save}` : '');
        $$('[data-nl-tier-free]', card).forEach((el) => (el.hidden = !t.free_shipping));
      });
    }

    initSticky() {
      if (!this.sticky || !this.atcButton) return;
      const submit = $('[data-nl-sticky-submit]', this.sticky);
      submit?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!this.form || submit.disabled) return;
        // Submit through the main form so Horizon's handler, cart drawer and existing tracking run unchanged.
        if (typeof this.form.requestSubmit === 'function') this.form.requestSubmit(this.atcButton);
        else this.atcButton.click();
      });

      if (!('IntersectionObserver' in window)) return;
      const target = this.atcButton.closest('[data-nl-buy-area]') || this.atcButton;
      let atcVisible = true;
      let footerVisible = false;
      const update = () => {
        const show = !atcVisible && !footerVisible && window.scrollY > 200;
        this.sticky.classList.toggle('is-visible', show);
        this.sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
        $$('a, button, input', this.sticky).forEach((el) => (show ? el.removeAttribute('tabindex') : el.setAttribute('tabindex', '-1')));
      };
      new IntersectionObserver(([entry]) => {
        atcVisible = entry.isIntersecting || entry.boundingClientRect.top > window.innerHeight;
        update();
      }).observe(target);
      const footer = document.querySelector('footer, .shopify-section-group-footer-group');
      if (footer) {
        new IntersectionObserver(([entry]) => {
          footerVisible = entry.isIntersecting;
          update();
        }).observe(footer);
      }
      update();
    }
  }

  /* ---------- Quantity steppers (inside the product form) ---------- */
  function initQuantity(root = document) {
    $$('[data-nl-qty]:not([data-nl-init])', root).forEach((wrap) => {
      wrap.setAttribute('data-nl-init', '');
      const input = $('input', wrap);
      if (!input) return;
      const clamp = (n) => {
        const min = Number(input.min) || 1;
        const max = input.max ? Number(input.max) : Infinity;
        const step = Number(input.step) || 1;
        let v = Number.isFinite(n) ? n : min;
        v = Math.max(min, Math.min(max, v));
        return Math.round(v / step) * step || min;
      };
      $('[data-nl-qty-minus]', wrap)?.addEventListener('click', () => {
        input.value = String(clamp(Number(input.value) - (Number(input.step) || 1)));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      $('[data-nl-qty-plus]', wrap)?.addEventListener('click', () => {
        input.value = String(clamp(Number(input.value) + (Number(input.step) || 1)));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      input.addEventListener('blur', () => (input.value = String(clamp(Number(input.value)))));
    });
  }

  /* ---------- Reviews list: filter, sort, paginate (client-side over moderated reviews) ---------- */
  function initReviews(root = document) {
    $$('[data-nl-reviews]:not([data-nl-init])', root).forEach((wrap) => {
      wrap.setAttribute('data-nl-init', '');
      const list = $('[data-nl-reviews-list]', wrap);
      if (!list) return;
      const items = $$('[data-nl-review]', list);
      const sortSel = $('[data-nl-reviews-sort]', wrap);
      const filters = $$('[data-nl-reviews-filter]', wrap);
      const more = $('[data-nl-reviews-more]', wrap);
      const count = $('[data-nl-reviews-count]', wrap);
      const empty = $('[data-nl-reviews-empty]', wrap);
      const pageSize = Number(wrap.dataset.pageSize) || 9;
      let shown = pageSize;
      let filter = 'all';

      const matches = (el) => {
        if (filter === 'all') return true;
        if (filter === 'verified') return el.dataset.verified === 'true';
        if (filter === 'media') return el.dataset.hasMedia === 'true';
        if (filter.startsWith('rating-')) return el.dataset.rating === filter.slice(7);
        return true;
      };

      const apply = () => {
        const mode = sortSel?.value || 'newest';
        const sorted = items.slice().sort((a, b) => {
          const ra = Number(a.dataset.rating) || 0;
          const rb = Number(b.dataset.rating) || 0;
          const da = Date.parse(a.dataset.date || '') || 0;
          const db = Date.parse(b.dataset.date || '') || 0;
          if (mode === 'highest') return rb - ra || db - da;
          if (mode === 'lowest') return ra - rb || db - da;
          if (mode === 'oldest') return da - db;
          return db - da;
        });
        let visible = 0;
        let total = 0;
        sorted.forEach((el) => {
          list.appendChild(el);
          const ok = matches(el);
          if (ok) total += 1;
          const show = ok && visible < shown;
          if (show) visible += 1;
          el.hidden = !show;
        });
        if (count) count.textContent = String(total);
        if (empty) empty.hidden = total !== 0 || items.length === 0;
        if (more) more.hidden = visible >= total;
      };

      sortSel?.addEventListener('change', () => { shown = pageSize; apply(); });
      filters.forEach((btn) =>
        btn.addEventListener('click', () => {
          filter = btn.dataset.nlReviewsFilter || 'all';
          filters.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
          shown = pageSize;
          apply();
        })
      );
      more?.addEventListener('click', () => { shown += pageSize; apply(); });
      apply();
    });
  }

  /* ---------- FAQ: search + category filter ---------- */
  function initFaq(root = document) {
    $$('[data-nl-faq]:not([data-nl-init])', root).forEach((wrap) => {
      wrap.setAttribute('data-nl-init', '');
      const items = $$('[data-nl-faq-item]', wrap);
      const search = $('[data-nl-faq-search]', wrap);
      const cats = $$('[data-nl-faq-cat]', wrap);
      const empty = $('[data-nl-faq-empty]', wrap);
      let cat = 'all';
      const apply = () => {
        const q = (search?.value || '').trim().toLowerCase();
        let n = 0;
        items.forEach((el) => {
          const okCat = cat === 'all' || (el.dataset.category || '') === cat;
          const okQ = !q || el.textContent.toLowerCase().includes(q);
          el.hidden = !(okCat && okQ);
          if (!el.hidden) n += 1;
        });
        $$('[data-nl-faq-group]', wrap).forEach((g) => {
          g.hidden = !$$('[data-nl-faq-item]', g).some((el) => !el.hidden);
        });
        if (empty) empty.hidden = n !== 0;
      };
      search?.addEventListener('input', apply);
      cats.forEach((btn) =>
        btn.addEventListener('click', () => {
          cat = btn.dataset.nlFaqCat || 'all';
          cats.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
          apply();
        })
      );
    });
  }

  function init(root = document) {
    $$('[data-nl-gallery]', root).forEach((el) => {
      if (!el.__nlGallery) {
        el.__nlGallery = new Gallery(el);
        const product = el.closest('[data-nl-product]');
        if (product) product.__nlGallery = el.__nlGallery;
      }
    });
    $$('[data-nl-product]', root).forEach((el) => {
      if (!el.__nlProduct) el.__nlProduct = new ProductController(el);
    });
    // Make sure a server-rendered form result (success or error) is never hidden inside a collapsed panel.
    $$('details[data-nl-autoopen]', root).forEach((d) => {
      const alert = $('.nl-alert', d);
      if (alert) {
        d.open = true;
        alert.focus({ preventScroll: false });
      }
    });
    initQuantity(root);
    initReviews(root);
    initFaq(root);
    initReveal(root);
  }

  window.Nurellea = Object.freeze({ init });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();

  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
