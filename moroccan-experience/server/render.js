'use strict';

/**
 * Server-side rendering: escaping, the page chrome (header, footer, floating
 * contact dock, AI assistant, back-to-top), and small view helpers shared by
 * every page module.
 */

const fs = require('fs');
const path = require('path');

const config = require('./config');
const pricing = require('./pricing');
const { journeys } = require('./content/journeys');

const PUB = path.join(__dirname, '..', 'public');

/**
 * Rendered pages need absolute canonical/OG URLs. Views are synchronous, so a
 * request-scoped origin set by middleware is safe and keeps every view module
 * free of req plumbing.
 */
let requestOrigin = '';
function setOrigin(origin) {
  requestOrigin = origin ? String(origin).replace(/\/$/, '') : '';
}

/** Absolute URL for structured data, OG tags and the sitemap. */
function abs(p) {
  if (!p) return requestOrigin || '';
  if (/^https?:/.test(p)) return p;
  return (requestOrigin || '') + p;
}
const IMG_CACHE = new Map();

/**
 * Missing-photo aliases: keeps the site looking considered while the media
 * library is still being finished. Drop the real file at the same path and the
 * alias stops applying — nothing else needs to change.
 */
const IMG_ALIASES = {
  '/assets/img/group-students.jpg': '/assets/img/fes-tannery.jpg',
  '/assets/img/seniors-garden.jpg': '/assets/img/riad-courtyard.jpg',
  '/assets/img/bespoke-planning.jpg': '/assets/img/chefchaouen-blue.jpg',
  '/assets/img/luxury-pool.jpg': '/assets/img/desert-camp-luxury.jpg',
  '/assets/img/moroccan-feast.jpg': '/assets/img/marrakech-medina.jpg',
};

/**
 * Resolve an image path, falling back to the hero if a file is missing, so a
 * partially-populated media folder can never produce a broken <img>.
 */
function img(p) {
  const fallback = '/assets/img/hero-home.jpg';
  if (!p || typeof p !== 'string') return fallback;
  if (!p.startsWith('/assets/')) return p;
  if (IMG_CACHE.has(p)) return IMG_CACHE.get(p);
  let resolved = fallback;
  try {
    const fsok = fs.existsSync(path.join(PUB, p));
    if (fsok) resolved = p;
    else if (IMG_ALIASES[p] && fs.existsSync(path.join(PUB, IMG_ALIASES[p]))) resolved = IMG_ALIASES[p];
  } catch (e) {
    resolved = p;
  }
  IMG_CACHE.set(p, resolved);
  return resolved;
}

/* Resolve media paths once at load so every view — including preload and
   og:image tags — points at a file that actually exists. */
try {
  const { destinations } = require('./content/destinations');
  const { journeys: js } = require('./content/journeys');
  for (const j of js) {
    if (j.heroImage) j.heroImage = img(j.heroImage);
    if (Array.isArray(j.gallery)) j.gallery = j.gallery.map(img);
  }
  for (const d of destinations) if (d.image) d.image = img(d.image);
} catch (e) {
  console.warn('[render] image resolution skipped:', e.message);
}


const esc = (s) =>
  String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const attr = esc;

