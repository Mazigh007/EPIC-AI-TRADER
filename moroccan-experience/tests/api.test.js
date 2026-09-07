'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.DATA_DIR = require('node:path').join(__dirname, '..', 'data-test-' + process.pid);
process.env.STRIPE_SECRET_KEY = '';

const app = require('../server/index');

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => {
  server && server.close();
  require('node:fs').rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

const get = async (p) => {
  const res = await fetch(base + p);
  return { status: res.status, text: await res.text(), type: res.headers.get('content-type') };
};
const post = async (p, body) => {
  const res = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

const PAGES = [
  '/',
  '/journeys',
  '/journeys?type=luxury',
  '/journeys?type=group&who=women',
  '/journeys?feeling=adventure&when=10',
  '/luxury',
  '/private-tours',
  '/bespoke',
  '/groups',
  '/groups/women',
  '/groups/students',
  '/groups/seniors',
  '/destinations',
  '/destinations/marrakech',
  '/destinations/merzouga',
  '/when-to-go',
  '/about',
  '/contact',
  '/faq',
  '/booking-conditions',
  '/privacy-policy',
  '/legal-terms',
  '/sitemap',
  '/book',
  '/my-booking',
];

test('every page renders 200 HTML with a title, header, footer and no template leakage', async () => {
  for (const p of PAGES) {
    const res = await get(p);
    assert.equal(res.status, 200, `${p} should be 200, got ${res.status}`);
    assert.match(res.type || '', /text\/html/, `${p} should be html`);
    assert.ok(res.text.includes('<title>') && res.text.length > 6000, `${p} looks empty (${res.text.length} bytes)`);
    assert.ok(!/undefined|\[object Object\]|NaN|Infinity/.test(res.text.replace(/<script[\s\S]*?<\/script>/g, '')), `${p} leaks a template value`);
    const hay = res.text.toLowerCase();
    for (const needle of ['id="siteheader"', 'id="sitefooter"', 'id="backtotop"', 'id="chattoggle"', 'id="chatpanel"', 'wa.me', 'tel:+212', 'booking conditions', 'privacy policy', 'legal terms', '/sitemap', '25%', 'stripe']) {
      assert.ok(hay.includes(needle), `${p} is missing ${needle}`);
    }
  }
});

test('journey detail pages render itinerary, price rail and deposit language', async () => {
  const list = await get('/sitemap.xml');
  const slugs = [...list.text.matchAll(/\/journeys\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(slugs.length >= 10, 'sitemap should list the journeys');
  for (const slug of slugs) {
    const page = await get('/journeys/' + slug);
    assert.equal(page.status, 200);
    assert.ok(page.text.includes('data-pricebox'), `${slug} needs the price rail`);
    assert.ok(page.text.includes('Day by day'), `${slug} needs an itinerary`);
    assert.ok(page.text.includes('deposit'), `${slug} needs deposit wording`);
    assert.ok(page.text.includes('"@type":"TouristTrip"'), `${slug} needs structured data`);
  }
});

test('booking pages exist for every journey', async () => {
  const slugs = [...(await get('/sitemap.xml')).text.matchAll(/\/journeys\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]);
  for (const slug of slugs) {
    const res = await get('/book/' + slug);
    assert.equal(res.status, 200, `/book/${slug}`);
    assert.ok(res.text.includes('bookingConfig') && res.text.includes('Pay the'), `/book/${slug} missing payment step`);
  }
});

test('SEO surface: canonical, robots, sitemap, JSON-LD', async () => {
  const home = await get('/');
  assert.ok(home.text.includes('<link rel="canonical" href="http'), 'canonical must be absolute');
  assert.ok(home.text.includes('application/ld+json'), 'home needs JSON-LD');
  assert.ok(home.text.includes('TravelAgency'));
  const robots = await get('/robots.txt');
  assert.equal(robots.status, 200);
  assert.ok(robots.text.includes('Sitemap:'));
  const sm = await get('/sitemap.xml');
  assert.match(sm.type || '', /application\/xml/);
  const urls = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(urls.length >= 30, `sitemap has only ${urls.length} urls`);
  assert.ok(urls.every((u) => /^https?:\/\//.test(u)), 'sitemap urls must be absolute');
  assert.ok(!urls.some((u) => u.includes('/my-booking')), 'private pages must be out of the sitemap');
});

test('404 for unknown routes and clean redirects for aliased legal urls', async () => {
  assert.equal((await get('/definitely-not-a-page')).status, 404);
  const res = await fetch(base + '/terms', { redirect: 'manual' });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), '/legal-terms');
});

test('quote API recomputes server-side and refuses unknown journeys', async () => {
  const ok = await post('/api/quote', { journey: 'starlight-sahara-private-luxury', travellers: 2, nights: 7 });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.perPerson, 6000);
  assert.equal(ok.json.total, 12000);
  assert.equal(ok.json.deposit, 3000);
  const bad = await post('/api/quote', { journey: 'nope' });
  assert.equal(bad.status, 404);
});

test('booking API: validation, deposit maths, and status transitions', async () => {
  const payload = {
    journey: 'starlight-sahara-private-luxury',
    mode: 'pay',
    agreed: true,
    departureDate: new Date(Date.now() + 200 * 864e5).toISOString().slice(0, 10),
    pricing: { travellers: 2, nights: 7, month: 11, extras: ['desert_camp_upgrade'], insurance: true },
    contact: { firstName: 'Test', lastName: 'Traveller', email: 'test@example.com', phone: '+212600000000' },
  };
  const created = await post('/api/bookings', payload);
  assert.equal(created.status, 200);
  assert.match(created.json.reference, /^MX-\d{2}-\d{5}$/);
  assert.ok(created.json.checkout.url, 'must hand back a checkout url (Stripe live or demo)');
  const deposit = created.json.quote.deposit;
  assert.ok(Math.abs(deposit - created.json.quote.total * 0.25) < 0.02, 'deposit is 25% of trip total');

  // Without consent, payment is refused
  const noConsent = await post('/api/bookings', { ...payload, agreed: false });
  assert.equal(noConsent.status, 422);
  assert.match(noConsent.json.error, /Booking Conditions/);

  // Group size guard
  const group = await post('/api/bookings', { ...payload, journey: 'sisters-of-the-medina-and-dunes', pricing: { travellers: 6, nights: 7 } });
  assert.equal(group.status, 422);
  assert.match(group.json.error, /10 and 30/);

  // Email guard
  const noEmail = await post('/api/bookings', { ...payload, contact: { firstName: 'a', lastName: 'b', email: 'nope' } });
  assert.equal(noEmail.status, 422);

  // Past departure guard
  const past = await post('/api/bookings', { ...payload, departureDate: '2020-01-01' });
  assert.equal(past.status, 422);

  // Quote mode must not create a payment
  const quoteOnly = await post('/api/bookings', { ...payload, mode: 'quote' });
  assert.equal(quoteOnly.status, 200);
  assert.equal(quoteOnly.json.mode, 'quote');
});

test('demo checkout completes the deposit and the confirmation page reflects it', async () => {
  const created = await post('/api/bookings', {
    journey: 'slow-morocco-seniors-grand-journey',
    mode: 'pay',
    agreed: true,
    departureDate: new Date(Date.now() + 150 * 864e5).toISOString().slice(0, 10),
    pricing: { travellers: 16, nights: 9 },
    contact: { firstName: 'Group', lastName: 'Lead', email: 'lead@example.com', phone: '+447700900000' },
  });
  assert.equal(created.status, 200);
  const ref = created.json.reference;
  const before = await get('/api/bookings/' + ref);
  assert.equal(JSON.parse(before.text).status, 'pending_payment');

  const pay = await fetch(base + '/checkout/demo/' + ref, { method: 'POST', redirect: 'manual' });
  assert.equal(pay.status, 302);
  assert.match(pay.headers.get('location'), /confirmation/);

  const after = JSON.parse((await get('/api/bookings/' + ref)).text);
  assert.equal(after.status, 'deposit_paid');
  const conf = await get('/booking/confirmation/' + ref);
  assert.equal(conf.status, 200);
  assert.ok(conf.text.includes('Deposit received') && conf.text.includes(ref), 'confirmation should show the reference and the paid state');
  const track = await get('/my-booking?ref=' + ref);
  assert.ok(track.text.includes('deposit paid'), 'tracking page should show the status');
});

test('chat agent answers from real data and can prefill the booking form', async () => {
  const price = await post('/api/chat', { message: 'what does a 7 night luxury tour cost for two' });
  assert.equal(price.status, 200);
  assert.match(price.json.text, /\$6,000/);
  assert.ok(price.json.action && price.json.action.journey, 'a pricing answer should offer to open the booking form');

  const cancel = await post('/api/chat', { message: 'if I cancel do I lose the deposit' });
  assert.match(cancel.json.text, /25%/);
  assert.match(cancel.json.text, /before departure/);

  const groups = await post('/api/chat', { message: 'can we take 25 students in april' });
  assert.match(groups.json.text, /\$2,000|\$4,000|leader/);

  const contact = await post('/api/chat', { message: 'i want to talk to a human on whatsapp' });
  assert.match(contact.json.text, /wa\.me|WhatsApp/);
  assert.ok(contact.json.text.includes('212'));

  const gibberish = await post('/api/chat', { message: 'zzz qqq' });
  assert.equal(gibberish.status, 200);
  assert.ok(gibberish.json.text.length > 30, 'should degrade gracefully');
});

test('newsletter validates, stores, and is idempotent', async () => {
  assert.equal((await post('/api/newsletter', { email: 'bad' })).status, 422);
  assert.equal((await post('/api/newsletter', { email: 'guest@example.com' })).status, 200);
  assert.equal((await post('/api/newsletter', { email: 'guest@example.com' })).status, 200);
});

test('security headers and no index on transactional pages', async () => {
  const res = await fetch(base + '/');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'self'/, 'framing must stay restricted to same-origin plus the preview host');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'self'/, 'framing must be restricted but must not break an embedded preview');
  assert.ok(!res.headers.get('x-powered-by'));
  const book = await get('/book');
  assert.ok(book.text.includes('noindex, follow'), 'booking form should not be indexed');
});

test('admin listing is protected', async () => {
  const res = await fetch(base + '/api/admin/bookings');
  assert.equal(res.status, 401);
});

test('static assets are served with sane caching', async () => {
  const css = await fetch(base + '/assets/css/main.css');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  const js = await fetch(base + '/assets/js/booking.js');
  assert.equal(js.status, 200);
  const img = await fetch(base + '/assets/img/hero-home.jpg');
  assert.equal(img.status, 200);
  assert.match(img.headers.get('content-type'), /image\/jpeg/);
});

test('every image referenced by a rendered page exists on disk', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const pages = [...PAGES, '/journeys/starlight-sahara-private-luxury', '/groups', '/journeys/sisters-of-the-medina-and-dunes'];
  const missing = new Set();
  for (const p of pages) {
    const html = (await get(p)).text;
    for (const m of html.matchAll(/(?:src|href)="(\/assets\/img\/[^"]+\.(?:jpg|png|svg|webp))"/g)) {
      if (!fs.existsSync(path.join(__dirname, '..', 'public', m[1]))) missing.add(p + ' → ' + m[1]);
    }
    for (const m of html.matchAll(/url\('(\/assets\/img\/[^']+)'\)/g)) {
      if (!fs.existsSync(path.join(__dirname, '..', 'public', m[1]))) missing.add(p + ' → ' + m[1]);
    }
  }
  assert.deepEqual([...missing], [], 'no broken images allowed');
});
