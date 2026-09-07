'use strict';

/**
 * Stripe Checkout for the 25% deposit.
 *
 * Live mode: requires STRIPE_SECRET_KEY (sk_test_… / sk_live_…) and, for the
 * webhook, STRIPE_WEBHOOK_SECRET. Amounts are always computed server-side from
 * the pricing engine — the browser never sends a price.
 *
 * Demo mode: with no secret key the module returns a local hosted page so the
 * whole booking flow, deposit maths, confirmation and status transitions can be
 * exercised end to end without a Stripe account. Demo mode collects no card
 * data whatsoever.
 */

const config = require('./config');

const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
let stripe = null;
let live = false;

if (secretKey) {
  try {
    const Stripe = require('stripe');
    stripe = new Stripe(secretKey, { appInfo: { name: 'Moroccan Experience storefront', version: '1.0.0' } });
    live = true;
  } catch (err) {
    console.error('[stripe] Failed to initialise Stripe SDK:', err.message);
  }
} else {
  console.log('[stripe] No STRIPE_SECRET_KEY set — running in DEMO mode (no card data collected).');
}

function mode() {
  return live ? 'live' : 'demo';
}

function moneyToCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

/** Line items presented on Stripe's hosted page. */
function buildLineItems(booking) {
  const q = booking.quote;
  const items = [
    {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: moneyToCents(q.deposit),
        product_data: {
          name: `${q.depositPercent}% deposit — ${q.journeyTitle}`,
          description: `${q.travellers} traveller${q.travellers === 1 ? '' : 's'} · ${q.nights} nights · trip total $${q.total.toLocaleString('en-US')} · balance $${q.balance.toLocaleString('en-US')} due ${config.commercial.balanceDueDaysBefore} days before departure`,
        },
      },
    },
  ];
  if (live && process.env.STRIPE_PRICE_BALANCE_DUE) {
    // Optional recurring/one-off product for the balance, configured by the operator.
    items.push({ quantity: 1, price: process.env.STRIPE_PRICE_BALANCE_DUE });
  }
  return items;
}

async function createCheckoutSession({ booking, origin }) {
  const q = booking.quote;
  if (!live) {
    return { mode: 'demo', url: `/checkout/demo/${booking.reference}`, amount: q.deposit };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: booking.reference,
    customer_email: booking.contact ? booking.contact.email : undefined,
    locale: 'en',
    line_items: buildLineItems(booking),
    payment_intent_data: {
      description: `Deposit for booking ${booking.reference} — ${q.journeyTitle}`,
      receipt_email: booking.contact ? booking.contact.email : undefined,
      metadata: {
        reference: booking.reference,
        journey: q.journeySlug,
        travellers: String(q.travellers),
        nights: String(q.nights),
        trip_total_usd: String(q.total),
        balance_usd: String(q.balance),
      },
    },
    metadata: {
      reference: booking.reference,
      journey: q.journeySlug,
      trip_total_usd: String(q.total),
      deposit_usd: String(q.deposit),
    },
    submit_type: 'pay',
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: false },
    allows_promotion_codes: false,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 60,
    success_url: `${origin}/booking/confirmation/${booking.reference}?paid=1`,
    cancel_url: `${origin}/book/${q.journeySlug}?reference=${booking.reference}&cancelled=1`,
  });

  return { mode: 'live', url: session.url, id: session.id, amount: q.deposit, expiresAt: session.expires_at };
}

async function retrieveSession(sessionId) {
  if (!live) return null;
  return stripe.checkout.sessions.retrieve(sessionId);
}

/** Verify webhook signature (or accept an unsigned payload in development). */
function constructEvent(rawBody, signature) {
  if (!live) throw new Error('Stripe not configured');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    if (config.env === 'production') throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
    console.warn('[stripe] No webhook secret configured — accepting unsigned event (development only).');
    return JSON.parse(rawBody.toString('utf8'));
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

async function refundPayment(paymentIntentId, amount) {
  if (!live || !paymentIntentId) return { refunded: false };
  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId, amount: moneyToCents(amount) });
  return { refunded: true, id: refund.id };
}

module.exports = { mode, live: () => live, createCheckoutSession, retrieveSession, constructEvent, refundPayment, moneyToCents };
