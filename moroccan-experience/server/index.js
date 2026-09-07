'use strict';

/**
 * Moroccan Experience — storefront, booking engine and Stripe deposit API.
 *
 *   GET  /*              server-rendered pages (no build step, no client framework)
 *   POST /api/quote       live indicative quote for the form
 *   POST /api/bookings    create a booking (draft or quote)
 *   POST /api/checkout    create a Stripe Checkout session for the 25% deposit
 *   POST /api/stripe/webhook  raw-body webhook: deposit paid → booking confirmed
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const config = require('./config');
const pricing = require('./pricing');
const stripeSrv = require('./stripe');
const store = require('./store');
const chat = require('./chat');

const { journeys } = require('./content/journeys');
const { destinations } = require('./content/destinations');
const { bookingConditions, privacyPolicy, legalTerms } = require('./content/legal');
const { faqs } = require('./content/pages');

const R = require('./render');
const homeView = require('./views/home');
const journeysView = require('./views/journeys');
const pagesView = require('./views/pages');
const bookingView = require('./views/booking');

const qs = (req) => new URLSearchParams(req.originalUrl.split('?')[1] || '');

const app = express();
const PUBLIC = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

/* ------------------------------------------------------------------ security */
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self'",
  "connect-src 'self' https:",
  // 'none' would break the sandboxed live preview, which embeds the site in an
  // iframe; allow same-origin plus the preview host while still refusing others.
  `frame-ancestors 'self' ${process.env.ALLOW_FRAME_ANCESTORS || 'https://*.e2b.app'}`.trim(),
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

