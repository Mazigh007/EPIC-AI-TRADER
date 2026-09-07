'use strict';

/**
 * Content & wiring audit. Run with `npm run audit:content`.
 *
 * Answers the questions that bite after a hand-off: does every journey have
 * real copy, do all referenced images exist, do internal links resolve to a
 * route, does the CSS actually style the classes the views emit, and do the
 * advertised price bands hold for every configuration a traveller can pick?
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const config = require(path.join(ROOT, 'server/config'));
const pricing = require(path.join(ROOT, 'server/pricing'));
const { journeys, groupAudiences } = require(path.join(ROOT, 'server/content/journeys'));
const { destinations } = require(path.join(ROOT, 'server/content/destinations'));
const legal = require(path.join(ROOT, 'server/content/legal'));
const pages = require(path.join(ROOT, 'server/content/pages'));
const render = require(path.join(ROOT, 'server/render'));

let errors = 0;
let warnings = 0;
const fail = (m) => {
  errors++;
  console.log('  ✗ ' + m);
};
const warn = (m) => {
  warnings++;
  console.log('  · ' + m);
};
const head = (m) => console.log('\n\u001b[1m' + m + '\u001b[0m');

/* --------------------------------------------------------------- journeys */
head('Journeys (' + journeys.length + ')');
const slugs = new Set();
const routes = new Set([
  '/', '/journeys', '/luxury', '/private-tours', '/bespoke', '/groups', '/groups/women', '/groups/students', '/groups/seniors',
  '/destinations', '/when-to-go', '/about', '/contact', '/faq', '/book', '/my-booking', '/booking-conditions', '/privacy-policy',
  '/legal-terms', '/sitemap', '/sitemap.xml', '/robots.txt',
]);
journeys.forEach((j) => {
  routes.add('/journeys/' + j.slug);
  routes.add('/book/' + j.slug);
  if (slugs.has(j.slug)) fail(`duplicate slug ${j.slug}`);
  slugs.add(j.slug);
  for (const f of ['title', 'lead', 'summary', 'pace', 'carbonNote']) if (!j[f] || j[f].length < 12) fail(`${j.slug}: weak or missing "${f}"`);
  for (const f of ['highlights', 'itinerary', 'included', 'notIncluded', 'sampleStays', 'gallery']) if (!Array.isArray(j[f]) || !j[f].length) fail(`${j.slug}: ${f} is empty`);
  if (j.itinerary && j.itinerary.length < j.nights) warn(`${j.slug}: ${j.itinerary.length} itinerary days for ${j.nights} nights`);
  (j.itinerary || []).forEach((d, i) => {
    if (d.day !== i + 1) fail(`${j.slug}: itinerary day ${d.day} out of sequence at index ${i}`);
    if (!d.title || d.text.length < 40) fail(`${j.slug} day ${d.day}: thin copy`);
  });
  if (!['luxury', 'private', 'bespoke', 'group'].includes(j.type)) fail(`${j.slug}: bad type ${j.type}`);
  if (j.type === 'group' && !j.audience) fail(`${j.slug}: group journeys must name their audience`);
  if (j.type === 'group' && !['women', 'students', 'seniors'].includes(j.audience)) fail(`${j.slug}: unsupported group audience ${j.audience}`);
  if (j.audience && !groupAudiences[j.audience]) fail(`${j.slug}: no audience blurb for ${j.audience}`);
  // links inside copy must resolve
  const blob = JSON.stringify(j);
  for (const m of blob.matchAll(/\/assets\/img\/[a-z0-9-]+\.(?:jpg|png|svg|webp)/gi)) {
    if (!fs.existsSync(path.join(ROOT, 'public', m[0]))) warn(`${j.slug}: image ${m[0]} missing (an alias is used instead)`);
  }
  // every journey must be quotable across the range a client can select
  const minPax = j.type === 'group' ? config.commercial.groupMinTravellers : 1;
  const maxPax = j.type === 'group' ? config.commercial.groupMaxTravellers : j.maxTravellers || 12;
  for (let pax = minPax; pax <= maxPax; pax++) {
    for (const nights of [j.minNights || 3, j.nights, j.maxNights || j.nights]) {
      const q = pricing.quote(j, { travellers: pax, nights, month: 10, roomMode: 'shared', extras: Object.keys(pricing.EXTRAS), insurance: true });
      if (!Number.isFinite(q.total) || q.total <= 0) fail(`${j.slug}: non-finite total at ${pax}pax/${nights}n`);
      if (Math.abs(q.deposit + q.balance - q.total) > 0.02) fail(`${j.slug}: deposit + balance != total at ${pax}pax/${nights}n`);
      // Bands describe the journey rate; optional extras and insurance sit on top.
      if (j.type === 'luxury' && (q.perPerson * 7) / nights < config.commercial.priceBands.luxury.from - 60) {
        fail(`${j.slug}: luxury per-person ${q.perPerson} undercuts the $${config.commercial.priceBands.luxury.from} floor`);
      }
      if (j.type === 'group') {
        const band = pricing.groupBand(j, nights);
        if (q.perPerson < band.min || q.perPerson > band.max) fail(`${j.slug}: group rate ${q.perPerson} outside ${band.min}-${band.max} at ${nights}n`);
      }
    }
  }
});