function safeMarkdown(src) {
  let out = esc(src);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    const external = /^https?:/.test(href);
    return `<a href="${attr(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|\n)• ?/g, '$1<span class="bullet">•</span> ');
  return out.replace(/\n/g, '<br>');
}

const money = config.money;

const titleCase = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());

function journeyBySlug(slug) {
  return journeys.find((j) => j.slug === slug) || null;
}

function priceLabel(journey) {
  if (journey.type === 'group') {
    const band = pricing.groupBand(journey, journey.nights);
    return `${money(band.min)}–${money(band.max)} per person / ${journey.nights} nights`;
  }
  return `From ${money(pricing.priceFromPerPerson(journey))} per person / ${journey.nights} nights`;
}

/* ------------------------------------------------------------- components */

const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3h3l1.5 4-2 1.2a12.5 12.5 0 0 0 5.8 5.8L16 12l4 1.5v3a2.5 2.5 0 0 1-2.7 2.5C10.2 18.2 5.8 13.8 4 6.7A2.5 2.5 0 0 1 6.5 3Z"/></svg>',
  whatsapp:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.2 13.7c-.2.6-1.2 1.2-1.8 1.3-.5.1-1.1.1-1.8-.1a13 13 0 0 1-5.4-3.9c-1-1.2-1.5-2.5-1.6-3 0-.6.2-1.3.6-1.7.3-.4.6-.5.8-.5h.6c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.1.2-.2.3 0 .6.3.5.8 1.1 1.4 1.6.6.5 1.2.8 1.5.9.2.1.4 0 .5-.1l.6-.7c.2-.2.3-.2.6-.1l1.6.8c.3.1.4.2.4.4v.3Z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4v-4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5M6 11l6-6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 5.7 6.4.7-4.7 4.2 1.3 6.4L12 17l-5.6 3 1.3-6.4L3 9.4l6.4-.7Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 13 5 5L20 7"/></svg>',
};

function navItems(active) {
  const items = [
    { href: '/journeys', label: 'Journeys', key: 'journeys' },
    { href: '/luxury', label: 'Luxury', key: 'luxury' },
    { href: '/private-tours', label: 'Private', key: 'private' },
    { href: '/bespoke', label: 'Bespoke', key: 'bespoke' },
    { href: '/groups', label: 'Group tours', key: 'groups' },
    { href: '/destinations', label: 'Destinations', key: 'destinations' },
    { href: '/about', label: 'Why us', key: 'about' },
    { href: '/contact', label: 'Contact', key: 'contact' },
  ];
  return items
    .map(
      (i) =>
        `<a href="${i.href}" class="nav__link${active === i.key ? ' is-active' : ''}"${active === i.key ? ' aria-current="page"' : ''}>${i.label}</a>`
    )
    .join('');
}

function header(active) {
  return `
<header class="site-header" id="siteHeader">
  <div class="shell site-header__inner">
    <a class="brand" href="/" aria-label="${attr(config.brand.name)} — home">
      <span class="brand__mark" aria-hidden="true">${config.brand.logoMark}</span>
      <span class="brand__word"><em>Moroccan</em> Experience</span>
    </a>
    <nav class="nav" id="primaryNav" aria-label="Primary">${navItems(active)}</nav>
    <div class="site-header__actions">
      <a class="hlink" href="${config.contact.phoneHref}">${ICON.phone}<span>${config.contact.phoneDisplay}</span></a>
      <a class="btn btn--sm btn--solid" href="/book">Plan my trip</a>
      <button class="burger" id="navToggle" aria-expanded="false" aria-controls="mobileNav" aria-label="Open menu"><span></span><span></span><span></span></button>
    </div>
  </div>
  <div class="mobile-nav" id="mobileNav" hidden>
    <nav aria-label="Mobile">${navItems(active)}
      <a class="btn btn--solid" href="/book">Plan my trip</a>
      <div class="mobile-nav__contact">
        <a href="${config.contact.phoneHref}">${ICON.phone} ${config.contact.phoneDisplay}</a>
        <a href="${chatWaHref()}">${ICON.whatsapp} WhatsApp</a>
      </div>
    </nav>
  </div>
</header>`;
}

function chatWaHref(prefill) {
  const text = encodeURIComponent(
    prefill || 'Hello Moroccan Experience — I would like help planning a journey in Morocco.'
  );
  return `https://wa.me/${config.contact.whatsappNumber}?text=${text}`;
}

function legalLinks() {
  return `
  <ul class="foot__list">
    <li><a href="/booking-conditions">Booking Conditions</a></li>
    <li><a href="/privacy-policy">Privacy Policy</a></li>
    <li><a href="/legal-terms">Legal Terms</a></li>
    <li><a href="/sitemap">Sitemap</a></li>
    <li><a href="/faq">FAQ</a></li>
    <li><button class="linkbtn" data-open-cookie>Cookie preferences</button></li>
  </ul>`;
}

