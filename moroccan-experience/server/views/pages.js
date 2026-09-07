'use strict';

const R = require('../render');
const config = require('../config');
const { journeys } = require('../content/journeys');
const { destinations, months, monthAdvice } = require('../content/destinations');
const { faqs, values, sustainability, stats, awards, contactChannels } = require('../content/pages');
const { bookingConditions, privacyPolicy, legalTerms } = require('../content/legal');

const esc = R.esc;
const attr = R.attr;
const money = R.money;

/* ----------------------------------------------------------- destinations */

function destinationsIndex() {
  const body = `
${R.pageHero({
  kicker: 'Destinations',
  title: 'Seven Moroccos, and the months each one is for',
  lead: 'Ocean, mountains, desert, imperial cities, Rif, capital, and the kasbah road between them. We only sell what we have walked in the right season — which is why some of these are closed from June to August.',
  image: '/assets/img/chefchaouen-blue.jpg',
  imageAlt: 'Blue-washed alleyway in Chefchaouen, northern Morocco',
  crumbs: [{ href: '/', label: 'Home' }, { label: 'Destinations' }],
})}
<section class="band band--tight"><div class="shell">
  <div class="dgrid">
    ${destinations
      .map(
        (d, i) => `
    <article class="dcard" data-reveal>
      <a class="dcard__media" href="/destinations/${d.slug}" tabindex="-1" aria-hidden="true"><img src="${esc(d.image)}" alt="${esc(d.name)}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" width="900" height="700"></a>
      <div class="dcard__body">
        <p class="jcard__meta">${esc(d.region)}</p>
        <h3><a href="/destinations/${d.slug}">${esc(d.name)}</a></h3>
        <p>${esc(d.intro.slice(0, 190))}…</p>
        <p class="fine"><strong>Best time:</strong> ${esc(d.bestTime)}</p>
        <a class="textlink" href="/destinations/${d.slug}">Read the guide ${R.ICON.arrow}</a>
      </div>
    </article>`
      )
      .join('')}
  </div>
</div></section>
${R.ctaBand({
  kicker: 'Two regions in one trip',
  title: 'The route matters more than the postcard',
  copy: 'Marrakech to the dunes is 580km. It takes two days to do properly and one day to do badly, and that choice is the whole difference between a good Morocco trip and a tiring one.',
  primary: { label: 'Build a route', href: '/book' },
  secondary: { label: 'When to go', href: '/when-to-go' },
  image: '/assets/img/kasbah-sunset.jpg',
})}`;
  return R.layout({
    title: 'Destinations: Marrakech, Fes, the Sahara, the Atlas | ' + config.brand.name,
    description:
      'Where to go in Morocco and when: Marrakech, Fes, the High Atlas, the Sahara, Essaouira, the Dadès valley, Chefchaouen and Rabat — from the operator that only does this country.',
    path: '/destinations',
    active: 'destinations',
    body,
  });
}

function destinationDetail(d) {
  const js = journeys.filter((j) => j.destinations.includes(d.slug));
  const body = `
${R.pageHero({
  kicker: d.region,
  title: d.name,
  lead: d.intro,
  image: d.image,
  imageAlt: d.name + ', Morocco',
  crumbs: [{ href: '/', label: 'Home' }, { href: '/destinations', label: 'Destinations' }, { label: d.name }],
  meta: ['Best time: ' + d.bestTime, js.length + ' journeys include it'],
})}
<section class="band band--tight"><div class="shell shell--withrail">
  <div class="rail__main">
    <h2 class="h-section">Why we take people here</h2>
    <ul class="ticks">${d.whyUs.map((w) => `<li>${R.ICON.check}<span>${esc(w)}</span></li>`).join('')}</ul>
    <h2 class="h-section">Five things worth knowing</h2>
    <ul class="facts">${d.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <h2 class="h-section">Journeys that include ${esc(d.name)}</h2>
    <div class="jgrid jgrid--2">${js.map((j) => R.journeyCard(j)).join('') || '<p>Ask us and we will build one.</p>'}</div>
  </div>
  <aside class="rail">
    <div class="calcbox">
      <h3>Plan ${esc(d.name)}</h3>
      <p class="fine">Tell us the dates and who is coming. A designer replies with a priced route in one working day.</p>
      <a class="btn btn--solid btn--block" href="/book${js[0] ? '/' + js[0].slug : ''}?destination=${d.slug}">Start a booking</a>
      <a class="btn btn--line btn--block" href="${config.contact.phoneHref}">Call ${esc(config.contact.phoneDisplay)}</a>
    </div>
    <div class="panel panel--tight">
      <h3>Month by month here</h3>
      <ul class="mini-list">${monthAdvice.slice(0, 6).map((m) => `<li><strong>${esc(months[m.m - 1])}</strong> ${esc(m.note)}</li>`).join('')}</ul>
      <a class="textlink" href="/when-to-go">Full twelve-month guide ${R.ICON.arrow}</a>
    </div>
  </aside>
</div></section>`;
  return R.layout({
    title: `${d.name} travel guide | ${config.brand.name}`,
    description: `${d.intro.slice(0, 150)} Best time to visit ${d.name}: ${d.bestTime}.`,
    path: '/destinations/' + d.slug,
    active: 'destinations',
    body,
    preloadImage: d.image,
    ogImage: d.image,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'TouristDestination',
      name: d.name,
      description: d.intro,
      image: R.abs(d.image),
      touristType: 'Cultural, adventure and luxury travel',
      season: { '@type': 'Season', name: d.bestTime },
    },
  });
}