/* ---------------------------------------------------------- destinations */
head('Destinations (' + destinations.length + ')');
const destSlugs = new Set();
destinations.forEach((d) => {
  routes.add('/destinations/' + d.slug);
  if (destSlugs.has(d.slug)) fail(`duplicate destination ${d.slug}`);
  destSlugs.add(d.slug);
  if (!d.intro || d.intro.length < 120) fail(`${d.slug}: thin intro`);
  if ((d.facts || []).length < 3) fail(`${d.slug}: needs at least 3 facts`);
  if (!fs.existsSync(path.join(ROOT, 'public', render.img(d.image).slice(1)))) fail(`${d.slug}: image missing`);
  (d.journeys || []).forEach((slug) => {
    if (!slugs.has(slug)) fail(`${d.slug}: links to unknown journey ${slug}`);
  });
});
journeys.forEach((j) => j.destinations.forEach((d) => { if (!destSlugs.has(d)) warn(`${j.slug}: destination "${d}" has no page`); }));

/* --------------------------------------------------------------- legal */
head('Legal documents');
for (const doc of [legal.bookingConditions, legal.privacyPolicy, legal.legalTerms]) {
  routes.add('/' + doc.slug);
  if (!doc.sections || doc.sections.length < 6) fail(`${doc.slug}: too few sections`);
  const ids = new Set();
  doc.sections.forEach((s) => {
    if (ids.has(s.id)) fail(`${doc.slug}: duplicate anchor ${s.id}`);
    ids.add(s.id);
    if (!s.paragraphs?.length && !s.list?.length && !s.table) fail(`${doc.slug}#${s.id}: empty section`);
  });
  const words = JSON.stringify(doc).split(/\s+/).length;
  if (words < 700) fail(`${doc.slug}: only ${words} words — too thin for a policy`);
  console.log(`  ✓ ${doc.slug}: ${doc.sections.length} sections, ~${words} words`);
  if (!doc.sections.some((s) => /deposit/i.test(s.heading)) && doc.slug === 'booking-conditions') fail('booking conditions must have a deposit section');
}
// deposit + balance + group band language must be consistent with config
const bc = JSON.stringify(legal.bookingConditions);
for (const needle of [`${config.commercial.depositPercent}%`, `${config.commercial.balanceDueDaysBefore} days`, `${config.commercial.groupMinTravellers}`, `${config.commercial.groupMaxTravellers}`, '$6,000', '$2,000', '$4,000']) {
  if (!bc.includes(needle)) fail(`booking conditions never mentions "${needle}" although the site advertises it`);
}
if (!JSON.stringify(legal.privacyPolicy).includes('Stripe')) fail('privacy policy must name the payment processor');
if (!JSON.stringify(legal.privacyPolicy).includes('WhatsApp')) fail('privacy policy must cover the WhatsApp channel');
if (!JSON.stringify(legal.privacyPolicy).includes('Cookie')) fail('privacy policy must cover cookies');
if (!JSON.stringify(legal.legalTerms).includes('AI travel assistant')) fail('legal terms must describe the AI assistant');

/* ----------------------------------------------------------- page html */
head('Rendered HTML: links, images, class coverage');
const css = fs.readFileSync(path.join(ROOT, 'public/assets/css/main.css'), 'utf8');
const styledClasses = new Set((css.match(/\.[a-zA-Z][\w-]*/g) || []).map((c) => c.slice(1)));
const usedClasses = new Set();
const internalLinks = new Map();

function scan(name, html) {
  for (const m of html.matchAll(/href="(\/[^"#?]*)(?:[^"]*)?"/g)) {
    const href = m[1];
    if (href.startsWith('/assets/') || href.startsWith('/api/') || href === '/favicon.svg' || href.startsWith('/data/')) continue;
    if (!routes.has(href) && !/^\/(booking|checkout)\//.test(href)) {
      if (!internalLinks.has(href)) internalLinks.set(href, name);
    }
  }
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/img\/[^"]+)"/g)) {
    if (!fs.existsSync(path.join(ROOT, 'public', m[1]))) fail(`${name}: broken asset ${m[1]}`);
  }
  for (const m of html.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => c && usedClasses.add(c));
  if (/undefined|\[object Object\]|NaN/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) fail(`${name}: template leakage`);
}