function footer() {
  const c = config.contact;
  return `
<footer class="site-footer" id="siteFooter">
  <div class="site-footer__wave" aria-hidden="true"></div>
  <div class="shell site-footer__grid">
    <div class="site-footer__brand">
      <a class="brand brand--light" href="/"><span class="brand__mark">${config.brand.logoMark}</span><span class="brand__word"><em>Moroccan</em> Experience</span></a>
      <p>${esc(config.brand.shortPitch)}</p>
      <p class="fine">${config.brand.licence} · ${config.brand.vat}</p>
      <div class="socials">${config.brand && ''}
        ${config.contact.social.map((s) => `<a href="${attr(s.href)}" target="_blank" rel="noopener me">${s.label}</a>`).join('')}
      </div>
    </div>
    <nav class="foot" aria-label="Journeys">
      <h4>Journeys</h4>
      <ul>
        <li><a href="/luxury">Luxury tours</a></li>
        <li><a href="/private-tours">Private tours</a></li>
        <li><a href="/bespoke">Bespoke tours</a></li>
        <li><a href="/groups">Group tours 10–30</a></li>
        <li><a href="/groups/women">Women only</a></li>
        <li><a href="/groups/students">Student groups</a></li>
        <li><a href="/groups/seniors">Senior journeys</a></li>
        <li><a href="/journeys">All journeys</a></li>
      </ul>
    </nav>
    <nav class="foot" aria-label="Destinations">
      <h4>Where</h4>
      <ul>
        <li><a href="/destinations/marrakech">Marrakech</a></li>
        <li><a href="/destinations/fes">Fes</a></li>
        <li><a href="/destinations/merzouga">The Sahara</a></li>
        <li><a href="/destinations/high-atlas">High Atlas</a></li>
        <li><a href="/destinations/essaouira">Essaouira</a></li>
        <li><a href="/destinations/dades-valley">Dadès &amp; Todra</a></li>
        <li><a href="/destinations/chefchaouen">Chefchaouen</a></li>
        <li><a href="/when-to-go">When to go</a></li>
      </ul>
    </nav>
    <div class="foot">
      <h4>Talk to us</h4>
      <ul class="foot__contact">
        <li><a href="${c.phoneHref}">${ICON.phone}${c.phoneDisplay}</a></li>
        <li><a href="${chatWaHref()}" target="_blank" rel="noopener">${ICON.whatsapp}${c.whatsappDisplay}</a></li>
        <li><a href="mailto:${c.email}">${c.email}</a></li>
        <li class="fine">${c.offices[0].lines.join(', ')}</li>
        <li class="fine">${c.offices[1].city}: ${c.offices[1].lines.join(', ')}</li>
      </ul>
      <form class="newsletter" data-newsletter>
        <label for="nl-email">Travel notes, six times a year</label>
        <div class="newsletter__row">
          <input id="nl-email" type="email" name="email" placeholder="you@email.com" required autocomplete="email">
          <button class="btn btn--sm btn--sand" type="submit">Subscribe</button>
        </div>
        <p class="fine" data-nl-note>We only use this for our own notes. Unsubscribe in one click. See <a href="/privacy-policy">privacy policy</a>.</p>
      </form>
    </div>
    <div class="foot">
      <h4>Booking</h4>
      ${legalLinks()}
      <p class="fine">Deposit ${config.commercial.depositPercent}% at booking, balance ${config.commercial.balanceDueDaysBefore} days before departure. Payments secured by Stripe.</p>
    </div>
  </div>
  <div class="shell site-footer__bar">
    <p>© ${new Date().getFullYear()} ${config.brand.legalName}. All rights reserved.</p>
    <p class="fine">Independent operator. Not affiliated with, endorsed by or connected to any other travel brand.</p>
  </div>
</footer>`;
}

