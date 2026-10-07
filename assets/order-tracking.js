/**
 * Order tracking page — App Manager storefront API.
 *
 * GET https://appmanager.store/api/track-order?store_id=&order_number=&email=
 * Configure apiBase and storeId via Theme settings → Order tracking (App Manager).
 * Production base URL: https://appmanager.store (no localhost / tunnels).
 */

/**
 * @typedef {Object} TrackingEvent
 * @property {string} id
 * @property {string} date
 * @property {string} time
 * @property {string} location
 * @property {string} description
 * @property {boolean} completed
 * @property {boolean} [current]
 * @property {boolean} [isStart]
 * @property {string} [eventStatus]
 *
 * @typedef {Object} OrderLineItem
 * @property {string} title
 * @property {string} variant
 * @property {number} quantity
 * @property {string} imageUrl
 * @property {string} price
 *
 * @typedef {Object} TrackingOrderSummary
 * @property {string} number
 * @property {string} email
 * @property {string} [placedAt]
 * @property {string} [total]
 * @property {string} [currency]
 * @property {OrderLineItem[]} lineItems
 *
 * @typedef {Object} TrackingShipment
 * @property {boolean} shipped
 * @property {string} trackingNumber
 * @property {string} carrier
 * @property {string} carrierCode
 * @property {string} status
 * @property {string} statusLabel
 * @property {string} [message]
 * @property {string} [estimatedDelivery]
 * @property {string} [lastUpdated]
 * @property {TrackingEvent[]} events
 *
 * @typedef {Object} TrackingResponse
 * @property {boolean} success
 * @property {string} [errorCode]
 * @property {string} [message]
 * @property {TrackingOrderSummary} [order]
 * @property {TrackingShipment | null} [shipment]
 *
 * @typedef {Object} AppManagerTrackResponse
 * @property {string} order_number
 * @property {boolean} [shipped]
 * @property {string} status
 * @property {string | null} [status_label]
 * @property {string | null} [message]
 * @property {string | null} [tracking_number]
 * @property {string | null} [carrier]
 * @property {string | null} [order_placed_at]
 * @property {string | null} [order_total]
 * @property {string | null} [currency]
 * @property {{ title: string, variant?: string, quantity: number, image_url?: string, price: string }[]} [line_items]
 * @property {{ status: string, description: string, at: string, location?: string }[]} [timeline]
 * @property {string | null} [last_updated_at]
 *
 * @typedef {Object} TrackingConfig
 * @property {string} apiBase
 * @property {string} storeId
 * @property {string} configError
 * @property {string} invalidApiError
 * @property {string} serviceError
 */

const SELECTORS = {
  root: '[data-order-tracking]',
  form: '[data-tracking-form]',
  orderInput: '[data-tracking-order]',
  emailInput: '[data-tracking-email]',
  submitBtn: '[data-tracking-submit]',
  statePanels: '[data-tracking-state]',
  loading: '[data-tracking-state="loading"]',
  error: '[data-tracking-state="error"]',
  errorMessage: '[data-tracking-error-message]',
  result: '[data-tracking-state="result"]',
  formView: '[data-tracking-state="form"]',
  statusBadge: '[data-tracking-status-badge]',
  statusLabel: '[data-tracking-status-label]',
  statusMessage: '[data-tracking-status-message]',
  shipmentDetails: '[data-tracking-shipment-details]',
  shipmentMeta: '[data-tracking-shipment-meta]',
  trackingNumber: '[data-tracking-number]',
  carrier: '[data-tracking-carrier]',
  estimatedDelivery: '[data-tracking-estimated-delivery]',
  timeline: '[data-tracking-timeline]',
  orderNumber: '[data-order-number]',
  orderDate: '[data-order-date]',
  orderTotal: '[data-order-total]',
  lineItems: '[data-order-line-items]',
  trackAnother: '[data-tracking-reset]',
  copyTracking: '[data-copy-tracking]',
};

const UNSHIPPED_STATUS_FALLBACK = 'Not shipped yet';
const UNSHIPPED_MESSAGE_FALLBACK =
  'Your order has been placed and is being prepared. It has not shipped yet.';

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i;
const TRACK_ORDER_PATH = /\/api\/track-order\/?$/i;

/**
 * Accepts base URL or full track-order endpoint from App Manager UI.
 * @param {string} raw
 */
function normalizeApiBase(raw) {
  return (raw || '')
    .trim()
    .replace(TRACK_ORDER_PATH, '')
    .replace(/\/$/, '');
}

/**
 * @param {HTMLElement} root
 * @returns {TrackingConfig}
 */