app.use((req, res, next) => {
  R.setOrigin(config.absolute('', req) || `${req.protocol}://${req.get('host')}`);
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // DENY would also break the sandboxed preview; CSP frame-ancestors above is
  // the authoritative, finer-grained control.
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

/* ---------------------------------------------------------------------- api */

/** Rate limiting without a store: enough to stop casual abuse. */
const buckets = new Map();
let limiterSeq = 0;
function rateLimit({ windowMs = 60000, max = 40, key = (req) => req.ip } = {}) {
  const id = 'rl' + ++limiterSeq;
  return (req, res, next) => {
    const k = id + ':' + key(req);
    const now = Date.now();
    const b = buckets.get(k) || { start: now, n: 0 };
    if (now - b.start > windowMs) {
      b.start = now;
      b.n = 0;
    }
    b.n += 1;
    buckets.set(k, b);
    if (b.n > max) return res.status(429).json({ error: 'Too many requests — try again in a minute.' });
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now - b.start > 600000) buckets.delete(k);
}, 120000).unref();

app.get('/api/config', (req, res) => {
  res.json({
    brand: config.brand,
    contact: { ...config.contact, whatsappUrl: chat.WA },
    commercial: { ...config.commercial },
    stripe: stripeSrv.mode(),
    currencies: ['USD'],
  });
});

app.post('/api/quote', rateLimit({ max: 120 }), (req, res) => {
  const journey = journeys.find((j) => j.slug === (req.body.journey || req.body.slug));
  if (!journey) return res.status(404).json({ error: 'Unknown journey' });
  const q = pricing.quote(journey, req.body);
  res.json(q);
});

/** Create a booking record. Status is quote (no payment) or pending_payment (go to Stripe). */
app.post('/api/bookings', rateLimit({ max: 20 }), async (req, res) => {
  try {
    const b = req.body || {};
    const journey = journeys.find((j) => j.slug === b.journey);
    if (!journey) return res.status(422).json({ error: 'Choose a journey we actually sell.' });
    if (!b.contact || !b.contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.contact.email)) {
      return res.status(422).json({ error: 'A valid email is required so we can send the quotation.' });
    }
    if (!b.contact || !b.contact.firstName || !b.contact.lastName) {
      return res.status(422).json({ error: 'We need a name for the enquiry.' });
    }
    if (journey.type === 'group') {
      const n = Number(b.pricing && b.pricing.travellers);
      if (!n || n < config.commercial.groupMinTravellers || n > config.commercial.groupMaxTravellers) {
        return res.status(422).json({ error: `Group journeys need between ${config.commercial.groupMinTravellers} and ${config.commercial.groupMaxTravellers} travellers.` });
      }
    }
    if (b.mode === 'pay' && b.agreed !== true) {
      return res.status(422).json({ error: 'Please accept the Booking Conditions and Privacy Policy to pay a deposit.' });
    }

    const q = pricing.quote(journey, b.pricing || {});
    const refs = await store.refsInUse();
    const reference = pricing.reference(refs);
    const rawDeparture = b.departureDate || null;
    let departureDate = null;
    if (rawDeparture) {
      const d = new Date(rawDeparture + 'T12:00:00Z');
      if (Number.isNaN(d.getTime())) return res.status(422).json({ error: 'That departure date does not look valid.' });
      const daysOut = Math.round((d.getTime() - Date.now()) / 864e5);
      if (daysOut < 3) return res.status(422).json({ error: 'Trips depart at least 3 days out so we can confirm guides — call us and we will try for earlier.' });
      departureDate = d.toISOString().slice(0, 10);
    }
    const dueBefore = departureDate
      ? new Date(new Date(departureDate).getTime() - config.commercial.balanceDueDaysBefore * 864e5)
      : null;
    const balanceDueImmediately = !!dueBefore && dueBefore.getTime() < Date.now() + 24 * 3600e3;
    const balanceDueDate = dueBefore ? dueBefore.toISOString().slice(0, 10) : null;

    const record = {
      reference,
      status: b.mode === 'pay' ? 'pending_payment' : 'quote',
      createdAt: new Date().toISOString(),
      departureDate,
      balanceDueDate,
      balanceDueImmediately,
      quote: q,
      contact: {
        firstName: String(b.contact.firstName).slice(0, 60),
        lastName: String(b.contact.lastName).slice(0, 60),
        email: String(b.contact.email).slice(0, 120),
        phone: String(b.contact.phone || '').slice(0, 40),
        country: String(b.contact.country || '').slice(0, 60),
        airport: String(b.contact.airport || '').slice(0, 40),
      },
      party: Array.isArray(b.party) ? b.party.slice(0, 40).map((p) => ({ name: String(p.name || '').slice(0, 80), note: String(p.note || '').slice(0, 120) })) : [],
      access: String(b.access || '').slice(0, 1200),
      notes: String(b.notes || '').slice(0, 1200),
      routeNotes: String(b.routeNotes || '').slice(0, 1200),
      groupStyle: String(b.groupStyle || '').slice(0, 20),
      newsletter: !!b.newsletter,
      consent: { terms: b.agreed === true, privacy: b.agreed === true, insurance: b.insuranceAcknowledged !== false },
      source: { url: String(b.sourceUrl || '').slice(0, 200), referrer: String(b.referrer || '').slice(0, 200), ua: String(req.headers['user-agent'] || '').slice(0, 200) },
    };
    await store.createBooking(record);
    if (b.newsletter) await store.addNewsletter(record.contact.email, { source: 'booking' });

    if (b.mode !== 'pay') {
      return res.json({ ok: true, reference, quote: q, mode: 'quote' });
    }

    const origin = config.absolute('', req) || `${req.protocol}://${req.get('host')}`;
    const session = await stripeSrv.createCheckoutSession({ booking: record, origin: origin || `http://localhost:${config.port}` });
    await store.updateBooking(reference, { stripeSessionId: session.id || null, checkoutUrl: session.url, stripeMode: session.mode });

    return res.json({ ok: true, reference, quote: q, checkout: session });
  } catch (err) {
    console.error('[api/bookings]', err);
    return res.status(500).json({ error: 'Something went wrong on our side. Call ' + config.contact.phoneDisplay + ' and we will do this by hand.' });
  }
});