function floatingDock() {
  const c = config.contact;
  return `
<div class="dock" id="dock">
  <button class="dock__btn dock__btn--top" id="backToTop" type="button" aria-label="Back to top" title="Back to top">
    <svg class="dock__ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/><circle class="dock__ring-fill" cx="22" cy="22" r="20"/></svg>
    ${ICON.up}
  </button>
  <a class="dock__btn dock__btn--wa" href="${chatWaHref()}" target="_blank" rel="noopener" aria-label="WhatsApp us on ${attr(c.whatsappDisplay)}" title="WhatsApp ${attr(c.whatsappDisplay)}">
    ${ICON.whatsapp}<span class="dock__tip">WhatsApp ${esc(c.whatsappDisplay)}</span>
  </a>
  <a class="dock__btn dock__btn--phone" href="${c.phoneHref}" aria-label="Call ${attr(c.phoneDisplay)}" title="Call ${attr(c.phoneDisplay)}">
    ${ICON.phone}<span class="dock__tip">Call ${esc(c.phoneDisplay)}</span>
  </a>
  <button class="dock__btn dock__btn--chat" id="chatToggle" type="button" aria-expanded="false" aria-controls="chatPanel" aria-label="Chat with our AI travel assistant">
    ${ICON.chat}<span class="dock__badge" id="chatBadge" aria-hidden="true">1</span><span class="dock__tip">Ask the AI assistant</span>
  </button>
</div>

<section class="chat" id="chatPanel" hidden aria-labelledby="chatTitle" role="dialog" aria-modal="false">
  <header class="chat__head">
    <div>
      <p class="chat__kicker">AI travel assistant</p>
      <h2 id="chatTitle">Ask anything about Morocco</h2>
    </div>
    <button class="chat__close" id="chatClose" type="button" aria-label="Close chat">${ICON.close}</button>
  </header>
  <div class="chat__quick">
    <a href="${c.phoneHref}">${ICON.phone} ${esc(c.phoneDisplay)}</a>
    <a href="${chatWaHref()}" target="_blank" rel="noopener">${ICON.whatsapp} WhatsApp a designer</a>
  </div>
  <div class="chat__log" id="chatLog" role="log" aria-live="polite"></div>
  <div class="chat__chips" id="chatChips"></div>
  <form class="chat__form" id="chatForm">
    <label class="sr-only" for="chatInput">Message the AI assistant</label>
    <input id="chatInput" name="message" autocomplete="off" placeholder="e.g. 20 travellers, 9 nights in October — what does it cost?" maxlength="600">
    <button class="btn btn--sm btn--solid" type="submit" aria-label="Send">${ICON.arrow}</button>
  </form>
  <footer class="chat__foot">
    <label class="chat__opt"><input type="checkbox" id="chatNoTrain"> Don’t use my messages for training</label>
    <span>AI — verify prices with a designer. <a href="/legal-terms#ai-assistant">How it works</a></span>
  </footer>
</section>

<div class="cookie" id="cookieBar" hidden>
  <p>We use one necessary cookie to keep your booking form alive, and — only with your consent — privacy-respecting analytics. <a href="/privacy-policy#cookies">Privacy policy</a>.</p>
  <div>
    <button class="btn btn--sm btn--ghost" data-cookie="necessary" type="button">Necessary only</button>
    <button class="btn btn--sm btn--solid" data-cookie="all" type="button">Accept all</button>
  </div>
</div>`;
}

/**
 * @param {{title:string, description:string, path:string, body:string,
 *   active?:string, jsonld?:object, ogImage?:string, bodyClass?:string,
 *   canonical?:string, robots?:string}} opts
 */
