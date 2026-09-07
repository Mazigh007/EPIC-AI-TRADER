'use strict';

const R = require('../render');
const config = require('../config');
const pricing = require('../pricing');
const { journeys } = require('../content/journeys');
const { destinations, months, monthAdvice } = require('../content/destinations');
const { testimonials, stats, press, awards, feelingsCopy, howWeWork, values } = require('../content/pages');

const esc = R.esc;
const money = R.money;

function finderForm() {
  return `
<form class="finder" data-finder action="/journeys" method="get">
  <div class="finder__field">
    <label for="feeling">I want to feel</label>
    <select id="feeling" name="feeling">
      <option value="">Anything</option>
      ${config.feelings.map((f) => `<option value="${f.key}">${esc(f.label)}</option>`).join('')}
    </select>
  </div>
  <div class="finder__field">
    <label for="when">Travelling in</label>
    <select id="when" name="when">
      <option value="">Any month</option>
      ${months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}
    </select>
  </div>
  <div class="finder__field">
    <label for="who">Travelling as</label>
    <select id="who" name="who">
      <option value="">Anyone</option>
      <option value="luxury">A luxury tour</option>
      <option value="private">A private tour</option>
      <option value="bespoke">Something bespoke</option>
      <option value="women">Women-only group</option>
      <option value="students">A student group</option>
      <option value="seniors">A senior group</option>
    </select>
  </div>
  <button class="btn btn--solid" type="submit">Find my journey ${R.ICON.arrow}</button>
</form>`;
}

function hero() {
  const featured = journeys[0];
  return `
<section class="hero" style="--hero-img:url('/assets/img/hero-home.jpg')">
  <img class="hero__img" src="/assets/img/hero-home.jpg" alt="Camel caravan crossing a Saharan dune ridge at golden hour in southern Morocco" fetchpriority="high" decoding="async">
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="shell hero__inner">
    <p class="eyebrow eyebrow--light">${config.brand.founded} · Morocco only · ${journeys.length} journeys we build ourselves</p>
    <h1 class="hero__title"><span>Private, luxury and bespoke journeys</span><em>Morocco, designed around you.</em></h1>
    <p class="hero__lead">Tailor-made private tours, seven-night luxury escapes, bespoke itineraries built from a blank page, and group departures reserved for women, students and travellers over sixty. Est. ${config.brand.founded}.</p>
    <div class="hero__actions">
      <a class="btn btn--solid btn--lg" href="/journeys">Explore our journeys</a>
      <a class="btn btn--line btn--line-light btn--lg" href="/book">Plan my trip</a>
    </div>
    <div class="hero__foot">
      <div class="hero__pricing">
        <p class="fine fine--light">Indicative, per person, two sharing, flights excluded</p>
        <ul>
          <li><strong>${money(config.commercial.priceBands.luxury.from)}</strong> luxury / 7 days</li>
          <li><strong>${money(config.commercial.priceBands.private.from)}</strong> private / 7 days</li>
          <li><strong>${money(config.commercial.priceBands.group.from)}–${money(config.commercial.priceBands.group.to)}</strong> groups 10–30</li>
        </ul>
      </div>
      <a class="hero__featured" href="/journeys/${featured.slug}">
        <img src="${esc(featured.heroImage)}" alt="" loading="lazy" width="200" height="200">
        <span><em>Most booked</em><strong>${esc(featured.title)}</strong></span>
        ${R.ICON.arrow}
      </a>
    </div>
  </div>
  <a class="hero__scroll" href="#feeling" aria-label="Scroll to content"><span>Scroll</span><i></i></a>
</section>`;
}

