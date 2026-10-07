/**
 * Reference mock payloads for local UI development.
 * Production storefront uses App Manager GET /api/track-order (see order-tracking.js).
 *
 * @typedef {Object} TrackingEvent
 * @property {string} id
 * @property {string} date ISO date (YYYY-MM-DD)
 * @property {string} time 24h time label
 * @property {string} location
 * @property {string} description
 * @property {boolean} completed
 * @property {boolean} [current]
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
 * @property {string} placedAt
 * @property {string} total
 * @property {string} currency
 * @property {OrderLineItem[]} lineItems
 *
 * @typedef {Object} TrackingShipment
 * @property {boolean} [shipped]
 * @property {string} trackingNumber
 * @property {string} carrier
 * @property {string} carrierCode
 * @property {string} status in_transit | delivered | out_for_delivery | label_created | exception | processing
 * @property {string} statusLabel
 * @property {string} [message]
 * @property {string} [estimatedDelivery] ISO date
 * @property {string} [lastUpdated]
 * @property {TrackingEvent[]} events
 *
 * @typedef {Object} TrackingResponse
 * @property {boolean} success
 * @property {string} [errorCode]
 * @property {string} [message]
 * @property {TrackingOrderSummary} [order]
 * @property {TrackingShipment} [shipment]
 */

/** @type {TrackingResponse} */
export const MOCK_TRACKING_SUCCESS = {
  success: true,
  order: {
    number: '#1042',
    email: 'customer@example.com',
    placedAt: '2026-05-18',
    total: '$00.00',
    currency: 'USD',
    lineItems: [
      {
        title: 'Sample product (mock data)',
        variant: 'Sample variant',
        quantity: 1,
        imageUrl:
          'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
        price: '$00.00',
      },
    ],
  },
  shipment: {
    shipped: true,
    trackingNumber: '1Z999AA10123456784',
    carrier: 'UPS',
    carrierCode: 'ups',
    status: 'in_transit',
    statusLabel: 'In transit',
    estimatedDelivery: '2026-05-28',
    lastUpdated: '2026-05-22T14:32:00Z',
    events: [
      {
        id: 'evt-1',
        date: '2026-05-22',
        time: '09:15',
        location: 'Louisville, KY',
        description: 'Arrived at UPS facility',
        completed: true,
        current: true,
      },
      {
        id: 'evt-2',
        date: '2026-05-21',
        time: '18:40',
        location: 'Memphis, TN',
        description: 'Departed regional hub',
        completed: true,
      },
      {
        id: 'evt-3',
        date: '2026-05-20',
        time: '11:02',
        location: 'Dallas, TX',
        description: 'Package in transit',
        completed: true,
      },
      {
        id: 'evt-4',
        date: '2026-05-19',
        time: '16:20',
        location: 'Austin, TX',
        description: 'Picked up by carrier',
        completed: true,
      },
      {
        id: 'evt-5',
        date: '2026-05-18',
        time: '14:05',
        location: 'Austin, TX',
        description: 'Shipping label created',
        completed: true,
      },
    ],
  },
};

/** @type {TrackingResponse} */
export const MOCK_TRACKING_NOT_FOUND = {
  success: false,
  errorCode: 'ORDER_NOT_FOUND',
  message: 'We could not find an order matching that number and email. Please check your details and try again.',
};

/** @type {TrackingResponse} */
export const MOCK_TRACKING_NO_SHIPMENT = {
  success: true,
  order: {
    number: '#1001',
    email: 'customer@example.com',
    placedAt: '2026-08-01',
    total: '$890.00',
    currency: 'USD',
    lineItems: [
      {
        title: 'Eternity Band',
        variant: '14K Rose Gold · Size 7',
        quantity: 1,
        imageUrl:
          'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-3_large.png',
        price: '$890.00',
      },
    ],
  },
  shipment: {
    shipped: false,
    trackingNumber: '',
    carrier: '',
    carrierCode: '',
    status: 'processing',
    statusLabel: 'Not shipped yet',
    message:
      'Your order has been placed and is being prepared. It has not shipped yet.',
    events: [
      {
        id: 'evt-pending',
        date: '2026-08-01',
        time: '12:00',
        location: '',
        description: 'Order placed — not shipped yet',
        completed: false,
        current: true,
        isStart: true,
      },
    ],
  },
};