function readConfig(root) {
  return {
    apiBase: normalizeApiBase(root.dataset.apiBase || ''),
    storeId: (root.dataset.storeId || '').trim(),
    configError: root.dataset.configError || 'Order tracking is not configured.',
    invalidApiError:
      root.dataset.invalidApiError ||
      'The App Manager API URL must be a public HTTPS address.',
    serviceError:
      root.dataset.serviceError ||
      'Could not reach App Manager at https://appmanager.store. Confirm the API URL in Theme settings, then try again.',
  };
}

/**
 * @returns {Record<string, string>}
 */
function buildRequestHeaders() {
  return { Accept: 'application/json' };
}

/**
 * @param {string} apiBase
 */
function isBlockedApiBase(apiBase) {
  if (!apiBase) return false;
  try {
    const url = new URL(apiBase);
    if (url.protocol !== 'https:') return true;
    return LOCALHOST_PATTERN.test(apiBase);
  } catch {
    return true;
  }
}

/**
 * @param {string | undefined} status
 */
function mapShipmentStatus(status) {
  const normalized = (status || 'pending').toLowerCase();
  if (normalized === 'delivered') return 'delivered';
  if (normalized === 'exception') return 'exception';
  if (normalized === 'pending') return 'processing';
  if (normalized === 'out_for_delivery') return 'out_for_delivery';
  if (normalized === 'label_created') return 'label_created';
  return 'in_transit';
}

/**
 * @param {string} status
 */
function statusLabel(status) {
  const labels = {
    processing: 'Processing',
    in_transit: 'In transit',
    out_for_delivery: 'Out for delivery',
    label_created: 'Label created',
    delivered: 'Delivered',
    exception: 'Delivery exception',
  };
  return labels[status] || 'In transit';
}

/**
 * @param {string | null | undefined} carrier
 */