app.get('/api/bookings/:ref', async (req, res) => {
  const b = await store.findBooking(req.params.ref);
  if (!b) return res.status(404).json({ error: 'not found' });
  res.json({
    reference: b.reference,
    status: b.status,
    createdAt: b.createdAt,
    departureDate: b.departureDate,
    balanceDueDate: b.balanceDueDate,
    quote: { journeyTitle: b.quote.journeyTitle, total: b.quote.total, deposit: b.quote.deposit, balance: b.quote.balance, nights: b.quote.nights, travellers: b.quote.travellers },
    checkoutUrl: b.checkoutUrl,
  });
});

/** Operator listing — guarded by ADMIN_TOKEN. */
app.get('/api/admin/bookings', async (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.get('x-admin-token') !== token) return res.status(401).json({ error: 'Unauthorized' });
  res.json(await store.listBookings({ limit: 100 }));
});

/* ----------------------------------------------------------------- the chat */

app.post('/api/chat', rateLimit({ max: 60 }), async (req, res) => {
  try {
    const message = String(req.body.message || '').slice(0, 600);
    if (!message.trim()) return res.status(422).json({ error: 'empty' });
    const out = await chat.respond({ message, history: (req.body.history || []).slice(-10), slots: req.body.slots || {} });
    res.json(out);
  } catch (err) {
    console.error('[api/chat]', err);
    res.status(500).json({ error: 'The assistant is unavailable — call ' + config.contact.phoneDisplay + '.' });
  }
});

app.post('/api/newsletter', rateLimit({ max: 12 }), async (req, res) => {
  const email = String(req.body.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(422).json({ error: 'That email address does not look right.' });
  await store.addNewsletter(email, { source: 'footer' });
  res.json({ ok: true, message: 'Subscribed. Six notes a year, nothing else, one-click unsubscribe.' });
});

/* ----------------------------------------------------- stripe webhook (raw) */
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (stripeSrv.mode() !== 'live') return res.status(400).json({ error: 'Stripe not configured' });
    let event;
    try {
      event = stripeSrv.constructEvent(req.body, req.get('stripe-signature'));
    } catch (err) {
      console.error('[webhook] signature error', err.message);
      return res.status(400).send(`Webhook error: ${err.message}`);
    }
    try {
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const s = event.data.object;
        const ref = s.client_reference_id || (s.metadata && s.metadata.reference);
        if (ref) {
          await store.updateBooking(ref, {
            status: 'deposit_paid',
            stripeSessionId: s.id,
            stripePaymentIntent: s.payment_intent || null,
            amountTotal: s.amount_total,
            invoiceUrl: s.invoice,
            paidAt: new Date().toISOString(),
          });
          console.log(`[webhook] deposit received for ${ref}`);
        }
      }
      if (event.type === 'checkout.session.expired') {
        const s = event.data.object;
        const ref = s.client_reference_id;
        if (ref) await store.updateBooking(ref, { status: 'quote_expired' });
      }
      res.json({ received: true });
    } catch (err) {
      console.error('[webhook] handler error', err);
      res.status(500).json({ error: 'handler failure' });
    }
  }
);

/* -------------------------------------------------------- demo hosted pay */
/**
 * The demo pay page exists only so the whole booking flow can be exercised
 * without a Stripe account. In live mode it is disabled completely — there is
 * no route by which a deposit can be marked paid without Stripe confirming it.
 */
const demoGuard = (req, res, next) => {
  if (stripeSrv.mode() === 'live') return send(res, pagesView.notFound(), 404);
  next();
};

app.get('/checkout/demo/:ref', demoGuard, async (req, res) => {
  const b = await store.findBooking(req.params.ref);
  if (!b) return res.redirect('/book');
  if (b.status === 'deposit_paid') return res.redirect('/booking/confirmation/' + b.reference + '?paid=1');
  res.status(200).type('html').send(bookingView.demoCheckoutPage(b));
});

app.post('/checkout/demo/:ref', demoGuard, async (req, res) => {
  const b = await store.findBooking(req.params.ref);
  if (!b) return res.redirect('/book');
  await store.updateBooking(b.reference, { status: 'deposit_paid', paidAt: new Date().toISOString(), stripeMode: 'demo' });
  res.redirect('/booking/confirmation/' + b.reference + '?paid=1');
});