const views = {
  home: require(path.join(ROOT, 'server/views/home')),
  journeys: require(path.join(ROOT, 'server/views/journeys')),
  pages: require(path.join(ROOT, 'server/views/pages')),
  booking: require(path.join(ROOT, 'server/views/booking')),
};
const noopReq = { headers: { host: 'localhost' }, protocol: 'http' };
scan('home', views.home.home());
scan('journeys', views.journeys.journeysIndex(new URLSearchParams('')));
for (const j of journeys) scan(j.slug, views.journeys.journeyDetail(j, new URLSearchParams('')));
for (const d of destinations) scan(d.slug, views.pages.destinationDetail(d));
scan('luxury', views.journeys.luxuryPage());
scan('private', views.journeys.privatePage());
scan('bespoke', views.journeys.bespokePage());
scan('groups', views.journeys.groupsPage());
for (const a of ['women', 'students', 'seniors']) scan('groups/' + a, views.journeys.groupsPage(a));
scan('about', views.pages.aboutPage());
scan('contact', views.pages.contactPage());
scan('faq', views.pages.faqPage());
scan('when', views.pages.whenToGo());
scan('destinations', views.pages.destinationsIndex());
scan('book', views.booking.bookingPage(journeys[0], new URLSearchParams('')));
for (const doc of [legal.bookingConditions, legal.privacyPolicy, legal.legalTerms]) scan(doc.slug, views.pages.legalDoc(doc));
scan('sitemap', views.booking.sitemapPage([{ loc: '/journeys', title: 'x', group: 'journey' }]));

for (const [href, where] of internalLinks) fail(`${where}: link to ${href} has no route`);

const unstyled = [...usedClasses].filter((c) => !styledClasses.has(c) && !/^is-|^has-|^has\b/.test(c));
if (unstyled.length) warn(`${unstyled.length} classes emitted with no CSS rule: ${unstyled.slice(0, 14).join(', ')}${unstyled.length > 14 ? '…' : ''}`);

/* ---------------------------------------------------------- chat surface */
head('Assistant coverage');
const chat = require(path.join(ROOT, 'server/chat'));
const probes = [
  ['hello', /Marhba|assistant/],
  ['what does a luxury week cost', /\$6,000/],
  ['group of 20 students', /leader|\$2,000|\$4,000|travellers/],
  ['women only departure', /women|Women/],
  ['my mother is 71', /senior|Seniors|Slow Morocco/],
  ['if i cancel do i lose the deposit', /25%/],
  ['do you take card', /Stripe|card/],
  ['whatsapp number', /wa\.me|WhatsApp/],
];
(async () => {
  for (const [q, re] of probes) {
    const r = await chat.respond({ message: q });
    if (!r.text || r.text.length < 40) fail(`assistant: empty answer for "${q}"`);
    else if (!re.test(r.text)) fail(`assistant: "${q}" did not produce an answer matching ${re}`);
    else console.log(`  ✓ "${q}" → ${r.text.split('\n')[0].slice(0, 66)}…`);
  }

  /* ------------------------------------------------------- misc integrity */
  head('Integrity');
  if (pages.faqs.length < 12) fail('need at least a dozen FAQs');
  if (pages.testimonials.length < 6) warn('fewer than six testimonials');
  pages.faqs.forEach((f) => {
    if (f.a.length < 60) fail(`FAQ answer too thin: ${f.q}`);
    if (!/\?/.test(f.q)) fail(`FAQ question missing "?": ${f.q}`);
  });
  const allText = JSON.stringify({ journeys, destinations, legal, pages });
  const thirdParty = /black\s*tomato/i.exec(allText);
  if (thirdParty) fail('a competitor brand name appears in site content');
  const homeHtml = views.home.home();
  if (!homeHtml.includes(config.contact.phoneDisplay) || !homeHtml.includes('tel:+212')) fail('the published phone number is not reachable from the home page');
  if (!homeHtml.includes('wa.me/' + config.contact.whatsappNumber)) fail('no WhatsApp link in the rendered chrome');
  if (!homeHtml.includes('id="backToTop"')) fail('back-to-top control missing');
  for (const k of Object.keys(pricing.EXTRAS)) if (!k) fail('blank extra key');
  journeys.forEach((j) => (j.extras || []).forEach((k) => { if (!pricing.EXTRAS[k]) fail(`${j.slug}: unknown extra "${k}"`); }));

  head(errors ? `\u001b[31m${errors} error(s), ${warnings} warning(s)\u001b[0m` : `\u001b[32mClean — ${journeys.length} journeys, ${destinations.length} destinations, ${warnings} warning(s)\u001b[0m`);
  process.exit(errors ? 1 : 0);
})();