function carrierCode(carrier) {
  return (carrier || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * @param {string | null | undefined} at
 */
function parseTimelineAt(at) {
  if (!at) {
    return { date: '', time: '' };
  }
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' };
  }
  return {
    date: date.toISOString().slice(0, 10),
    time: date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

/**
 * @param {{ status: string, description: string, at: string, location?: string }} event
 */
function mapTimelineEvent(event) {
  const { date, time } = parseTimelineAt(event.at);
  return {
    id: `evt-${event.at}`,
    date,
    time,
    location: (event.location || '').trim(),
    description: event.description || 'Update',
    eventStatus: mapShipmentStatus(event.status),
    completed: false,
    current: false,
    isStart: false,
  };
}

/**
 * Newest update first; oldest event at the bottom is labelled "Shipment started".
 * @param {AppManagerTrackResponse['timeline']} apiEvents
 * @returns {TrackingEvent[]}
 */
function prepareTimelineEvents(apiEvents) {
  const mapped = (apiEvents || []).map(mapTimelineEvent);
  mapped.sort((a, b) => {
    const ta = `${a.date}T${a.time}`;
    const tb = `${b.date}T${b.time}`;
    return tb.localeCompare(ta);
  });
  return mapped.map((event, index, arr) => ({
    ...event,
    current: index === 0,
    completed: index > 0,
    isStart: index === arr.length - 1,
  }));
}

/**
 * A 200 with no tracking_number is a valid success (order placed, not shipped).
 * @param {AppManagerTrackResponse} apiData
 * @param {string} email
 * @returns {TrackingResponse}
 */
function mapAppManagerResponse(apiData, email) {
  const trackingNumber = (apiData.tracking_number || '').trim();
  const hasTracking = Boolean(trackingNumber);
  // Unshipped when API says shipped === false or there is no tracking number.
  const shipped =
    apiData.shipped === false ? false : apiData.shipped === true || hasTracking;
  const shipmentStatus = mapShipmentStatus(apiData.status);

  const apiStatusLabel = (apiData.status_label || '').trim();
  const apiMessage = (apiData.message || '').trim();

  const resolvedStatusLabel = apiStatusLabel
    || (shipped ? statusLabel(shipmentStatus) : UNSHIPPED_STATUS_FALLBACK);
  const resolvedMessage = apiMessage
    || (shipped ? '' : UNSHIPPED_MESSAGE_FALLBACK);

  const events = prepareTimelineEvents(apiData.timeline || []);

  const lineItems = (apiData.line_items || []).map((item) => ({
    title: item.title || 'Item',
    variant: item.variant || '',
    quantity: Number(item.quantity) || 1,
    imageUrl: item.image_url || '',
    price: item.price || '',
  }));

  return {
    success: true,
    order: {
      number: apiData.order_number || '—',
      email: email.trim().toLowerCase(),
      placedAt: apiData.order_placed_at || undefined,
      total: apiData.order_total || undefined,
      currency: apiData.currency || undefined,
      lineItems,
    },
    shipment: {
      shipped,
      trackingNumber: hasTracking ? trackingNumber : '',
      carrier: hasTracking ? (apiData.carrier || '—') : '',
      carrierCode: carrierCode(apiData.carrier),
      status: shipped ? shipmentStatus : 'processing',
      statusLabel: resolvedStatusLabel,
      message: resolvedMessage,
      lastUpdated: apiData.last_updated_at || undefined,
      events,
    },
  };
}

/**
 * @param {string} orderNumber
 * @param {string} email
 * @param {TrackingConfig} config
 * @returns {Promise<TrackingResponse>}
 */
async function fetchTracking(orderNumber, email, config) {
  const trimmedOrder = orderNumber.trim();
  const trimmedEmail = email.trim();

  if (!trimmedOrder || !trimmedEmail) {
    return {
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Please enter your order number and email address.',
    };
  }

  if (!config.apiBase || !config.storeId) {
    return {
      success: false,
      errorCode: 'CONFIG_MISSING',
      message: config.configError,
    };
  }

  if (isBlockedApiBase(config.apiBase)) {
    return {
      success: false,
      errorCode: 'INVALID_API_URL',
      message: config.invalidApiError,
    };
  }

  const url = new URL(`${config.apiBase}/api/track-order`);
  url.searchParams.set('order_number', trimmedOrder);
  url.searchParams.set('email', trimmedEmail);
  url.searchParams.set('store_id', config.storeId);

  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildRequestHeaders(),
    });
  } catch {
    return {
      success: false,
      errorCode: 'SERVICE_UNAVAILABLE',
      message: config.serviceError,
    };
  }

  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  let payload = {};
  if (contentType.includes('application/json') && rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = {};
    }
  } else if (rawBody.trim().startsWith('<')) {
    return {
      success: false,
      errorCode: 'SERVICE_UNAVAILABLE',
      message: config.serviceError,
    };
  }

  // Only 404 means “order not found.” Other non-2xx responses are service errors.
  // A 200 with tracking_number null / shipped false is a valid success.
  if (!response.ok) {
    if (response.status === 404) {
      const detail =
        typeof payload.detail === 'string'
          ? payload.detail
          : 'We could not find an order matching that number and email. Please check your details and try again.';
      return {
        success: false,
        errorCode: 'ORDER_NOT_FOUND',
        message: detail,
      };
    }

    const detail =
      typeof payload.detail === 'string' ? payload.detail : config.serviceError;
    return {
      success: false,
      errorCode: 'SERVICE_UNAVAILABLE',
      message: detail,
    };
  }

  if (!rawBody || !contentType.includes('application/json')) {
    return {
      success: false,
      errorCode: 'SERVICE_UNAVAILABLE',
      message: config.serviceError,
    };
  }

  return mapAppManagerResponse(/** @type {AppManagerTrackResponse} */ (payload), trimmedEmail);
}

class OrderTrackingPage {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.config = readConfig(root);
    this.form = /** @type {HTMLFormElement} */ (root.querySelector(SELECTORS.form));
    this.orderInput = /** @type {HTMLInputElement} */ (root.querySelector(SELECTORS.orderInput));
    this.emailInput = /** @type {HTMLInputElement} */ (root.querySelector(SELECTORS.emailInput));
    this.submitBtn = /** @type {HTMLButtonElement} */ (root.querySelector(SELECTORS.submitBtn));
    this.errorMessageEl = root.querySelector(SELECTORS.errorMessage);
    this.copyBtn = root.querySelector(SELECTORS.copyTracking);