/* -------------------------------------------------------------- robots etc */
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /my-booking', 'Disallow: /booking/', 'Disallow: /checkout/', `Sitemap: ${config.absolute('/sitemap.xml', req)}`].join('\n')
  );
});

function allUrls(req) {
  const rows = [];
  rows.push({ loc: '/', title: 'Home — luxury, private and bespoke Morocco tours', group: 'book', changed: 'weekly' });
  rows.push({ loc: '/book', title: 'Booking & quotation form', group: 'book', changed: 'yearly', desc: `${config.commercial.depositPercent}% deposit via Stripe` });
  for (const t of [
    ['luxury', 'Luxury tours'],
    ['private-tours', 'Private tours'],
    ['bespoke', 'Bespoke tours'],
    ['groups', 'Group tours 10–30'],
    ['groups/women', 'Women-only group departures'],
    ['groups/students', 'Student & university groups'],
    ['groups/seniors', 'Senior group journeys'],
  ]) {
    rows.push({ loc: '/' + t[0], title: t[1], group: 'type' });
  }
  for (const j of journeys) rows.push({ loc: '/journeys/' + j.slug, title: j.title, group: 'journey', changed: 'monthly', desc: `${j.nights} nights · ${j.type}` });
  for (const d of destinations) rows.push({ loc: '/destinations/' + d.slug, title: d.name + ' travel guide', group: 'destination', changed: 'monthly' });
  rows.push({ loc: '/journeys', title: 'All journeys', group: 'journey' });
  rows.push({ loc: '/destinations', title: 'All destinations', group: 'destination' });
  rows.push({ loc: '/when-to-go', title: 'When to go, month by month', group: 'info' });
  rows.push({ loc: '/about', title: 'Why travel with us', group: 'info' });
  rows.push({ loc: '/contact', title: 'Contact: phone, WhatsApp, email', group: 'info' });
  rows.push({ loc: '/faq', title: 'Frequently asked questions', group: 'info' });
  rows.push({ loc: '/my-booking', title: 'Track a booking', group: 'info', noindex: true });
  rows.push({ loc: '/booking-conditions', title: 'Booking conditions', group: 'legal' });
  rows.push({ loc: '/privacy-policy', title: 'Privacy policy', group: 'legal' });
  rows.push({ loc: '/legal-terms', title: 'Legal terms', group: 'legal' });
  rows.push({ loc: '/sitemap', title: 'Sitemap', group: 'legal' });
  return rows.map((r) => ({ ...r, absolute: config.absolute(r.loc, req) }));
}

app.get('/sitemap.xml', (req, res) => {
  const rows = allUrls(req).filter((r) => !r.noindex);
  const now = new Date().toISOString().slice(0, 10);
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rows
      .map(
        (r) =>
          `  <url><loc>${R.esc(r.absolute)}</loc><lastmod>${now}</lastmod><changefreq>${r.changed || 'monthly'}</changefreq><priority>${
            r.loc === '/' ? '1.0' : /^\/journeys\/.+/.test(r.loc) ? '0.9' : '0.7'
          }</priority></url>`
      )
      .join('\n') +
    `\n</urlset>\n`;
  res.type('application/xml').send(xml);
});

/* --------------------------------------------------------------- html routes */
const send = (res, html, status = 200) => res.status(status).type('html').send(html);

app.get('/', (req, res) => send(res, homeView.home()));
app.get('/journeys', (req, res) => send(res, journeysView.journeysIndex(qs(req))));
app.get('/journeys/:slug', (req, res) => {
  const j = journeys.find((x) => x.slug === req.params.slug);
  if (!j) return send(res, pagesView.notFound(), 404);
  send(res, journeysView.journeyDetail(j, qs(req)));
});

