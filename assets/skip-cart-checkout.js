(function () {
  const CHECKOUT_URL = '/checkout';
  const CART_PATH = '/cart';

  /** Redirect cart page visitors straight to checkout when they have items. */
  function redirectCartPage() {
    if (!window.location.pathname.endsWith(CART_PATH)) return;

    fetch('/cart.js', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((cart) => {
        if (cart.item_count > 0) {
          window.location.replace(CHECKOUT_URL);
        }
      })
      .catch(() => {});
  }

  function shouldRedirectAfterAddToCart() {
    return Boolean(
      document.querySelector('[data-product-bundle]') ||
        document.querySelector('gp-product') ||
        document.querySelector('product-form-component') ||
        document.body.classList.contains('template-product')
    );
  }

  /**
   * After GemPages / theme add-to-cart on product pages, send shoppers to checkout.
   */
  function interceptAddToCartRedirects() {
    const originalFetch = window.fetch;
    if (!originalFetch || originalFetch.__skipCartPatched) return;

    /**
     * @param {RequestInfo | URL} input
     * @param {RequestInit} [init]
     */
    function patchedFetch(input, init) {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : input instanceof URL
              ? input.href
              : '';

      const method =
        init?.method || (input instanceof Request ? input.method : 'GET');
      const isCartMutation =
        method === 'POST' &&
        (url.includes('/cart/add') || url.includes('/cart/change') || url.includes('/cart/update'));

      if (!isCartMutation || !shouldRedirectAfterAddToCart()) {
        return originalFetch.call(this, input, init);
      }

      return originalFetch.call(this, input, init).then((response) => {
        if (!response.ok) return response;

        const clone = response.clone();
        clone
          .json()
          .then(() => {
            if (document.querySelector('[data-product-bundle]')) {
              return;
            }
            setTimeout(() => {
              window.location.href = CHECKOUT_URL;
            }, 80);
          })
          .catch(() => {});

        return response;
      });
    }

    patchedFetch.__skipCartPatched = true;
    window.fetch = patchedFetch;
  }

  /** GemPages product button uses gp-href to /cart — override after click. */
  function patchGemPagesButtons() {
    document.querySelectorAll('gp-product-button[gp-href*="/cart"]').forEach((el) => {
      el.setAttribute('gp-href', CHECKOUT_URL);
    });

    document.querySelectorAll('.gp-product-button').forEach((wrapper) => {
      try {
        const raw = wrapper.getAttribute('gp-data');
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.setting) {
          data.setting.actionEffect = 'redirect';
          data.setting.customURL = { link: CHECKOUT_URL, target: '_self' };
          wrapper.setAttribute('gp-data', JSON.stringify(data));
        }
      } catch {
        /* ignore invalid JSON */
      }
    });
  }

  function init() {
    redirectCartPage();
    interceptAddToCartRedirects();
    patchGemPagesButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', patchGemPagesButtons);
})();