/* -------------------------------------------------------------- when to go */

function whenToGo() {
  const body = `
${R.pageHero({
  kicker: 'When to go',
  title: 'Twelve months in Morocco, honestly assessed',
  lead: 'The country is big enough that “best time to visit” is a meaningless question. It is a matter of which Morocco. Here is what each month is genuinely good for — and what we reroute.',
  image: '/assets/img/atlas-hike.jpg',
  imageAlt: 'Walking the High Atlas in spring',
  crumbs: [{ href: '/', label: 'Home' }, { label: 'When to go' }],
})}
<section class="band band--tight"><div class="shell">
  <div class="monthgrid">
    ${monthAdvice
      .map(
        (m) => `<a class="monthcard" href="/journeys?when=${m.m}">
      <span class="monthcard__n">${esc(months[m.m - 1])}</span>
      <strong>${esc(m.label)}</strong>
      <p>${esc(m.note)}</p>
    </a>`
      )
      .join('')}
  </div>
  <h2 class="h-section">Practical calendar</h2>
  <div class="twocol">
    <div class="panel">
      <h3>Weather in one paragraph</h3>
      <p>Marrakech: 18°C in January, 38°C in July. The Atlas is 10°C cooler at altitude and gets snow from December to March. The coast stays near 25°C all summer because of the ocean mist. The desert swings 20°C between day and night in winter — that is not a rounding error, bring a coat.</p>
    </div>
    <div class="panel">
      <h3>Ramadan & festivals</h3>
      <p>During Ramadan, kitchens close during daylight and the city wakes after sunset — brilliant for the medina at night, harder for a family with small children. Our festival calendar (Gnawa in Essaouira in June, roses in Kelaat M’Gouna in May) books out nine months ahead.</p>
    </div>
  </div>
</div></section>
${R.ctaBand({
  kicker: 'Let the month choose the route',
  title: 'Give us a date and we will pick the Morocco that is good then',
  copy: 'This is the single most valuable thing a specialist does. Send your dates; a designer returns the right region, the right guide and a price in one working day.',
  primary: { label: 'Start a booking', href: '/book' },
  secondary: { label: 'Browse by feeling', href: '/journeys' },
  image: '/assets/img/essaouira-coast.jpg',
})}`;
  return R.layout({
    title: 'When to go to Morocco: month-by-month guide | ' + config.brand.name,
    description: 'Month by month in Morocco: desert in winter, coast in summer, roses in May. Practical weather, Ramadan and festival advice from the specialists.',
    path: '/when-to-go',
    active: 'destinations',
    body,
  });
}

/* -------------------------------------------------------------------- about */