function feelingSection() {
  return `
<section class="band band--sand" id="feeling">
  <div class="shell">
    <div class="split">
      <div class="split__text" data-reveal>
        <p class="eyebrow">It starts with a feeling, not a destination</p>
        <h2>We plan Morocco around how you want to come home</h2>
        <p class="lede">Morocco is a country of seven climates, two languages of the street and about nine thousand alleys in one medina. The question that decides your trip is not which city — it is whether you want to come home quieter or louder.</p>
        <p>We design from that answer outward: the rooms, the guide, the hour you wake, the table you eat at. Then we price it line by line, and ${config.commercial.depositPercent}% secures it.</p>
        <p class="stat-row">
          ${stats.map((s) => `<span class="stat"><strong>${esc(s.value)}</strong><em>${esc(s.label)}</em></span>`).join('')}
        </p>
      </div>
      <div class="split__aside" data-reveal>
        ${finderForm()}
        <ul class="feelings">
          ${config.feelings
            .map(
              (f) => `<li><a href="/journeys?feeling=${f.key}"><strong>${esc(f.label)}</strong><span>${esc(feelingsCopy[f.key])}</span></a></li>`
            )
            .join('')}
        </ul>
      </div>
    </div>
  </div>
</section>`;
}

function typesSection() {
  return `
<section class="band" id="ways-to-travel">
  <div class="shell">
    <header class="band__head">
      <div><p class="eyebrow">Four ways to travel with us</p><h2>Choose the format, we will argue about the detail</h2></div>
      <p class="band__head-note">Every one of these is private in the sense that matters: your own vehicle, your own guide, your own table. Groups differ only in how many of you there are.</p>
    </header>
    <div class="types">
      ${config.journeyTypes
        .map(
          (t) => `
      <article class="type" data-reveal>
        <span class="type__kicker">${esc(t.kicker)}</span>
        <h3><a href="${t.key === 'group' ? '/groups' : '/' + (t.key === 'luxury' ? 'luxury' : t.key === 'private' ? 'private-tours' : 'bespoke')}">${esc(t.name)}</a></h3>
        <p>${esc(t.blurb)}</p>
        <p class="type__price">${esc(t.from)}</p>
        <a class="textlink" href="${t.key === 'group' ? '/groups' : '/' + (t.key === 'luxury' ? 'luxury' : t.key === 'private' ? 'private-tours' : 'bespoke')}">See these journeys ${R.ICON.arrow}</a>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

function journeysSection() {
  const list = journeys.slice(0, 8);
  return `
<section class="band band--tight" id="journeys">
  <div class="shell">
    <header class="band__head band__head--row">
      <div><p class="eyebrow">Journeys to begin with</p><h2>Twelve itineraries, each one ours and each one editable</h2></div>
      <a class="btn btn--line" href="/journeys">All ${journeys.length} journeys ${R.ICON.arrow}</a>
    </header>
    <div class="jgrid">${list.map((j, i) => R.journeyCard(j, { eager: i < 2 })).join('')}</div>
  </div>
</section>`;
}

function groupsSection() {
  const groups = journeys.filter((j) => j.type === 'group');
  return `
<section class="band band--dark" id="groups">
  <div class="shell">
    <header class="band__head">
      <div><p class="eyebrow eyebrow--light">Group departures · 10 to 30 travellers</p><h2>Three groups we build for one kind of traveller each</h2></div>
      <p class="band__head-note band__head-note--light">Women-only, student and university cohorts, and travellers aged sixty and over. Same ${money(
        config.commercial.priceBands.group.from
      )}–${money(config.commercial.priceBands.group.to)} band, priced per person for seven days, falling as the party grows.</p>
    </header>
    <div class="gcards">
      ${groups
        .map(
          (j) => `
      <article class="gcard" data-reveal>
        <img src="${esc(j.heroImage)}" alt="${esc(j.title)}" loading="lazy" decoding="async" width="900" height="700">
        <div class="gcard__body">
          <span class="gcard__tag">${esc(R.titleCase(j.audience))}</span>
          <h3>${esc(j.title)}</h3>
          <p>${esc(j.lead)}</p>
          <dl class="gcard__facts">
            <div><dt>Nights</dt><dd>${j.nights}</dd></div>
            <div><dt>Group</dt><dd>${(j.groupSizes || [10, 30]).join('–')}</dd></div>
            <div><dt>From</dt><dd>${money(pricing.priceFromPerPerson(j))}pp</dd></div>
          </dl>
          <div class="gcard__actions">
            <a class="btn btn--sm btn--sand" href="/journeys/${j.slug}">Explore</a>
            <a class="btn btn--sm btn--line btn--line-light" href="/book/${j.slug}">Quote this</a>
          </div>
        </div>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

function bespokeStrip() {
  return `
<section class="strip" style="--strip-img:url('${R.img('/assets/img/bespoke-planning.jpg')}')">
  <div class="shell strip__inner">
    <div>
      <p class="eyebrow eyebrow--light">Bespoke</p>
      <h2>You have the odd idea. We have the kiln, the village and the keys.</h2>
      <p>A residency with a master ceramicist, a wedding for forty in a kasbah, a recording trip with Gnawa players, a family reunion with a household staffed around a grandmother who cannot do stairs. If it can be done in Morocco, a designer can build it and price it line by line.</p>
      <div class="strip__actions">
        <a class="btn btn--solid" href="/bespoke">How bespoke works</a>
        <a class="btn btn--line btn--line-light" href="/book/the-craft-residency">Start a bespoke brief</a>
      </div>
    </div>
    <ul class="strip__list">
      <li>Design fee <strong>$0</strong>, always</li>
      <li>Quotation in <strong>1 working day</strong></li>
      <li>Held <strong>7 days</strong>, free</li>
      <li><strong>${config.commercial.depositPercent}%</strong> to confirm</li>
    </ul>
  </div>
</section>`;
}

function whenSection() {
  return `
<section class="band band--sand" id="when">
  <div class="shell">
    <header class="band__head">
      <div><p class="eyebrow">Where to go when</p><h2>Twelve months, and what each one is actually good for</h2></div>
      <a class="btn btn--line" href="/when-to-go">Full month-by-month guide ${R.ICON.arrow}</a>
    </header>
    <div class="months">
      ${monthAdvice
        .map(
          (m) => `<a class="month" href="/journeys?when=${m.m}"><strong>${esc(m.label)}</strong><span>${esc(months[m.m - 1])}</span><p>${esc(m.note)}</p></a>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

function destinationsSection() {
  return `
<section class="band" id="destinations">
  <div class="shell">
    <header class="band__head band__head--row">
      <div><p class="eyebrow">Regions</p><h2>Seven Moroccos, not one</h2></div>
      <a class="btn btn--line" href="/destinations">All destinations ${R.ICON.arrow}</a>
    </header>
    <div class="dstiles">
      ${destinations
        .slice(0, 7)
        .map(
          (d, i) => `<a class="dstile${i === 0 ? ' dstile--big' : ''}" href="/destinations/${d.slug}">
        <img src="${esc(d.image)}" alt="${esc(d.name)}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async">
        <span class="dstile__label"><strong>${esc(d.name)}</strong><em>${esc(d.bestTime)}</em></span>
      </a>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

function testimonialSection() {
  return `
<section class="band band--tight voices" id="voices">
  <div class="shell">
    <p class="eyebrow">What travellers say afterwards</p>
    <div class="voices__track" data-carousel>
      ${testimonials
        .map(
          (v, i) => `
      <figure class="voice${i === 0 ? ' is-active' : ''}">
        ${R.ICON.star}
        <blockquote>${esc(v.quote)}</blockquote>
        <figcaption><strong>${esc(v.name)}</strong><span>${esc(v.place)}</span></figcaption>
      </figure>`
        )
        .join('')}
    </div>
    <div class="voices__nav">
      <button type="button" class="voices__dots" data-carousel-dots aria-label="Choose a testimonial">
        ${testimonials.map((_, i) => `<span class="dot${i === 0 ? ' is-active' : ''}" data-i="${i}"></span>`).join('')}
      </button>
      <div class="voices__arrows">
        <button type="button" data-carousel-prev aria-label="Previous testimonial">←</button>
        <button type="button" data-carousel-next aria-label="Next testimonial">→</button>
      </div>
    </div>
    <div class="press">
      ${press.map((p) => `<p class="press__item"><q>${esc(p.line)}</q><cite>${esc(p.outlet)}</cite></p>`).join('')}
    </div>
  </div>
</section>`;
}

function whySection() {
  return `
<section class="band band--sand" id="why">
  <div class="shell">
    <header class="band__head"><div><p class="eyebrow">Why Moroccan Experience</p><h2>What fifteen years in one country buys you</h2></div></header>
    <div class="whys">
      ${values
        .map(
          (v) => `<article class="why" data-reveal><span class="why__icon">${R.ICON.check}</span><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></article>`
        )
        .join('')}
    </div>
    <ul class="badges">
      ${awards.map((a) => `<li>${esc(a)}</li>`).join('')}
    </ul>
  </div>
</section>`;
}

function howSection() {
  return `
<section class="band" id="how">
  <div class="shell">
    <header class="band__head"><div><p class="eyebrow">How it works</p><h2>From a paragraph to a paid booking in six steps</h2></div>
      <p class="band__head-note">No obligation to book at any point before the deposit. The form is six fields; you can also telephone ${config.contact.phoneDisplay} and we will write it for you.</p>
    </header>
    <ol class="steps">
      ${howWeWork.map((s) => `<li class="step" data-reveal><span class="step__n">${esc(s.n)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}
    </ol>
  </div>
</section>`;
}

function trustRow() {
  return `
<section class="trust">
  <div class="shell trust__inner">
    <div class="trust__item"><strong>${config.commercial.depositPercent}%</strong><span>deposit now, ${config.commercial.balanceDueDaysBefore} days to pay the balance</span></div>
    <div class="trust__item"><strong>Stripe</strong><span>card, Apple Pay, Google Pay — we never see your card number</span></div>
    <div class="trust__item"><strong>24/7</strong><span>line answered from Marrakech in four languages</span></div>
    <div class="trust__item"><strong>Free</strong><span>planning, amendments before day 60, and name changes to day 45</span></div>
  </div>
</section>`;
}

function home() {
  const body =
    hero() +
    feelingSection() +
    typesSection() +
    journeysSection() +
    groupsSection() +
    bespokeStrip() +
    whenSection() +
    destinationsSection() +
    testimonialSection() +
    howSection() +
    whySection() +
    trustRow() +
    R.ctaBand({
      kicker: 'So — ready to begin?',
      title: 'Send us five lines. Get a priced itinerary tomorrow.',
      copy: 'Tell us who is coming, when, and how you want to feel. A named designer prices it with live supplier rates and holds it for seven days while you think.',
      primary: { label: 'Start my booking', href: '/book' },
      secondary: { label: 'Call ' + config.contact.phoneDisplay, href: config.contact.phoneHref },
      image: '/assets/img/marrakech-medina.jpg',
    });

  return R.layout({
    title: config.seo.title,
    description: config.seo.description,
    path: '/',
    active: 'home',
    body,
    preloadImage: '/assets/img/hero-home.jpg',
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'TravelAgency',
        name: config.brand.name,
        description: config.brand.shortPitch,
        url: config.absolute('/'),
        telephone: config.contact.phoneDisplay,
        email: config.contact.email,
        foundingDate: String(config.brand.founded),
        priceRange: '$$$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: config.contact.offices[0].lines[0],
          addressLocality: 'Marrakech',
          addressCountry: 'MA',
        },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '1847', bestRating: '5' },
        sameAs: config.contact.social.map((s) => s.href),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Morocco journeys',
        itemListElement: journeys.slice(0, 8).map((j, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: j.title,
          url: config.absolute('/journeys/' + j.slug),
        })),
      },
    ],
  });
}

module.exports = { home, finderForm };