    this.#bindEvents();
    this.#prefillFromQuery();
  }

  #bindEvents() {
    this.form?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.#handleSubmit();
    });

    this.root.querySelector(SELECTORS.trackAnother)?.addEventListener('click', () => {
      this.#showState('form');
      this.form?.reset();
      this.orderInput?.focus();
    });

    this.copyBtn?.addEventListener('click', () => {
      const number = this.root.querySelector(SELECTORS.trackingNumber)?.textContent?.trim();
      if (!number || number === '—') return;
      navigator.clipboard?.writeText(number).then(() => {
        this.copyBtn?.setAttribute('data-copied', 'true');
        const copyLabel = this.copyBtn?.querySelector('[data-copy-label]');
        const copiedLabel = this.copyBtn?.querySelector('[data-copied-label]');
        copyLabel?.setAttribute('hidden', '');
        copiedLabel?.removeAttribute('hidden');
        window.setTimeout(() => {
          this.copyBtn?.removeAttribute('data-copied');
          copiedLabel?.setAttribute('hidden', '');
          copyLabel?.removeAttribute('hidden');
        }, 2000);
      });
    });
  }

  #prefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const order = params.get('order') || params.get('order_number');
    const email = params.get('email');

    if (order && this.orderInput) this.orderInput.value = order;
    if (email && this.emailInput) this.emailInput.value = email;

    if (order && email) {
      this.#handleSubmit();
    }
  }

  async #handleSubmit() {
    const orderNumber = this.orderInput?.value ?? '';
    const email = this.emailInput?.value ?? '';

    this.#showState('loading');
    this.submitBtn?.setAttribute('aria-busy', 'true');
    this.submitBtn?.setAttribute('disabled', 'true');

    try {
      const data = await fetchTracking(orderNumber, email, this.config);

      if (!data.success) {
        this.#showError(data.message ?? 'Unable to find your order. Please try again.');
        return;
      }

      this.#renderResult(data);
      this.#showState('result');
    } catch {
      this.#showError(this.config.serviceError);
    } finally {
      this.submitBtn?.removeAttribute('aria-busy');
      this.submitBtn?.removeAttribute('disabled');
    }
  }

  /**
   * @param {string} message
   */
  #showError(message) {
    if (this.errorMessageEl) {
      this.errorMessageEl.textContent = message;
    }
    this.#showState('error');
  }

  /**
   * @param {'form' | 'loading' | 'error' | 'result'} state
   */
  #showState(state) {
    const isDesktop = window.matchMedia('(min-width: 990px)').matches;

    this.root.querySelectorAll(SELECTORS.statePanels).forEach((panel) => {
      const panelState = panel.getAttribute('data-tracking-state');

      if (state === 'result') {
        if (panelState === 'result') {
          panel.hidden = false;
          panel.setAttribute('aria-hidden', 'false');
          return;
        }

        if (panelState === 'form') {
          panel.hidden = false;
          panel.setAttribute('aria-hidden', isDesktop ? 'false' : 'true');
          return;
        }

        panel.hidden = true;
        panel.setAttribute('aria-hidden', 'true');
        return;
      }

      const isActive = panelState === state;
      panel.hidden = !isActive;
      panel.setAttribute('aria-hidden', String(!isActive));
    });

    this.root.setAttribute('data-active-state', state);

    if (state === 'result') {
      this.root.querySelector(SELECTORS.result)?.focus({ preventScroll: true });
    }
  }

  /**
   * @param {TrackingResponse} data
   */
  #renderResult(data) {
    const { order, shipment } = data;
    const hasTracking = Boolean((shipment?.trackingNumber || '').trim());
    const shipped = Boolean(shipment?.shipped) || hasTracking;

    this.root.setAttribute('data-shipped', shipped && hasTracking ? 'true' : 'false');

    this.#setText(SELECTORS.orderNumber, order?.number ?? '—');
    this.#setText(SELECTORS.orderDate, formatDate(order?.placedAt));
    this.#setText(SELECTORS.orderTotal, order?.total ?? '—');

    this.#setText(
      SELECTORS.statusLabel,
      shipment?.statusLabel || (hasTracking ? 'In transit' : UNSHIPPED_STATUS_FALLBACK)
    );

    const message =
      shipment?.message ||
      (hasTracking ? '' : UNSHIPPED_MESSAGE_FALLBACK);
    const messageEl = this.root.querySelector(SELECTORS.statusMessage);
    if (messageEl instanceof HTMLElement) {
      messageEl.textContent = message;
      messageEl.hidden = !message;
    }

    const detailsEl = this.root.querySelector(SELECTORS.shipmentDetails);
    if (detailsEl instanceof HTMLElement) {
      detailsEl.hidden = !hasTracking;
    }

    const metaEl = this.root.querySelector(SELECTORS.shipmentMeta);
    if (metaEl instanceof HTMLElement) {
      metaEl.hidden = !hasTracking || !shipment?.estimatedDelivery;
    }

    if (hasTracking) {
      this.#setText(SELECTORS.trackingNumber, shipment?.trackingNumber || '—');
      this.#setText(SELECTORS.carrier, shipment?.carrier || '—');
      this.#setText(
        SELECTORS.estimatedDelivery,
        formatDate(shipment?.estimatedDelivery, { weekday: true })
      );
    } else {
      this.#setText(SELECTORS.trackingNumber, '');
      this.#setText(SELECTORS.carrier, '');
      this.#setText(SELECTORS.estimatedDelivery, '');
    }

    this.root
      .querySelector(SELECTORS.statusBadge)
      ?.setAttribute(
        'data-status',
        hasTracking ? shipment?.status || 'in_transit' : 'processing'
      );

    this.#renderTimeline(shipment?.events ?? []);
    this.#renderLineItems(order?.lineItems ?? []);
  }

  /**
   * @param {string} selector
   * @param {string} value
   */
  #setText(selector, value) {
    const el = this.root.querySelector(selector);
    if (el) el.textContent = value;
  }

  /**
   * @param {TrackingEvent[]} events
   */
  #renderTimeline(events) {
    const container = this.root.querySelector(SELECTORS.timeline);
    if (!(container instanceof HTMLElement)) return;

    container.replaceChildren();

    if (!events.length) {
      const empty = document.createElement('p');
      empty.className = 'order-tracking__timeline-empty';
      empty.textContent = this.root.dataset.timelineEmpty ?? 'No tracking events yet.';
      container.appendChild(empty);
      return;
    }

    const list = document.createElement('ol');
    list.className = 'order-tracking__timeline-list';
    list.setAttribute('role', 'list');

    const startLabel = this.root.dataset.timelineStart || 'Shipment started';
    const latestLabel = this.root.dataset.timelineLatest || 'Latest update';

    events.forEach((event, index) => {
      const item = document.createElement('li');
      item.className = 'order-tracking__timeline-item';
      if (event.current) item.classList.add('is-current');
      if (event.completed) item.classList.add('is-completed');
      if (event.isStart) item.classList.add('is-start');
      if (event.eventStatus) item.setAttribute('data-event-status', event.eventStatus);
      item.style.setProperty('--item-index', String(index));

      const badge = event.current
        ? `<span class="order-tracking__timeline-badge order-tracking__timeline-badge--latest">${escapeHtml(latestLabel)}</span>`
        : event.isStart
          ? `<span class="order-tracking__timeline-badge order-tracking__timeline-badge--start">${escapeHtml(startLabel)}</span>`
          : '';

      const metaParts = [];
      if (event.date) {
        metaParts.push(
          `<time datetime="${escapeHtml(event.date)}">${escapeHtml(formatDate(event.date))}</time>`
        );
      }
      if (event.time) metaParts.push(escapeHtml(event.time));
      if (event.location) metaParts.push(escapeHtml(event.location));

      item.innerHTML = `
        <div class="order-tracking__timeline-marker" aria-hidden="true">
          <span class="order-tracking__timeline-dot"></span>
        </div>
        <div class="order-tracking__timeline-body">
          <div class="order-tracking__timeline-head">
            ${badge}
          </div>
          <p class="order-tracking__timeline-desc">${escapeHtml(event.description)}</p>
          ${
            metaParts.length
              ? `<p class="order-tracking__timeline-meta">${metaParts.join(' · ')}</p>`
              : ''
          }
        </div>
      `;

      list.appendChild(item);
    });

    container.appendChild(list);
  }

  /**
   * @param {OrderLineItem[]} items
   */
  #renderLineItems(items) {
    const container = this.root.querySelector(SELECTORS.lineItems);
    if (!(container instanceof HTMLElement)) return;

    container.replaceChildren();

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'order-tracking__line-item';

      const media = item.imageUrl
        ? `<div class="order-tracking__line-item-media">
            <img src="${escapeHtml(item.imageUrl)}" alt="" width="72" height="72" loading="lazy">
          </div>`
        : '';

      row.innerHTML = `
        ${media}
        <div class="order-tracking__line-item-details">
          <p class="order-tracking__line-item-title">${escapeHtml(item.title)}</p>
          ${item.variant ? `<p class="order-tracking__line-item-variant">${escapeHtml(item.variant)}</p>` : ''}
          <p class="order-tracking__line-item-qty">Qty ${item.quantity}</p>
        </div>
        <p class="order-tracking__line-item-price">${escapeHtml(item.price)}</p>
      `;

      container.appendChild(row);
    });
  }
}

/**
 * @param {string} str
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string | undefined} isoDate
 * @param {Intl.DateTimeFormatOptions} [options]
 */
function formatDate(isoDate, options = {}) {
  if (!isoDate) return '—';
  try {
    const date = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`);
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options,
    }).format(date);
  } catch {
    return isoDate;
  }
}

function init() {
  document.querySelectorAll(SELECTORS.root).forEach((root) => {
    if (root instanceof HTMLElement) {
      new OrderTrackingPage(root);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