app.get('/luxury', (req, res) => send(res, journeysView.luxuryPage()));
app.get('/private-tours', (req, res) => send(res, journeysView.privatePage()));
app.get('/private', (req, res) => res.redirect(301, '/private-tours'));
app.get('/group-tours', (req, res) => res.redirect(301, '/groups'));
app.get('/terms-of-use', (req, res) => res.redirect(301, '/legal-terms'));
app.get('/cookie-policy', (req, res) => res.redirect(301, '/privacy-policy#cookies'));
app.get('/bespoke', (req, res) => send(res, journeysView.bespokePage()));
app.get('/groups', (req, res) => send(res, journeysView.groupsPage()));
app.get('/groups/:audience(women|students|seniors)', (req, res) => send(res, journeysView.groupsPage(req.params.audience)));

app.get('/destinations', (req, res) => send(res, pagesView.destinationsIndex()));
app.get('/destinations/:slug', (req, res) => {
  const d = destinations.find((x) => x.slug === req.params.slug);
  if (!d) return send(res, pagesView.notFound(), 404);
  send(res, pagesView.destinationDetail(d));
});

app.get('/when-to-go', (req, res) => send(res, pagesView.whenToGo()));
app.get('/about', (req, res) => send(res, pagesView.aboutPage()));
app.get('/why-us', (req, res) => res.redirect(301, '/about'));
app.get('/contact', (req, res) => send(res, pagesView.contactPage()));
app.get('/faq', (req, res) => send(res, pagesView.faqPage()));
app.get('/booking-conditions', (req, res) => send(res, pagesView.legalDoc(bookingConditions)));
app.get('/privacy-policy', (req, res) => send(res, pagesView.legalDoc(privacyPolicy)));
app.get('/legal-terms', (req, res) => send(res, pagesView.legalDoc(legalTerms)));
app.get('/terms', (req, res) => res.redirect(301, '/legal-terms'));
app.get('/terms-and-conditions', (req, res) => res.redirect(301, '/booking-conditions'));

app.get('/book', (req, res) => send(res, bookingView.bookingPage(journeys[0], qs(req))));
app.get('/book/:slug', (req, res) => {
  const j = journeys.find((x) => x.slug === req.params.slug);
  if (!j) return send(res, pagesView.notFound(), 404);
  send(res, bookingView.bookingPage(j, qs(req)));
});

app.get('/booking/confirmation/:ref', async (req, res) => {
  const b = await store.findBooking(req.params.ref);
  if (!b) return send(res, pagesView.notFound(), 404);
  send(res, bookingView.confirmationPage(b, { paid: req.query.paid === '1' || b.status === 'deposit_paid' }));
});

app.get('/my-booking', async (req, res) => {
  const ref = req.query.ref;
  const b = ref ? await store.findBooking(ref) : null;
  send(res, bookingView.myBookingPage(b, ref));
});

app.get('/sitemap', (req, res) => send(res, bookingView.sitemapPage(allUrls(req))));

/* ------------------------------------------------------------- static + 404 */
app.use(
  express.static(PUBLIC, {
    maxAge: '7d',
    setHeaders: (res, p) => {
      if (/\.(css|js)$/.test(p)) res.setHeader('Cache-Control', 'public, max-age=3600');
      if (/\.svg$/.test(p)) res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  })
);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.status(404).type('html').send(pagesView.notFound());
});

app.use((err, req, res, next) => {
  console.error('[server error]', err);
  if (res.headersSent) return next(err);
  res.status(500).type('html').send(pagesView.notFound());
});

if (require.main === module) {
  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    console.log(`\n  ${config.brand.name} — http://localhost:${port}`);
    console.log(`  Stripe: ${stripeSrv.mode()} mode · deposit ${config.commercial.depositPercent}% · balance ${config.commercial.balanceDueDaysBefore} days out`);
    console.log(`  Chat assistant: ${process.env.OPENAI_API_KEY || process.env.LLM_API_KEY ? 'LLM + knowledge base' : 'knowledge-base mode (no API key set)'}\n`);
  });
}

module.exports = app;