function layout(opts) {
  const absUrl = requestOrigin ? requestOrigin + (opts.path || '/') : config.absolute(opts.path || '/');
  const ogImage = (requestOrigin || '') + img(opts.ogImage || config.seo.ogImage);
  const jsonld = opts.jsonld
    ? `<script type="application/ld+json">${JSON.stringify(Array.isArray(opts.jsonld) ? opts.jsonld : [opts.jsonld]).replace(/</g, '\\u003c')}</script>`
    : '';
  const preloads = opts.preloadImage
    ? `<link rel="preload" as="image" href="${attr(img(opts.preloadImage))}" fetchpriority="high">`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${attr(opts.description)}">
<link rel="canonical" href="${attr(opts.canonical || absUrl)}">
${opts.robots ? `<meta name="robots" content="${attr(opts.robots)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(config.brand.name)}">
<meta property="og:title" content="${attr(opts.title)}">
<meta property="og:description" content="${attr(opts.description)}">
<meta property="og:url" content="${attr(absUrl)}">
<meta property="og:image" content="${attr(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(opts.title)}">
<meta name="twitter:description" content="${attr(opts.description)}">
<meta name="twitter:image" content="${attr(ogImage)}">
<meta name="theme-color" content="#14100d">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/favicon.svg">
${preloads}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Manrope:wght@300..800&display=swap">
<link rel="stylesheet" href="/assets/css/main.css?v=3">
${jsonld}
</head>
<body class="${attr(opts.bodyClass || '')}">
<a class="skiplink" href="#main">Skip to content</a>
${header(opts.active)}
<main id="main">${opts.body}</main>
${footer()}
${floatingDock()}
<script src="/assets/js/site.js" defer></script>
<script src="/assets/js/assistant.js" defer></script>
${opts.scripts ? opts.scripts.join('\n') : ''}
</body>
</html>`;
}

/* --------------------------------------------------------------- fragments */

function eyebrow(text, tone) {
  return `<p class="eyebrow${tone ? ' eyebrow--' + tone : ''}">${esc(text)}</p>`;
}

function journeyCard(j, opts = {}) {
  const href = `/journeys/${j.slug}`;
  const cover = img(j.heroImage);
  const badge = j.type === 'group' ? `Group · ${j.groupSizes ? j.groupSizes[0] + '–' + j.groupSizes[1] : '10–30'}` : titleCase(j.type);
  return `
  <article class="jcard${opts.featured ? ' jcard--wide' : ''}" data-reveal>
    <a class="jcard__media" href="${href}" tabindex="-1" aria-hidden="true">
      <img src="${attr(cover)}" alt="" loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async" width="1200" height="900">
      <span class="jcard__badge">${esc(badge)}</span>
      ${j.audience ? `<span class="jcard__aud">${esc(titleCase(j.audience))}</span>` : ''}
    </a>
    <div class="jcard__body">
      <p class="jcard__meta">${j.nights} nights · ${j.destinations.length} regions · ★ ${j.rating}<span class="muted"> (${j.reviewCount})</span></p>
      <h3 class="jcard__title"><a href="${href}">${esc(j.title)}</a></h3>
      <p class="jcard__lead">${esc(j.lead)}</p>
      <p class="jcard__price">${esc(priceLabel(j))}</p>
      <div class="jcard__actions">
        <a class="btn btn--sm btn--line" href="${href}">Explore journey ${ICON.arrow}</a>
        <a class="btn btn--sm btn--ghost" href="/book/${j.slug}">Quote &amp; ${config.commercial.depositPercent}% deposit</a>
      </div>
    </div>
  </article>`;
}

function ctaBand({ kicker, title, copy, primary, secondary, image }) {
  return `
<section class="ctaband" style="--cta-img:url('${attr(img(image || '/assets/img/kasbah-sunset.jpg'))}')">
  <div class="shell ctaband__inner">
    ${eyebrow(kicker, 'light')}
    <h2>${esc(title)}</h2>
    <p>${esc(copy)}</p>
    <div class="ctaband__actions">
      <a class="btn btn--solid" href="${attr(primary.href)}">${esc(primary.label)}</a>
      ${secondary ? `<a class="btn btn--line btn--line-light" href="${attr(secondary.href)}">${esc(secondary.label)}</a>` : ''}
    </div>
  </div>
</section>`;
}

function breadcrumb(trail) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${trail
    .map((c, i) =>
      i === trail.length - 1
        ? `<li aria-current="page">${esc(c.label)}</li>`
        : `<li><a href="${attr(c.href)}">${esc(c.label)}</a></li>`
    )
    .join('')}</ol></nav>`;
}

function pageHero({ kicker, title, lead, image, crumbs, align, meta, imageAlt }) {
  const src = img(image);
  return `
<section class="phero${align === 'left' ? '' : ' phero--center'}" style="--hero-img:url('${attr(src)}')">
  <img class="phero__img" src="${attr(src)}" alt="${attr(imageAlt || '')}" fetchpriority="high" decoding="async">
  <div class="phero__scrim" aria-hidden="true"></div>
  <div class="shell phero__inner">
    ${crumbs ? breadcrumb(crumbs) : ''}
    ${eyebrow(kicker, 'light')}
    <h1>${title}</h1>
    ${lead ? `<p class="phero__lead">${esc(lead)}</p>` : ''}
    ${meta ? `<ul class="phero__meta">${meta.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
  </div>
</section>`;
}

module.exports = {
  esc,
  attr,
  abs,
  setOrigin,
  img,
  safeMarkdown,
  money,
  titleCase,
  layout,
  eyebrow,
  journeyCard,
  ctaBand,
  breadcrumb,
  pageHero,
  journeyBySlug,
  priceLabel,
  chatWaHref,
  ICON,
  config,
};