function aboutPage() {
  const body = `
${R.pageHero({
  kicker: `Est. ${config.brand.founded} · ${config.brand.licence}`,
  title: 'One country, fifteen years, forty-eight guides',
  lead: 'We started with two people and a Land Rover. We stayed small deliberately, and stayed in Morocco deliberately, because the thing we sell is not inventory but knowledge — and knowledge in this country takes years to earn.',
  image: '/assets/img/riad-courtyard.jpg',
  imageAlt: 'Riad courtyard in the Marrakech medina',
  crumbs: [{ href: '/', label: 'Home' }, { label: 'Why us' }],
  meta: stats.map((s) => `${s.value} ${s.label}`),
})}
<section class="band band--tight"><div class="shell shell--withrail">
  <div class="rail__main">
    <h2 class="h-section">The four promises we audit ourselves against</h2>
    <div class="whys">${values
      .map((v, i) => `<article class="why"><span class="why__n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></article>`)
      .join('')}</div>

    <h2 class="h-section">How we are run</h2>
    <div class="twocol">
      <div class="panel">
        <h3>Money</h3>
        <p>No planning fee, no booking fee, no commission from hotels. Suppliers pay nothing to be recommended and we do not accept it. Our margin is stated in your quotation as a number, and you may ask us to reduce it by doing more yourself.</p>
      </div>
      <div class="panel">
        <h3>People</h3>
        <p>Forty-eight guides and drivers on annual contracts with health cover, twenty-one of them women. Mountain journeys use qualified mountain leaders. Everyone is re-trained every two years in first aid and desert recovery, and paid for that time.</p>
      </div>
      <div class="panel">
        <h3>Payments</h3>
        <p>Deposits and balances are taken on Stripe’s hosted checkout. A ${config.commercial.depositPercent}% deposit confirms; the ${100 - config.commercial.depositPercent}% balance falls due ${config.commercial.balanceDueDaysBefore} days before departure. Card details never reach our servers.</p>
      </div>
      <div class="panel">
        <h3>Licences & protection</h3>
        <p>${config.brand.legalName} holds Ministry of Tourism licence IM01070033, is registered with the CNDP for personal data, and carries professional indemnity and supplier-insolvency cover. Certificates on request.</p>
      </div>
    </div>

    <h2 class="h-section">What we do with the footprint</h2>
    <ul class="ticks">${sustainability.map((s) => `<li>${R.ICON.check}<span>${esc(s)}</span></li>`).join('')}</ul>

    <h2 class="h-section">Recognition</h2>
    <ul class="badges">${awards.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
  </div>
  <aside class="rail">
    <div class="calcbox">
      <h3>Talk to a designer</h3>
      ${contactChannels
        .map(
          (c) => `<p class="contactline"><strong>${esc(c.label)}</strong><span>${esc(
            c.value === 'phone'
              ? config.contact.phoneDisplay
              : c.value === 'whatsapp'
              ? config.contact.whatsappDisplay
              : c.value === 'email'
              ? config.contact.email
              : 'On the website'
          )}</span><a class="textlink" href="${
            c.value === 'phone'
              ? config.contact.phoneHref
              : c.value === 'whatsapp'
              ? R.chatWaHref()
              : c.value === 'email'
              ? 'mailto:' + config.contact.email
              : '/book'
          }">${esc(c.cta)} ${R.ICON.arrow}</a></p>`
        )
        .join('')}
    </div>
    <div class="panel panel--tight">
      <h3>Offices</h3>
      ${config.contact.offices
        .map((o) => `<p class="fine"><strong>${esc(o.city)}</strong><br>${esc(o.lines.join(', '))}<br>${esc(o.phone)}</p>`)
        .join('')}
    </div>
  </aside>
</div></section>`;
  return R.layout({
    title: 'Why travellers choose us | ' + config.brand.name,
    description:
      'A Morocco-only operator since 2011: licensed, salaried guides, no planning fee, prices in writing, and a 24/7 line from Marrakech. Awards, ethics and how we are run.',
    path: '/about',
    active: 'about',
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About ' + config.brand.name,
      publisher: { '@type': 'Organization', name: config.brand.legalName, foundingDate: String(config.brand.founded) },
    },
  });
}

/* ------------------------------------------------------------------ contact */

function contactPage() {
  const body = `
${R.pageHero({
  kicker: 'Contact · 24/7 while travelling',
  title: 'Four ways to reach a human',
  lead: 'Every channel below lands on the Marrakech desk, answered in English, French, Arabic and Spanish. The WhatsApp line and the telephone are the fastest; the booking form is the most useful.',
  image: '/assets/img/marrakech-medina.jpg',
  imageAlt: 'Marrakech medina at dusk',
  crumbs: [{ href: '/', label: 'Home' }, { label: 'Contact' }],
})}
<section class="band band--tight"><div class="shell">
  <div class="contactgrid">
    <a class="cbox cbox--wa" href="${R.chatWaHref()}" target="_blank" rel="noopener">
      ${R.ICON.whatsapp}
      <h3>WhatsApp a designer</h3>
      <p>${esc(config.contact.whatsappDisplay)}</p>
      <span class="fine">Usually under 10 minutes, 08:00–22:00 CET. Voice notes welcome.</span>
    </a>
    <a class="cbox cbox--phone" href="${config.contact.phoneHref}">
      ${R.ICON.phone}
      <h3>Call the desk</h3>
      <p>${esc(config.contact.phoneDisplay)}</p>
      <span class="fine">Mon–Sat 08:00–20:00 CET. 24 hours a day once you are travelling.</span>
    </a>
    <a class="cbox" href="mailto:${config.contact.email}">
      <h3>Email us</h3>
      <p>${esc(config.contact.email)}</p>
      <span class="fine">One working day. Bookings: bookings@moroccan-experience.com</span>
    </a>
    <a class="cbox" href="/book">
      <h3>Booking & quotation form</h3>
      <p>Six fields, instant indicative price</p>
      <span class="fine">No obligation, no planning fee, quotation held 7 days.</span>
    </a>
  </div>
  <div class="twocol">
    <div class="panel">
      <h3>Opening hours</h3>
      <table class="mini"><tbody>${config.contact.hours
        .map((h) => `<tr><td>${esc(h.tz)}</td><td>${esc(h.days)}</td><td>${esc(h.time)}</td></tr>`)
        .join('')}</tbody></table>
    </div>
    <div class="panel">
      <h3>Where we are</h3>
      ${config.contact.offices
        .map((o) => `<p class="contactline"><strong>${esc(o.city)}</strong><span>${esc(o.lines.join(', '))}</span><span>${esc(o.phone)}</span></p>`)
        .join('')}
      <p class="fine">Visits by appointment — we are out with groups on most Fridays.</p>
    </div>
  </div>
  <h2 class="h-section">Before you ask</h2>
  <div class="twocol">
    ${faqs.slice(0, 6).map((f) => `<details class="qa"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
  </div>
</div></section>`;
  return R.layout({
    title: 'Contact ' + config.brand.name + ' — phone, WhatsApp & email',
    description: `Call ${config.contact.phoneDisplay}, WhatsApp ${config.contact.whatsappDisplay}, or email ${config.contact.email}. Marrakech desk answered 08:00–20:00 CET, and 24/7 while you travel.`,
    path: '/contact',
    active: 'contact',
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact ' + config.brand.name,
      url: R.abs('/contact'),
    },
  });
}

/* ---------------------------------------------------------------------- faq */

function faqPage() {
  const body = `
${R.pageHero({
  kicker: 'FAQ',
  title: 'Everything travellers ask before paying the deposit',
  lead: 'Prices, group rules, the 25% deposit, cancellation, insurance, Ramadan, dietary needs and how the AI assistant works. If your question is not here, the chat widget in the corner can read our whole published catalogue.',
  image: '/assets/img/riad-courtyard.jpg',
  imageAlt: 'Riad courtyard',
  crumbs: [{ href: '/', label: 'Home' }, { label: 'FAQ' }],
})}
<section class="band band--tight"><div class="shell shell--narrow">
  <div class="faqlist">
    ${faqs
      .map(
        (f, i) => `<details class="qa qa--lg"${i === 0 ? ' open' : ''} id="q${i}">
      <summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`
      )
      .join('')}
  </div>
  <p class="fine">Policy detail lives in the <a href="/booking-conditions">Booking Conditions</a>, <a href="/privacy-policy">Privacy Policy</a> and <a href="/legal-terms">Legal Terms</a>.</p>
</div></section>
${R.ctaBand({
  kicker: 'Still unclear?',
  title: 'Ask the assistant, or ask a designer',
  copy: `The AI assistant prices any journey on this site in seconds and hands over to a human whenever certainty matters. Or call ${config.contact.phoneDisplay}.`,
  primary: { label: 'Open the booking form', href: '/book' },
  secondary: { label: 'WhatsApp ' + config.contact.whatsappDisplay, href: R.chatWaHref() },
  image: '/assets/img/desert-camp-luxury.jpg',
})}`;
  return R.layout({
    title: 'FAQ — deposits, prices, groups & policies | ' + config.brand.name,
    description:
      'Answers on the 25% deposit, luxury prices from $6,000 per person, group bands of $2,000–$4,000, cancellation, insurance, visas, safety and the AI assistant.',
    path: '/faq',
    active: 'about',
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  });
}

/* -------------------------------------------------------------------- legal */

function legalDoc(doc) {
  const renderSection = (s) => {
    let inner = '';
    if (s.paragraphs) inner += s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
    if (s.list) inner += `<ul class="ticks">${s.list.map((l) => `<li>${R.ICON.check}<span>${esc(l)}</span></li>`).join('')}</ul>`;
    if (s.table) {
      inner += `<table class="ltable">${
        s.table.caption ? `<caption>${esc(s.table.caption)}</caption>` : ''
      }<thead><tr>${s.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${s.table.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`;
    }
    return `<section class="lsec" id="${attr(s.id)}"><h2>${esc(s.heading)}</h2>${inner}</section>`;
  };

  const body = `
<section class="lpage">
  <div class="shell shell--narrow">
    ${R.breadcrumb([{ href: '/', label: 'Home' }, { label: doc.title }])}
    <p class="eyebrow">Legal · last revised ${esc(doc.updated)}</p>
    <h1 class="lpage__title">${esc(doc.title)}</h1>
    <p class="phero__lead">${esc(doc.subtitle)}</p>
    <div class="ltoc">
      <p class="fine"><strong>In this document</strong></p>
      <ol>${doc.sections.map((s) => `<li><a href="#${attr(s.id)}">${esc(s.heading)}</a></li>`).join('')}</ol>
    </div>
    <p class="lede">${esc(doc.intro)}</p>
    ${doc.sections.map(renderSection).join('')}
    ${doc.rightsIntro ? `<p class="lede">${esc(doc.rightsIntro)}</p>` : ''}
    <div class="lfoot">
      <p class="fine">Questions about this document: ${esc(config.contact.email)} or call ${esc(config.contact.phoneDisplay)}. ${
        doc.slug === 'privacy-policy'
          ? 'To exercise a right, email ' + config.contact.privacyEmail + '.'
          : 'Written quotations and Booking Confirmations take precedence over anything on this page.'
      }</p>
      <p class="fine">This document is provided for information about our services and is not legal advice.</p>
      <a class="btn btn--line" href="/booking-conditions">Booking conditions</a>
      <a class="btn btn--line" href="/privacy-policy">Privacy policy</a>
      <a class="btn btn--line" href="/legal-terms">Legal terms</a>
      <a class="btn btn--line" href="/sitemap">Sitemap</a>
    </div>
  </div>
</section>`;

  return R.layout({
    title: doc.title + ' | ' + config.brand.name,
    description: doc.subtitle,
    path: '/' + doc.slug,
    body,
    robots: 'index, follow',
  });
}

/* ------------------------------------------------------------------ 404 */

function notFound() {
  const body = `
<section class="band band--err">
  <div class="shell shell--narrow">
    <p class="eyebrow">404 — this route does not exist</p>
    <h1>The path you wanted has been re-sanded.</h1>
    <p class="lede">Nothing in Morocco is lost, only slightly further than expected. Try the journeys index, or ask the assistant in the corner — it can price any trip we sell.</p>
    <div class="cta-row">
      <a class="btn btn--solid" href="/journeys">All journeys</a>
      <a class="btn btn--line" href="/book">Start a booking</a>
      <a class="btn btn--line" href="/sitemap">Sitemap</a>
    </div>
    <div class="jgrid jgrid--3" style="margin-top:2.5rem">${journeys.slice(0, 3).map((j) => R.journeyCard(j)).join('')}</div>
  </div>
</section>`;
  return R.layout({
    title: 'Page not found | ' + config.brand.name,
    description: 'Page not found. Browse journeys, destinations and our booking form.',
    path: '/404',
    body,
    robots: 'noindex, follow',
  });
}

module.exports = { destinationsIndex, destinationDetail, whenToGo, aboutPage, contactPage, faqPage, legalDoc, notFound, bookingConditions, privacyPolicy, legalTerms };
