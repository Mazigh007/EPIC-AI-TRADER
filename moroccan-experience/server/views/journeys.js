'use strict';

const R = require('../render');
const config = require('../config');
const pricing = require('../pricing');
const { journeys, groupAudiences } = require('../content/journeys');
const { destinations, months, monthAdvice } = require('../content/destinations');
const { faqs } = require('../content/pages');
const { finderForm } = require('./home');

const esc = R.esc;
const attr = R.attr;
const money = R.money;

const typeImages = {
  luxury: '/assets/img/desert-camp-luxury.jpg',
  private: '/assets/img/marrakech-medina.jpg',
  bespoke: '/assets/img/bespoke-planning.jpg',
  group: '/assets/img/women-retreat.jpg',
};

/* --------------------------------------------------------- journeys index */

function filterBar(params) {
  const t = params.get('type') || '';
  const f = params.get('feeling') || '';
  const w = params.get('when') || '';
  const a = params.get('who') || '';
  const q = params.get('q') || '';
  return `
<form class="filters" method="get" action="/journeys" data-filterform>
  <div class="filters__pills" role="group" aria-label="Filter by style of journey">
    ${['', 'luxury', 'private', 'bespoke', 'group']
      .map((k) => `<a class="pill${t === k ? ' is-active' : ''}" href="/journeys${k ? '?type=' + k : ''}" data-pill="type" data-value="${k}">${k ? R.titleCase(k) + ' tours' : 'All journeys'}</a>`)
      .join('')}
  </div>
  <div class="filters__selects">
    <label>Feeling
      <select name="feeling" data-autosubmit>
        <option value="">Any</option>
        ${config.feelings.map((x) => `<option value="${x.key}"${f === x.key ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}
      </select>
    </label>
    <label>Month
      <select name="when" data-autosubmit>
        <option value="">Any</option>
        ${months.map((m, i) => `<option value="${i + 1}"${w === String(i + 1) ? ' selected' : ''}>${m}</option>`).join('')}
      </select>
    </label>
    <label>Party
      <select name="who" data-autosubmit>
        <option value="">Any</option>
        ${['women', 'students', 'seniors', 'couples', 'families']
          .map((k) => `<option value="${k}"${a === k ? ' selected' : ''}>${R.titleCase(k)}</option>`)
          .join('')}
      </select>
    </label>
    <label>Nights
      <input type="number" name="nights" min="3" max="21" value="${params.get('nights') || ''}" placeholder="7" data-autosubmit>
    </label>
    <label class="filters__search"><span class="sr-only">Search journeys</span>
      <input type="search" name="q" value="${esc(q)}" placeholder="Search: dunes, hammam, Fes…" formnovalidate>
    </label>
    <button class="btn btn--sm btn--solid" type="submit">Search</button>
    ${(t || f || w || a || q || params.get('nights')) && ''}
    <a class="btn btn--sm btn--ghost" href="/journeys">Clear</a>
  </div>
</form>`;
}

function applyFilters(params) {
  // `who` carries either a party type (from the home finder) or an audience
  // (from the filter bar); route each value to the field that understands it.
  const whoRaw = params.get('who');
  const styleAsType = ['luxury', 'private', 'bespoke', 'group'].includes(whoRaw) ? whoRaw : null;
  const who = styleAsType ? null : whoRaw;
  const type = params.get('type') || styleAsType;
  const feeling = params.get('feeling');
  const when = Number(params.get('when'));
  const nights = Number(params.get('nights'));
  const q = R.esc(params.get('q') || '').toLowerCase();
  let list = journeys.slice();
  if (type) list = list.filter((j) => (type === 'group' ? j.type === 'group' && (!who || j.audience === who) : j.type === type));
  if (type !== 'group' && who) list = list.filter((j) => j.audience === who || (who === 'couples' && (j.maxTravellers || 0) <= 8) || (who === 'families' && (j.maxTravellers || 0) > 8));
  if (feeling) list = list.filter((j) => j.feelings.includes(feeling));
  if (when && !Number.isNaN(when)) list = list.filter((j) => j.bestMonths.includes(when));
  if (nights && !Number.isNaN(nights)) list = list.filter((j) => Math.abs(j.nights - nights) <= 1);
  if (q) list = list.filter((j) => (j.title + ' ' + j.summary + ' ' + j.lead + ' ' + j.itinerary.map((d) => d.title + ' ' + d.text).join(' ') + ' ' + j.destinations.join(' ')).toLowerCase().includes(q));
  return list;
}

function journeysIndex(params) {
  const list = applyFilters(params);
  const whoParam = params.get('who');
  const activeType = params.get('type') || (['luxury', 'private', 'bespoke', 'group'].includes(whoParam) ? whoParam : null);
  const heading =
    activeType && config.journeyTypes.find((t) => t.key === activeType)
      ? config.journeyTypes.find((t) => t.key === activeType).name
      : 'Every journey we build';
  const intro =
    activeType === 'luxury'
      ? `From ${money(config.commercial.priceBands.luxury.from)} per person for seven nights, based on two travellers sharing. Nothing here is a hotel category — every property is named in your quotation, because “five-star in Morocco” and “the right riad” are different claims.`
      : activeType === 'private'
      ? `Our own cars, our own guides, no other travellers on your itinerary. From ${money(config.commercial.priceBands.private.from)} per person for seven nights, and every day is re-shapeable on the ground.`
      : activeType === 'bespoke'
      ? `Two examples of what a blank page produces, with the indicative figures we would start from. Bespoke journeys are quoted line by line once your brief and dates are known.`
      : activeType === 'group'
      ? `Led departures and private group dates for 10 to 30 travellers — women-only, student and university cohorts, and travellers aged sixty and over. From ${money(
          config.commercial.priceBands.group.from
        )} to ${money(config.commercial.priceBands.group.to)} per person for seven days.`
      : 'Twelve itineraries we have walked, driven and sailed ourselves, each one editable before you pay. Filter by feeling, month or party; or skip all of it and telephone us.';

  const body = `
${R.pageHero({
  kicker: `${journeys.length} journeys · Morocco only · est. ${config.brand.founded}`,
  title: heading,
  lead: intro,
  image: typeImages[activeType] || '/assets/img/hero-home.jpg',
  imageAlt: 'Morocco landscape',
  crumbs: [{ href: '/', label: 'Home' }, { label: 'Journeys' }],
})}
<section class="band band--tight">
  <div class="shell">
    ${filterBar(params)}
    <p class="count" aria-live="polite">${list.length} journey${list.length === 1 ? '' : 's'} match${list.length === 1 ? 'es' : ''}${
    list.length !== journeys.length ? ` of ${journeys.length}` : ''
  }.</p>
    ${
      list.length
        ? `<div class="jgrid">${list.map((j, i) => R.journeyCard(j, { eager: i < 3 })).join('')}</div>`
        : `<div class="empty">
      <h3>Nothing matches that combination — yet.</h3>
      <p>Most likely it is a month and a region that fight each other (desert in July, for example). Tell us the brief and a designer will build something the filters cannot reach.</p>
      <a class="btn btn--solid" href="/book">Send a brief</a> <a class="btn btn--line" href="/journeys">Clear filters</a>
    </div>`
    }
    <div class="band__sub">${finderForm()}</div>
  </div>
</section>
${R.ctaBand({
  kicker: 'Not on the list?',
  title: 'If it can be done in Morocco, we can price it',
  copy: 'Send the odd idea — a kiln, a kasbah wedding, a mule traverse with a cook, a school cohort of thirty-one — and get a line-by-line quotation in one working day.',
  primary: { label: 'Start a booking', href: '/book' },
  secondary: { label: 'Call ' + config.contact.phoneDisplay, href: config.contact.phoneHref },
  image: '/assets/img/riad-courtyard.jpg',
})}`;

  return R.layout({
    title: `${heading} | ${config.brand.name}`,
    description: intro.replace(/[$]/g, 'US$').slice(0, 190),
    path: '/journeys' + (activeType ? '?type=' + activeType : ''),
    active: 'journeys',
    body,
  });
}

/* --------------------------------------------------------- journey detail */

function itineraryTable(j) {
  return `
<ol class="itin">
  ${j.itinerary
    .map(
      (d) => `<li class="itin__row">
      <span class="itin__day">${String(d.day).padStart(2, '0')}</span>
      <div><h4>${esc(d.title)}</h4><p>${esc(d.text)}</p></div>
    </li>`
    )
    .join('')}
</ol>`;
}

function journeyDetail(j, params) {
  const isGroup = j.type === 'group';
  const pax = Math.min(Math.max(Number(params.get('pax')) || (isGroup ? 12 : 2), isGroup ? 10 : 1), isGroup ? 30 : j.maxTravellers || 12);
  const q = pricing.quote(j, { travellers: pax, nights: j.nights, month: null, roomMode: 'shared' });
  const related = journeys.filter((x) => x.slug !== j.slug && x.type === j.type).slice(0, 3);
  const dests = j.destinations.map((d) => destinations.find((x) => x.slug === d)).filter(Boolean);

  const body = `
${R.pageHero({
  kicker: `${j.type === 'group' ? 'Group departure · ' + (j.groupSizes || [10, 30]).join('–') + ' travellers' : R.titleCase(j.type) + ' journey'} · ${j.nights} nights`,
  title: esc(j.title),
  lead: j.lead,
  image: j.heroImage,
  imageAlt: j.title + ', Morocco',
  crumbs: [{ href: '/', label: 'Home' }, { href: '/journeys', label: 'Journeys' }, { label: j.title }],
  meta: [`${j.nights} nights`, j.pace, `★ ${j.rating} from ${j.reviewCount} reviews`, `Best: ${j.bestMonths.map((m) => months[m - 1]).join(', ')}`],
})}

<section class="band band--tight">
  <div class="shell shell--withrail">
    <div class="rail__main">
      <p class="lede">${esc(j.summary)}</p>

      <div class="chips chips--row">
        <span class="chip">From ${money(isGroup ? config.commercial.priceBands.group.from : pricing.priceFromPerPerson(j))} pp</span>
        ${j.feelings.map((f) => `<a class="chip" href="/journeys?feeling=${f}">${esc(config.feelings.find((x) => x.key === f)?.label || f)}</a>`).join('')}
        ${dests.map((d) => `<a class="chip" href="/destinations/${d.slug}">${esc(d.name)}</a>`).join('')}
      </div>

      <h2 class="h-section">The highlights</h2>
      <ul class="ticks">
        ${j.highlights.map((h) => `<li>${R.ICON.check}<span>${esc(h)}</span></li>`).join('')}
      </ul>

      <h2 class="h-section" id="itinerary">Day by day</h2>
      ${itineraryTable(j)}

      <div class="twocol">
        <div class="panel">
          <h3>What is included</h3>
          <ul class="ticks ticks--sm">${j.included.map((i) => `<li>${R.ICON.check}<span>${esc(i)}</span></li>`).join('')}</ul>
        </div>
        <div class="panel panel--muted">
          <h3>Not included</h3>
          <ul class="dots">${j.notIncluded.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          <p class="fine">${esc(config.commercial.taxNote)}</p>
        </div>
      </div>

      <h2 class="h-section">Where you will sleep</h2>
      <ul class="stays">
        ${j.sampleStays
          .map(
            (s) => `<li><strong>${esc(s.name)}</strong><span>${esc(s.place)}</span><p>${esc(s.note)}</p></li>`
          )
          .join('')}
      </ul>

      <div class="gallery">
        ${j.gallery
          .map((g, i) => `<figure><img src="${esc(g)}" alt="${esc(j.title)} — image ${i + 1}" loading="lazy" decoding="async" width="900" height="700"></figure>`)
          .join('')}
      </div>

      <h2 class="h-section">Carbon and community</h2>
      <p>${esc(j.carbonNote || 'Cooperative trade, small groups, and a printed rather than plastic document pack for every booking.')}</p>
    </div>

    <aside class="rail" aria-label="Price and booking">
      <div class="pricebox" data-pricebox data-journey="${j.slug}" data-default-pax="${pax}">
        <p class="pricebox__kicker">Indicative price, ${j.nights} nights</p>
        <p class="pricebox__total" data-pb-total>${money(q.perPersonTotal)}<span> per person</span></p>
        <p class="fine">Trip total for ${q.travellers}: <strong data-pb-trip>${money(q.total)}</strong></p>
        <form class="pricebox__form" data-pricebox-form>
          <label>${isGroup ? 'Travellers (10–30)' : 'Travellers'}
            <input type="number" name="travellers" min="${q.minTravellers}" max="${q.maxTravellers}" value="${q.travellers}" data-pb-pax>
          </label>
          <label>Nights
            <input type="number" name="nights" min="${j.minNights || 3}" max="${j.maxNights || 21}" value="${j.nights}" data-pb-nights>
          </label>
          <label>Month
            <select name="month" data-pb-month>
              <option value="">Any</option>
              ${months.map((m, i) => `<option value="${i + 1}"${j.bestMonths.includes(i + 1) ? ' class="best"' : ''}>${m}${j.bestMonths.includes(i + 1) ? ' ★' : ''}</option>`).join('')}
            </select>
          </label>
          <label>Rooms
            <select name="roomMode" data-pb-room>
              ${Object.entries(pricing.ROOM_MODES)
                .map(([k, v]) => `<option value="${k}"${k === 'shared' ? ' selected' : ''}>${esc(v.label)}</option>`)
                .join('')}
            </select>
          </label>
        </form>
        <dl class="pricebox__breakdown">
          <div><dt>Deposit due now (${config.commercial.depositPercent}%)</dt><dd data-pb-deposit>${money(q.deposit)}</dd></div>
          <div><dt>Balance ${config.commercial.balanceDueDaysBefore} days before</dt><dd data-pb-balance>${money(q.balance)}</dd></div>
        </dl>
        <a class="btn btn--solid btn--block" href="/book/${j.slug}?pax=${q.travellers}&nights=${q.nights}">Book with ${config.commercial.depositPercent}% deposit</a>
        <a class="btn btn--line btn--block" href="/book/${j.slug}?pax=${q.travellers}&mode=quote">Email me a quotation instead</a>
        <p class="pricebox__wa"><a href="${R.chatWaHref(encodeURIComponent('Hi — I would like a quote for ' + j.title + (isGroup ? ' for a group of ' + pax : '')))}" target="_blank" rel="noopener">${R.ICON.whatsapp} Ask a designer on WhatsApp</a></p>
        <p class="fine">Indicative. Your written quotation is binding. <a href="/booking-conditions">Booking conditions</a>.</p>
      </div>

      <div class="depbox">
        <h3>Departure dates</h3>
        <ul>
          ${(j.departures || [])
            .map(
              (d) => `<li><time datetime="${attr(d.date)}">${esc(new Date(d.date + 'T12:00:00Z').toDateString().slice(4))}</time><span>${esc(d.note || '')}</span><em class="dep dep--${esc(
                d.status || 'open'
              )}">${esc(d.status === 'few' ? 'Few places' : d.status === 'waitlist' ? 'Waitlist' : 'Open')}</em></li>`
            )
            .join('') || '<li>Private dates on request</li>'}
        </ul>
        <p class="fine">${esc(j.departureStyle || 'Private dates run all year; we will confirm the exact window in your quotation.')}</p>
      </div>
    </aside>
  </div>
</section>

${
  related.length
    ? `<section class="band band--tight band--sand"><div class="shell"><h2 class="h-section">Also worth considering</h2><div class="jgrid jgrid--3">${related
        .map((x) => R.journeyCard(x))
        .join('')}</div></div></section>`
    : ''
}

<section class="band band--tight" id="faq">
  <div class="shell shell--narrow">
    <h2 class="h-section">Questions travellers ask about this journey</h2>
    <details class="qa" open>
      <summary>How much of this is fixed, and how much can I change?</summary>
      <p>Nothing is fixed until you pay. Before the deposit, every day, room and meal here is negotiable — including removing things. After the deposit, changes up to ${config.commercial.balanceDueDaysBefore} days before departure cost nothing from us, only whatever a supplier charges.</p>
    </details>
    <details class="qa">
      <summary>What does the ${config.commercial.depositPercent}% deposit buy immediately?</summary>
      <p>Rooms and camps bought in your name, the guide's dates held, vehicles reserved, and a Booking Confirmation within 24 hours. It is non-refundable if you cancel, and fully refundable if we cannot run the trip.</p>
    </details>
    <details class="qa">
      <summary>Can you run this privately for my group?</summary>
      <p>Yes. Send the dates and the party size on the booking form and tick “private departure for my group” — we will price the whole party, with leader places free at the standard ratio.</p>
    </details>
  </div>
</section>

${R.ctaBand({
  kicker: 'Speak to the person who will build it',
  title: `${config.contact.phoneDisplay}`,
  copy: `WhatsApp ${config.contact.whatsappDisplay}, or call the Marrakech desk — Mon–Sat 08:00–20:00, and 24 hours a day once you are travelling.`,
  primary: { label: 'Start booking this journey', href: '/book/' + j.slug },
  secondary: { label: 'WhatsApp a designer', href: R.chatWaHref(encodeURIComponent('Hi — about ' + j.title + '…')) },
  image: j.gallery[1] || j.heroImage,
})}`;

  return R.layout({
    title: `${j.title} | ${R.titleCase(j.type)} Morocco tour — ${config.brand.name}`,
    description: `${j.lead} ${R.priceLabel(j)}. ${config.commercial.depositPercent}% deposit with Stripe.`,
    path: '/journeys/' + j.slug,
    active: j.type === 'group' ? 'groups' : 'journeys',
    body,
    preloadImage: j.heroImage,
    ogImage: j.heroImage,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: j.title,
        description: j.summary,
        image: R.abs(j.heroImage),
        touristType: R.titleCase(j.type) + (j.audience ? ' / ' + j.audience : ''),
        itinerary: {
          '@type': 'ItemList',
          numberOfItems: j.itinerary.length,
          itemListElement: j.itinerary.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.title, text: d.text })),
        },
        location: dests.map((d) => ({ '@type': 'TouristAttraction', name: d.name })),
        offer: {
          '@type': 'Offer',
          price: String(q.perPersonTotal),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: R.abs('/book/' + j.slug),
          description: `Per person, ${j.nights} nights, two sharing. ${config.commercial.depositPercent}% deposit.`,
        },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: String(j.rating), reviewCount: String(j.reviewCount), bestRating: '5' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.slice(0, 6).map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  });
}

/* ------------------------------------------------------- type landing pages */

function landingPage({ key, title, kicker, lead, image, extra, audience }) {
  const type = key === 'group' ? 'group' : key;
  let list = journeys.filter((j) => (j.type === 'group' ? j.type === 'group' && (!audience || j.audience === audience) : j.type === type));
  if (audience && key !== 'group') list = list.filter((j) => j.audience === audience);
  const band = key === 'group' ? config.commercial.priceBands.group : key === 'luxury' ? config.commercial.priceBands.luxury : config.commercial.priceBands[key];

  const body = `
${R.pageHero({
  kicker,
  title,
  lead,
  image: image || typeImages[key],
  imageAlt: 'Morocco',
  crumbs: [{ href: '/', label: 'Home' }, { href: '/journeys', label: 'Journeys' }, { label: title }],
  meta: [`${list.length} journeys`, band ? `From ${money(band.from)} per person` : '', config.commercial.depositPercent + '% deposit to confirm'].filter(Boolean),
})}
${extra || ''}
<section class="band band--tight">
  <div class="shell">
    <div class="jgrid">${list.map((j, i) => R.journeyCard(j, { eager: i < 3 })).join('')}</div>
  </div>
</section>
${R.ctaBand({
  kicker: 'Design it with us',
  title: key === 'group' ? 'Bring your own group and set the dates' : 'Change anything before you pay',
  copy:
    key === 'group'
      ? `Send a party size between 10 and 30 and we will build the departure around your calendar — including single-sex crew on the women-only format, and full safeguarding paperwork for student cohorts.`
      : 'Every itinerary here is a starting point. Two sentences from you and a designer returns a priced draft inside a working day.',
  primary: { label: 'Start a booking', href: '/book' },
  secondary: { label: 'Call ' + config.contact.phoneDisplay, href: config.contact.phoneHref },
  image: '/assets/img/atlas-hike.jpg',
})}`;

  return R.layout({
    title: `${title} in Morocco | ${config.brand.name}`,
    description: lead.slice(0, 190),
    path: '/' + (key === 'private' ? 'private-tours' : key),
    active: key === 'luxury' ? 'luxury' : key === 'bespoke' ? 'bespoke' : key === 'group' ? 'groups' : 'private',
    body,
    preloadImage: image || typeImages[key],
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'ItemPage',
      name: title,
      description: lead,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: list.map((j, i) => ({ '@type': 'ListItem', position: i + 1, url: R.abs('/journeys/' + j.slug), name: j.title })),
      },
    },
  });
}

function luxuryPage() {
  return landingPage({
    key: 'luxury',
    title: 'Luxury tours of Morocco',
    kicker: `Signature luxury · from ${money(config.commercial.priceBands.luxury.from)} per person / 7 days`,
    lead: `Seven nights or longer, with the riads, desert camps and mountain lodges we rate above every other option, a private guide, a private car, and the sort of access you cannot buy on arrival. Everything is private and nothing is rushed.`,
    extra: `
<section class="band band--tight band--sand"><div class="shell">
  <div class="split">
    <div class="split__text">
      <p class="eyebrow">What “luxury” means here</p>
      <h2>Not thread count. Access, timing and silence.</h2>
      <ul class="ticks">
        ${[
          'A camp that moves to follow the moon so that you are alone in a 150-metre erg',
          'Monuments opened for you outside public hours, with a conservator, not a script',
          'Guides on annual salaries who have worked with us for a decade or more',
          'Two properties per city maximum, chosen in person every year, never by star rating',
          'A helicopter, a sloop, a mule train — whichever makes the day better, priced honestly',
        ]
          .map((t) => `<li>${R.ICON.check}<span>${esc(t)}</span></li>`)
          .join('')}
      </ul>
      <p class="fine">Prices are per person for seven nights, two sharing, excluding international flights; VAT and local tourist taxes are included. Longer journeys and suites are priced in your quotation.</p>
    </div>
    <div class="split__aside">
      <div class="calcbox">
        <h3>Luxury price guide</h3>
        <table class="mini">
          <thead><tr><th>Nights</th><th>From, per person</th></tr></thead>
          <tbody>
          ${[7, 8, 10, 12, 14]
            .map((n) => `<tr><td>${n} nights</td><td>${money(Math.round((config.commercial.luxuryDayRate * n) / 50) * 50)}</td></tr>`)
            .join('')}
          </tbody>
        </table>
        <p class="fine">Indicative, two travellers sharing, standard rooms. A suite, a private camp or peak dates moves the figure — the booking form recalculates as you change it.</p>
        <a class="btn btn--solid btn--block" href="/book/starlight-sahara-private-luxury">Price a luxury journey</a>
      </div>
    </div>
  </div>
</div></section>`,
  });
}

function privatePage() {
  return landingPage({
    key: 'private',
    title: 'Private guided tours',
    kicker: `Private tours · from ${money(config.commercial.priceBands.private.from)} per person / 7 days`,
    lead: `Your own vehicle, your own guide, your own table. The most-booked way to travel Morocco with us: the itineraries are ours to argue about, the pace is entirely yours, and a change of mind at breakfast is a phone call rather than a problem.`,
  });
}

function bespokePage() {
  const list = journeys.filter((j) => j.type === 'bespoke');
  const body = `
${R.pageHero({
  kicker: 'Bespoke journeys · design fee $0',
  title: 'Bespoke: the trip that is not on our website',
  lead: 'A craft residency with a master potter, a wedding in a kasbah, a family reunion with a household staffed around a grandmother who cannot do stairs, a recording trip with Gnawa players. You bring the idea; we bring the keys.',
  image: '/assets/img/bespoke-planning.jpg',
  imageAlt: 'Map of Morocco, notebook and mint tea on a planning desk',
  crumbs: [{ href: '/', label: 'Home' }, { href: '/journeys', label: 'Journeys' }, { label: 'Bespoke' }],
  meta: [`Indicative from ${money(config.commercial.priceBands.bespoke.from)} per person`, 'Quotation in 1 working day', 'Held 7 days free'],
})}

<section class="band band--tight">
  <div class="shell shell--withrail">
    <div class="rail__main">
      <p class="lede">Bespoke is not “add a helicopter”. It is a designer with fifteen years in this country, a supplier list we built ourselves, and a brief that starts with what you want to feel rather than which hotels you can afford.</p>
      <h2 class="h-section">How a bespoke brief is priced</h2>
      <ol class="numlist">
        <li><strong>Five to ten sentences.</strong> Who is coming, what you want to happen, what you refuse to do, the dates that matter, and any budget ceiling — a ceiling is genuinely useful to us.</li>
        <li><strong>We test feasibility.</strong> Whether the kiln is firing that week, whether the village can feed twenty, whether the guide who speaks Tarifit is free.</li>
        <li><strong>A line-by-line quotation.</strong> Supplier cost, our fee (zero), taxes, and the ${config.commercial.depositPercent}% deposit. Held seven days, revised free of charge as many times as you need.</li>
        <li><strong>Then it becomes yours.</strong> Your named designer stays on WhatsApp for the whole trip, including the 3am “the roof is leaking” message.</li>
      </ol>
      <h2 class="h-section">Things we have built from scratch</h2>
      <ul class="chips chips--row">
        ${['Ceramics residency, 9 nights, 6 students', 'Wedding for 40 in a Dadès kasbah', 'Archival research trip, 4 weeks, 2 scholars', 'Film recce with permits, 11 days', 'Hydrology field lab, 31 travellers', 'Mother-daughter hammam & Atlas, 5 nights', 'Music recording with a Gnawa master', 'Argan cooperative trade visit for a buyer’s team']
          .map((x) => `<li class="chip">${esc(x)}</li>`)
          .join('')}
      </ul>
      <h2 class="h-section">Two starting points</h2>
      <div class="jgrid jgrid--2">${list.map((j) => R.journeyCard(j)).join('')}</div>
    </div>
    <aside class="rail">
      <div class="calcbox">
        <h3>Start a bespoke brief</h3>
        <p class="fine">Six fields, an indicative figure instantly, no obligation. Or speak to a designer now.</p>
        <a class="btn btn--solid btn--block" href="/book/the-craft-residency">Open the brief form</a>
        <a class="btn btn--line btn--block" href="${config.contact.phoneHref}">Call ${esc(config.contact.phoneDisplay)}</a>
        <a class="btn btn--line btn--block" href="${R.chatWaHref(encodeURIComponent('I have a bespoke idea for Morocco: '))}" target="_blank" rel="noopener">${R.ICON.whatsapp} WhatsApp ${esc(
        config.contact.whatsappDisplay
      )}</a>
      </div>
      ${R.ICON ? '' : ''}
      <div class="panel panel--tight">
        <h3>Ask the AI assistant first</h3>
        <p class="fine">It reads every itinerary, price band and policy on this site, and will hand you to a human when certainty matters. It is in the corner of every page.</p>
      </div>
    </aside>
  </div>
</section>
${R.ctaBand({
  kicker: 'Nothing on this page fits',
  title: 'Good. That is what bespoke is for.',
  copy: 'Send the awkward version of the idea. We have built a trip around a single 14th-century tile, and one around a grandmother’s recipe in a village with no road.',
  primary: { label: 'Write the brief', href: '/book/the-craft-residency' },
  secondary: { label: 'See our itineraries', href: '/journeys' },
  image: '/assets/img/fes-tannery.jpg',
})}`;

  return R.layout({
    title: 'Bespoke Morocco itineraries, designed line by line | ' + config.brand.name,
    description: 'Fully bespoke journeys in Morocco: residencies, weddings, research trips and family reunions. Indicative from $4,500 per person, zero design fee, quoted line by line in one working day.',
    path: '/bespoke',
    active: 'bespoke',
    body,
    preloadImage: '/assets/img/bespoke-planning.jpg',
  });
}

function groupsPage(audienceKey) {
  const a = audienceKey ? groupAudiences[audienceKey] : null;
  const list = a ? journeys.filter((j) => j.audience === audienceKey) : journeys.filter((j) => j.type === 'group');
  const c = config.commercial;
  const body = `
${R.pageHero({
  kicker: a ? a.strapline : `Group journeys · ${c.groupMinTravellers} to ${c.groupMaxTravellers} travellers`,
  title: a ? a.name : 'Group tours for women, students and seniors',
  lead: a
    ? a.copy
    : `Three products, each built for one kind of traveller and nobody else: women-only departures with an all-female crew, field-lab journeys for universities, and a slow grand tour for travellers aged sixty and over. ${money(
        c.priceBands.group.from
      )} to ${money(c.priceBands.group.to)} per person for seven days.`,
  image: a ? list[0]?.heroImage || '/assets/img/women-retreat.jpg' : '/assets/img/women-retreat.jpg',
  imageAlt: 'Group travel in Morocco',
  crumbs: [{ href: '/', label: 'Home' }, { href: '/groups', label: 'Group tours' }, ...(a ? [{ label: a.name }] : [])],
  meta: [`10–30 travellers`, `From ${money(c.priceBands.group.from)}pp`, 'One leader free per ten'],
})}

<section class="band band--tight">
  <div class="shell">
    <div class="tabs">
      ${['', 'women', 'students', 'seniors']
        .map(
          (k) =>
            `<a class="tab${(k || '') === (audienceKey || '') ? ' is-active' : ''}" href="/groups${k ? '/' + k : ''}">${
              k === 'women' ? 'Women only' : k === 'students' ? 'Students & universities' : k === 'seniors' ? 'Seniors 60+' : 'All groups'
            }</a>`
        )
        .join('')}
    </div>

    ${
      a
        ? `<div class="audience">
      <div>
        <h2 class="h-section">What you get</h2>
        <ul class="ticks">${a.includes.map((i) => `<li>${R.ICON.check}<span>${esc(i)}</span></li>`).join('')}</ul>
        <p class="fine"><strong>Who it suits:</strong> ${esc(a.suitability)}</p>
      </div>
      <div class="panel">
        <h3>Group price ladder</h3>
        <table class="mini" aria-label="Group price per person by party size for seven nights">
          <thead><tr><th>Travellers</th><th>From, per person</th></tr></thead>
          <tbody>
          ${[10, 15, 20, 25, 30]
            .map((n) => `<tr><td>${n}</td><td>${money(pricing.groupPricePerPerson(list[0] || { type: 'group', tier: 1 }, n, 7))}</td></tr>`)
            .join('')}
          </tbody>
        </table>
        <p class="fine">Seven-night reference, twin sharing. Longer journeys scale; a private date for a whole cohort is priced separately.</p>
        <a class="btn btn--solid btn--block" href="/book/${list[0] ? list[0].slug : ''}">Price my group</a>
      </div>
    </div>`
        : `<div class="audience">
      <div>
        <h2 class="h-section">Why we cap groups at thirty</h2>
        <p>A coach of forty-five cannot enter Fes medina, cannot eat in a home, and changes the relationship between a traveller and the place. Ten is the smallest number at which a shared departure works financially; thirty is the largest at which it still works humanly. Everything between is priced the same way: the cost of the coach, the guide and the leader spreads across more people, so the per-person price falls.</p>
      </div>
      <div class="panel">
        <h3>The band, in full</h3>
        <table class="mini"><tbody>
          <tr><td>10 travellers</td><td>${money(c.priceBands.group.to)}pp</td></tr>
          <tr><td>15 travellers</td><td>${money(pricing.groupPricePerPerson({ type: 'group', tier: 1 }, 15, 7))}pp</td></tr>
          <tr><td>20 travellers</td><td>${money(pricing.groupPricePerPerson({ type: 'group', tier: 1 }, 20, 7))}pp</td></tr>
          <tr><td>25 travellers</td><td>${money(pricing.groupPricePerPerson({ type: 'group', tier: 1 }, 25, 7))}pp</td></tr>
          <tr><td>30 travellers</td><td>${money(c.priceBands.group.from)}pp</td></tr>
        </tbody></table>
      </div>
    </div>`
    }

    <h2 class="h-section">${a ? 'Departures' : 'Group journeys'}</h2>
    <div class="jgrid">${list.map((j, i) => R.journeyCard(j, { eager: i < 3 })).join('')}</div>

    <h2 class="h-section">Questions groups ask before paying a deposit</h2>
    <div class="twocol">
      ${faqs
        .filter((f) => /group|deposit|women|student|cancel|minimum/i.test(f.q))
        .slice(0, 6)
        .map((f) => `<details class="qa"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
        .join('')}
    </div>
  </div>
</section>
${R.ctaBand({
  kicker: 'Bring your own group',
  title: 'Set the dates. We will hold the whole departure.',
  copy: `A society, a department, a family of twenty-two, a book club: private group departures run all year with the same crew and the same ${c.depositPercent}% deposit, invoiced to one reference.`,
  primary: { label: 'Price my group', href: '/book/sisters-of-the-medina-and-dunes' },
  secondary: { label: 'Call ' + config.contact.phoneDisplay, href: config.contact.phoneHref },
  image: '/assets/img/women-retreat.jpg',
})}`;

  return R.layout({
    title: (a ? a.name : 'Group tours') + ' in Morocco | ' + config.brand.name,
    description: a
      ? a.strapline + ' Groups of 10–30 travellers, from ' + money(c.priceBands.group.from) + ' to ' + money(c.priceBands.group.to) + ' per person for seven nights.'
      : 'Group tours of Morocco for women only, student and university groups, and seniors. 10–30 travellers, $2,000–$4,000 per person for seven days, one leader free per ten.',
    path: '/groups' + (a ? '/' + a.key : ''),
    active: 'groups',
    body,
    preloadImage: '/assets/img/women-retreat.jpg',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: a ? a.name : 'Morocco group tours',
      itemListElement: list.map((j, i) => ({ '@type': 'ListItem', position: i + 1, name: j.title, url: R.abs('/journeys/' + j.slug) })),
    },
  });
}

module.exports = { journeysIndex, journeyDetail, luxuryPage, privatePage, bespokePage, groupsPage, typeImages };
