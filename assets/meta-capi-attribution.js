/**
 * Meta CAPI full-funnel attribution for Shopify + Phoenix checkout.
 * Sends: PageView, ViewContent, Search, AddToCart, InitiateCheckout (+ Attribution cache).
 * Captures fbp/fbc/fbclid/UA and a stable external_id for match quality.
 */
(function () {
  'use strict';

  var cfg = window.__META_CAPI__ || {};
  if (cfg.enabled === false) return;

  var STORAGE_KEY = 'meta_capi_attribution';
  var EXT_ID_KEY = 'meta_capi_ext_id';
  var COOKIE_DAYS = 90;
  var lastAtcKey = '';
  var lastAtcAt = 0;

  function getCookie(name) {
    var m = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
    );
    return m ? decodeURIComponent(m[1]) : '';
  }

  function setCookie(name, value, days) {
    var maxAge = (days || COOKIE_DAYS) * 86400;
    document.cookie =
      name +
      '=' +
      encodeURIComponent(value) +
      '; path=/; max-age=' +
      maxAge +
      '; SameSite=Lax';
  }

  function readStored() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function writeStored(data) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function ensureFbp() {
    var fbp = getCookie('_fbp');
    if (fbp) return fbp;
    fbp = 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 1e10);
    setCookie('_fbp', fbp, COOKIE_DAYS);
    return fbp;
  }

  function getExternalId() {
    if (cfg.customerId) return String(cfg.customerId);
    try {
      var existing = localStorage.getItem(EXT_ID_KEY);
      if (existing) return existing;
      var id = 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(EXT_ID_KEY, id);
      return id;
    } catch (e) {
      return 'g_' + Date.now();
    }
  }

  function captureFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var fbclid = params.get('fbclid') || '';
    var data = readStored();
    if (fbclid) {
      data.fbclid = fbclid;
      var fbc = 'fb.1.' + Date.now() + '.' + fbclid;
      data.fbc = fbc;
      setCookie('_fbc', fbc, COOKIE_DAYS);
    }
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      var v = params.get(k);
      if (v) data[k] = v;
    });
    data.fbp = getCookie('_fbp') || data.fbp || ensureFbp();
    data.fbc = getCookie('_fbc') || data.fbc || '';
    data.landing = data.landing || window.location.href;
    data.user_agent = navigator.userAgent || '';
    data.external_id = getExternalId();
    writeStored(data);
    return data;
  }

  function getAttribution() {
    var data = captureFromUrl();
    data.fbp = getCookie('_fbp') || data.fbp || ensureFbp();
    data.fbc = getCookie('_fbc') || data.fbc || '';
    data.user_agent = navigator.userAgent || data.user_agent || '';
    data.external_id = getExternalId();
    return data;
  }

  function syncCartAttributes(cartToken) {
    var data = getAttribution();
    var attributes = {
      _fbp: data.fbp || '',
      _fbc: data.fbc || '',
      fbclid: data.fbclid || '',
      user_agent: data.user_agent || '',
      external_id: data.external_id || '',
      utm_source: data.utm_source || '',
      utm_medium: data.utm_medium || '',
      utm_campaign: data.utm_campaign || '',
      utm_content: data.utm_content || '',
      utm_term: data.utm_term || '',
      meta_landing: (data.landing || '').slice(0, 500),
    };
    if (cartToken) attributes.cart_token = String(cartToken);
    return fetch('/cart/update.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes: attributes }),
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .catch(function () {
        return null;
      });
  }

  function appendToCheckoutUrl(url) {
    try {
      var dest = new URL(url, window.location.origin);
      var data = getAttribution();
      if (data.fbp) dest.searchParams.set('fbp', data.fbp);
      if (data.fbc) dest.searchParams.set('fbc', data.fbc);
      if (data.fbclid) dest.searchParams.set('fbclid', data.fbclid);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
        if (data[k] && !dest.searchParams.has(k)) dest.searchParams.set(k, data[k]);
      });
      return dest.toString();
    } catch (e) {
      return url;
    }
  }

  function sendBeacon(eventName, payload) {
    if (!cfg.apiBase || !cfg.storeId || !cfg.browserToken) return;
    payload = payload || {};
    var data = getAttribution();
    var body = {
      event_name: eventName,
      event_id: payload.event_id,
      event_source_url: payload.event_source_url || window.location.href,
      currency: payload.currency || cfg.currency || 'USD',
      value: payload.value,
      content_ids: payload.content_ids,
      contents: payload.contents,
      num_items: payload.num_items,
      search_string: payload.search_string,
      content_name: payload.content_name,
      content_category: payload.content_category,
      fbp: data.fbp,
      fbc: data.fbc,
      fbclid: data.fbclid,
      client_user_agent: data.user_agent || navigator.userAgent,
      cart_token: payload.cart_token || data.cart_token || undefined,
      external_id: data.external_id || cfg.customerId || undefined,
    };
    var endpoint =
      cfg.apiBase.replace(/\/$/, '') +
      '/meta-capi/stores/' +
      encodeURIComponent(cfg.storeId) +
      '/browser-event?token=' +
      encodeURIComponent(cfg.browserToken);

    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
        mode: 'cors',
      }).catch(function () {});
    } catch (e) {}
  }

  function firePageView() {
    var key = 'meta_capi_pv_' + window.location.pathname;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (e) {}
    sendBeacon('PageView', {
      event_id: 'pv_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
    });
  }

  function onProductView() {
    if (!cfg.productId) return;
    var dedupeKey = 'meta_capi_vc_' + cfg.productId;
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, '1');
    } catch (e) {}
    sendBeacon('ViewContent', {
      event_id: 'vc_' + cfg.productId + '_' + Date.now(),
      content_ids: [String(cfg.variantId || cfg.productId)],
      contents: [
        {
          id: String(cfg.variantId || cfg.productId),
          quantity: 1,
          item_price: cfg.productPrice || 0,
        },
      ],
      value: cfg.productPrice || 0,
      num_items: 1,
      content_name: cfg.productTitle || undefined,
      content_category: cfg.productType || undefined,
    });
  }

  function fireSearch(query) {
    var q = String(query || '').trim();
    if (!q) return;
    var dedupeKey = 'meta_capi_search_' + q.toLowerCase();
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, '1');
    } catch (e) {}
    sendBeacon('Search', {
      event_id: 'sr_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
      search_string: q.slice(0, 500),
    });
  }

  function fireAddToCart(variantId, qty, price) {
    if (!variantId) return;
    qty = qty || 1;
    price = typeof price === 'number' ? price : cfg.productPrice || 0;
    var dedupe = String(variantId) + ':' + qty;
    var now = Date.now();
    if (dedupe === lastAtcKey && now - lastAtcAt < 1500) return;
    lastAtcKey = dedupe;
    lastAtcAt = now;
    syncCartAttributes();
    var stored = getAttribution();
    sendBeacon('AddToCart', {
      event_id: 'atc_' + variantId + '_' + now,
      cart_token: stored.cart_token,
      content_ids: [String(variantId)],
      contents: [
        {
          id: String(variantId),
          quantity: qty,
          item_price: price,
        },
      ],
      value: price * qty,
      num_items: qty,
    });
  }

  function parseAddToCartBody(body) {
    if (!body) return null;
    try {
      if (typeof body === 'string') {
        if (body.trim().charAt(0) === '{') {
          var json = JSON.parse(body);
          return {
            id: json.id || json.variant_id,
            quantity: parseInt(json.quantity || '1', 10) || 1,
          };
        }
        var params = new URLSearchParams(body);
        return {
          id: params.get('id') || params.get('items[0][id]'),
          quantity: parseInt(params.get('quantity') || params.get('items[0][quantity]') || '1', 10) || 1,
        };
      }
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        return {
          id: body.get('id') || body.get('items[0][id]'),
          quantity: parseInt(String(body.get('quantity') || body.get('items[0][quantity]') || '1'), 10) || 1,
        };
      }
      if (typeof body === 'object') {
        return {
          id: body.id || body.variant_id,
          quantity: parseInt(body.quantity || '1', 10) || 1,
        };
      }
    } catch (e) {}
    return null;
  }

  function isCartAddUrl(url) {
    try {
      var u = String(url || '');
      return u.indexOf('/cart/add') !== -1;
    } catch (e) {
      return false;
    }
  }

  function hookAjaxAddToCart() {
    if (typeof window.fetch === 'function') {
      var origFetch = window.fetch;
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : input && input.url;
        var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        var promise = origFetch.apply(this, arguments);
        if (method === 'POST' && isCartAddUrl(url)) {
          var parsed = parseAddToCartBody(init && init.body);
          promise
            .then(function (res) {
              if (!res || !res.ok) return;
              var id = parsed && parsed.id;
              var qty = (parsed && parsed.quantity) || 1;
              if (id) fireAddToCart(id, qty, cfg.productPrice || 0);
              else {
                res
                  .clone()
                  .json()
                  .then(function (data) {
                    var item = Array.isArray(data.items) ? data.items[0] : data;
                    if (!item) return;
                    fireAddToCart(
                      item.variant_id || item.id,
                      item.quantity || qty,
                      (item.final_price || item.price || 0) / 100
                    );
                  })
                  .catch(function () {});
              }
            })
            .catch(function () {});
        }
        return promise;
      };
    }

    if (typeof XMLHttpRequest !== 'undefined') {
      var origOpen = XMLHttpRequest.prototype.open;
      var origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__metaCapiMethod = method;
        this.__metaCapiUrl = url;
        return origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function (body) {
        var xhr = this;
        if (
          String(xhr.__metaCapiMethod || '').toUpperCase() === 'POST' &&
          isCartAddUrl(xhr.__metaCapiUrl)
        ) {
          var parsed = parseAddToCartBody(body);
          xhr.addEventListener('load', function () {
            if (xhr.status < 200 || xhr.status >= 300) return;
            if (parsed && parsed.id) {
              fireAddToCart(parsed.id, parsed.quantity || 1, cfg.productPrice || 0);
              return;
            }
            try {
              var data = JSON.parse(xhr.responseText || '{}');
              var item = Array.isArray(data.items) ? data.items[0] : data;
              if (item) {
                fireAddToCart(
                  item.variant_id || item.id,
                  item.quantity || 1,
                  (item.final_price || item.price || 0) / 100
                );
              }
            } catch (e) {}
          });
        }
        return origSend.apply(this, arguments);
      };
    }
  }

  function bootSession() {
    fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (cart) {
        var token = cart && cart.token ? String(cart.token) : '';
        if (token) {
          var data = getAttribution();
          data.cart_token = token;
          writeStored(data);
        }
        return syncCartAttributes(token).then(function () {
          return token;
        });
      })
      .then(function (token) {
        sendBeacon('Attribution', {
          event_id: 'attr_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
          cart_token: token || undefined,
        });
        firePageView();
      })
      .catch(function () {
        syncCartAttributes();
        sendBeacon('Attribution', {
          event_id: 'attr_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
        });
        firePageView();
      });
  }

  window.MetaCapiAttribution = {
    get: getAttribution,
    syncCartAttributes: syncCartAttributes,
    appendToCheckoutUrl: appendToCheckoutUrl,
    sendBeacon: sendBeacon,
    fireAddToCart: fireAddToCart,
    fireSearch: fireSearch,
  };

  captureFromUrl();
  hookAjaxAddToCart();
  bootSession();

  if (cfg.pageType === 'product') {
    setTimeout(onProductView, 400);
  }

  // Search page (?q=) or predictive search forms
  try {
    var qParam = new URLSearchParams(window.location.search).get('q');
    if ((cfg.pageType === 'search' || window.location.pathname.indexOf('/search') !== -1) && qParam) {
      setTimeout(function () {
        fireSearch(qParam);
      }, 300);
    }
  } catch (e) {}

  document.addEventListener(
    'submit',
    function (ev) {
      var form = ev.target;
      if (!(form instanceof HTMLFormElement)) return;
      var action = (form.getAttribute('action') || '').toLowerCase();
      var role = (form.getAttribute('role') || '').toLowerCase();

      // Search forms
      if (action.indexOf('/search') !== -1 || role === 'search') {
        var qInput =
          form.querySelector('[name="q"]') ||
          form.querySelector('input[type="search"]') ||
          form.querySelector('input[name="query"]');
        if (qInput && qInput.value) fireSearch(qInput.value);
      }

      // Classic form AddToCart
      if (action.indexOf('/cart/add') === -1 && !form.querySelector('[name="id"]')) return;
      var idInput = form.querySelector('[name="id"]');
      if (!idInput && action.indexOf('/cart/add') === -1) return;
      var qtyInput = form.querySelector('[name="quantity"]');
      var variantId = idInput ? idInput.value : cfg.variantId;
      var qty = qtyInput ? parseInt(qtyInput.value || '1', 10) : 1;
      fireAddToCart(variantId, qty || 1, cfg.productPrice || 0);
    },
    true
  );
})();
