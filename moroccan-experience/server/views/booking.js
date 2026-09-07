'use strict';

const R = require('../render');
const config = require('../config');
const pricing = require('../pricing');
const { journeys } = require('../content/journeys');
const { destinations } = require('../content/destinations');

const esc = R.esc;
const attr = R.attr;
const money = R.money;
const c = config.commercial;

function journeyOptions(selected) {
  return ['luxury', 'private', 'bespoke', 'group']
    .map((type) => {
      const items = journeys.filter((j) => j.type === type);
      if (!items.length) return '';
      return `<optgroup label="${R.titleCase(type)} journeys">
        ${items
          .map(
            (j) =>
              `<option value="${j.slug}"${selected === j.slug ? ' selected' : ''}>${esc(j.title)} — ${j.nights} nights, ${money(
                pricing.priceFromPerPerson(j)
              )}pp</option>`
          )
          .join('')}
      </optgroup>`;
    })
    .join('');
}

function bookingPage(journey, params) {
  const isGroup = journey && journey.type === 'group';
  const pax = Math.min(Math.max(Number(params.get('pax')) || (isGroup ? 12 : 2), isGroup ? 10 : 1), isGroup ? 30 : journey ? journey.maxTravellers || 12 : 12);
  const nights = journey ? Math.min(Math.max(Number(params.get('nights')) || journey.nights, journey.minNights || 3), journey.maxNights || 21) : 7;
  const q = journey ? pricing.quote(journey, { travellers: pax, nights, month: params.get('month') || null, roomMode: 'shared' }) : null;

  const body = `
<section class="bhero" style="--hero-img:url('${R.img(journey ? journey.heroImage : '/assets/img/kasbah-sunset.jpg')}')">
  <img class="bhero__img" src="${R.img(journey ? journey.heroImage : '/assets/img/kasbah-sunset.jpg')}" alt="" aria-hidden="true">
  <div class="shell bhero__inner">
    ${R.breadcrumb([{ href: '/', label: 'Home' }, { href: '/book', label: 'Booking' }, ...(journey ? [{ label: journey.title }] : [])])}
    <p class="eyebrow eyebrow--light">Booking & quotation · ${c.depositPercent}% deposit with Stripe</p>
    <h1>${journey ? esc(journey.title) : 'Plan your Morocco journey'}</h1>
    <p class="phero__lead">${
      journey
        ? esc(journey.lead)
        : 'Pick a journey — or describe your own. You get an indicative price instantly, a written quotation from a named designer inside one working day, and nothing is charged until you accept.'
    }</p>
  </div>
</section>

<section class="band band--tight band--booking">
  <div class="shell">
    <form class="bform" id="bookingForm" data-booking-form data-journey="${journey ? journey.slug : ''}" novalidate>
      <ol class="bsteps" id="bsteps" aria-label="Booking steps">
        <li class="is-active"><button type="button" class="bstep" data-step="1"><span>1</span>Journey &amp; dates</button></li>
        <li><button type="button" class="bstep" data-step="2"><span>2</span>Travellers</button></li>
        <li><button type="button" class="bstep" data-step="3"><span>3</span>Experiences</button></li>
        <li><button type="button" class="bstep" data-step="4"><span>4</span>Your details</button></li>
        <li><button type="button" class="bstep" data-step="5"><span>5</span>Deposit &amp; pay</button></li>
      </ol>

      <!-- STEP 1 -->
      <fieldset class="bpanel is-active" data-panel="1">
        <legend class="bpanel__title">Which journey, and when</legend>
        <div class="grid2">
          <label class="fld"><span>Journey ${esc(isGroup ? '' : '(choose one, or describe yours below)')}</span>
            <select name="journey" data-bf-journey required>${journeyOptions(journey ? journey.slug : '')}</select>
          </label>
          <label class="fld"><span>Nights</span>
            <input type="number" name="nights" min="${journey ? journey.minNights || 3 : 3}" max="${journey ? journey.maxNights || 21 : 21}" value="${nights}" data-bf-nights required>
          </label>
          <label class="fld"><span>Departure month</span>
            <select name="month" data-bf-month>
              <option value="">Not fixed yet</option>
              ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                .map((m, i) => `<option value="${i + 1}"${Number(params.get('month')) === i + 1 ? ' selected' : ''}>${m}${journey && journey.bestMonths.includes(i + 1) ? ' — recommended' : ''}</option>`)
                .join('')}
            </select>
          </label>
          <label class="fld"><span>Exact departure date, if you have one</span>
            <input type="date" name="departure" min="${new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10)}" data-bf-departure>
          </label>
          <label class="fld fld--full"><span>${isGroup ? 'Fixed departure, or private dates for your group?' : 'Anything we should know about the route?'}</span>
            ${
              isGroup
                ? `<div class="radios">
            <label><input type="radio" name="groupStyle" value="fixed" checked> Join the published departure (${(journey.departures || []).map((d) => d.date).join(', ') || 'dates on request'})</label>
            <label><input type="radio" name="groupStyle" value="private"> Private dates for our own group</label>
            <label><input type="radio" name="groupStyle" value="quote"> Price both and let us decide</label>
          </div>`
                : `<textarea name="routeNotes" rows="3" placeholder="Two nights in the Atlas instead of Fes, a hammam on the last day, no long drives…"></textarea>`
            }
          </label>
        </div>
        ${
          journey
            ? `<div class="note note--info"><strong>Best months for this journey:</strong> ${journey.bestMonths
                .map((m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1])
                .join(' · ')}. <span data-bf-monthhint></span></div>`
            : ''
        }
      </fieldset>

      <!-- STEP 2 -->
      <fieldset class="bpanel" data-panel="2">
        <legend class="bpanel__title">Who is travelling</legend>
        <div class="grid2">
          <label class="fld"><span>${isGroup ? 'Group size (10–30 travellers)' : 'Adults'}
            <input type="number" name="travellers" min="${isGroup ? 10 : 1}" max="${isGroup ? 30 : journey ? journey.maxTravellers || 12 : 12}" value="${pax}" data-bf-pax required>
          </span></label>
          <label class="fld"><span>Under-18s in the party</span><input type="number" name="minors" min="0" max="20" value="0"></label>
          <label class="fld"><span>Rooms</span>
            <select name="roomMode" data-bf-room>
              ${Object.entries(pricing.ROOM_MODES)
                .map(([k, v]) => `<option value="${k}"${k === 'shared' ? ' selected' : ''}>${esc(v.label)}</option>`)
                .join('')}
            </select>
          </label>
          <label class="fld"><span>Language of guiding</span>
            <select name="language"><option>English</option><option>French</option><option>Arabic</option><option>Spanish</option><option>German</option></select>
          </label>
        </div>
        ${
          isGroup
            ? `<div class="note note--group">
            <strong>Group terms.</strong> ${c.groupMinTravellers}–${c.groupMaxTravellers} travellers; one leader free per ten full-paying travellers; provisional names replaced free until 45 days before departure.
            ${
              journey.audience === 'students'
                ? 'Student cohorts: tell us your discipline and we will include the field notebook, safeguarding pack and an instalment plan.'
                : journey.audience === 'seniors'
                ? 'Senior departures: step-free rooms are confirmed with each property before you pay — add any mobility detail in step 4.'
                : 'Women-only departures: crew, drivers and camp staff are all women; solidarity-rate places are allocated by a partner association.'
            }
          </div>`
            : ''
        }
        <fieldset class="travellerset">
          <legend>Traveller names (as in the passport)</legend>
          <div class="grid2" data-bf-travellers>
            ${Array.from({ length: Math.min(isGroup ? 4 : 2, isGroup ? 4 : 2) })
              .map(
                (_, i) => `<label class="fld"><span>${i === 0 ? 'Lead traveller' : 'Traveller ' + (i + 1)}</span>
              <input type="text" name="traveller${i}" placeholder="${i === 0 ? 'Family name, given names' : 'Full legal name'}" ${i === 0 ? 'required' : ''} autocomplete="section-detail name">
            </label>`
              )
              .join('')}
          </div>
          <p class="fine">${isGroup ? 'Add the remaining names after the deposit — final names are free of charge until 45 days before departure.' : 'Names must match the passport exactly; a misspelling is a reissue, not an edit.'}</p>
        </fieldset>
      </fieldset>

      <!-- STEP 3 -->
      <fieldset class="bpanel" data-panel="3">
        <legend class="bpanel__title">Add experiences</legend>
        <p class="fine">Optional, priced per unit. Each one is checked with suppliers before the deposit is taken; if a supplier cannot do it, we tell you and remove it from the total.</p>
        <div class="extras">
          ${(journey ? pricing.listExtras(journey) : [])
            .map(
              (x) => `<label class="xtra">
        <input type="checkbox" name="extras" value="${x.key}" data-bf-extra>
        <span class="xtra__box"></span>
        <span class="xtra__text"><strong>${esc(x.label)}</strong><em>${esc(x.unit)}</em></span>
        <span class="xtra__price">${x.price ? money(x.price) : 'Free'}</span>
      </label>`
            )
            .join('')}
        </div>
        <div class="grid2">
          <label class="chk"><input type="checkbox" name="insurance" value="1" data-bf-insurance> <span>Comprehensive travel &amp; cancellation insurance (${c.insuranceRatePercent}% of trip total, capped at ${money(
              c.insuranceCap
            )}pp)</span></label>
          <p class="fine chk-note">We require insurance for every booking. Decline here only if you are covering it yourself — we will ask for the policy reference before departure.</p>
        </div>
      </fieldset>

      <!-- STEP 4 -->
      <fieldset class="bpanel" data-panel="4">
        <legend class="bpanel__title">How to reach you</legend>
        <div class="grid2">
          <label class="fld"><span>First name</span><input name="firstName" autocomplete="given-name" required></label>
          <label class="fld"><span>Last name</span><input name="lastName" autocomplete="family-name" required></label>
          <label class="fld"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
          <label class="fld"><span>Phone or WhatsApp</span><input type="tel" name="phone" autocomplete="tel" placeholder="+212 6 00 00 00 00" required></label>
          <label class="fld"><span>Country of residence</span><input name="country" autocomplete="country-name" placeholder="United Kingdom"></label>
          <label class="fld"><span>Flight arrival city</span>
            <select name="airport"><option>Marrakech (RAK)</option><option>Casablanca (CMN)</option><option>Agadir (AGA)</option><option>Fes (FEZ)</option><option>Tangier (TNG)</option><option>Other / not booked yet</option></select>
          </label>
        </div>
        <div class="grid2">
          <label class="fld fld--full"><span>Access, health and dietary requirements</span>
            <textarea name="access" rows="3" placeholder="Step-free rooms, allergens, vegetarian, a walking frame, medication we should know about…"></textarea>
          </label>
          <label class="fld fld--full"><span>Anything else — celebrations, pace, budgets, pet peeves</span>
            <textarea name="notes" rows="3" placeholder="We are a couple who hate coach departures; please keep drives under four hours."></textarea>
          </label>
        </div>
        <div class="consents">
          <label class="chk chk--req"><input type="checkbox" name="agreeTerms" required> <span>I have read and accept the <a href="/booking-conditions" target="_blank" rel="noopener">Booking Conditions</a> (including the ${c.depositPercent}% non-refundable deposit and the cancellation schedule) and the <a href="/legal-terms" target="_blank" rel="noopener">Legal Terms</a>.</span></label>
          <label class="chk chk--req"><input type="checkbox" name="agreePrivacy" required> <span>I agree to the <a href="/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>, including processing of passport and health data where needed to deliver the trip.</span></label>
          <label class="chk"><input type="checkbox" name="agreeInsurance" checked> <span>I will hold travel insurance with cancellation and medical cover for the full trip total.</span></label>
          <label class="chk"><input type="checkbox" name="newsletter"> <span>Send travel notes six times a year (optional, unsubscribe in one click).</span></label>
        </div>
      </fieldset>

      <!-- STEP 5 -->
      <fieldset class="bpanel" data-panel="5">
        <legend class="bpanel__title">Review, then the ${c.depositPercent}% deposit</legend>
        <div class="review">
          <div class="review__summary" data-bf-review>
            <p class="fine">Choosing your journey…</p>
          </div>
          <table class="ltable ltable--quote" data-bf-breakdown>
            <caption>Live indicative quote</caption>
            <tbody></tbody>
          </table>
        </div>
        <div class="paybox">
          <p class="paybox__lead">Payment is taken on <strong>Stripe’s secure hosted checkout</strong>. We never see or store your card number, expiry or security code. Your booking is confirmed by a Booking Confirmation issued within 24 hours of cleared funds.</p>
          <div class="paybox__methods" aria-label="Accepted payment methods">
            ${c.paymentMethods.map((m) => `<span class="pm pm--${m.toLowerCase().replace(/[^a-z]/g, '')}">${esc(m)}</span>`).join('')}
          </div>
          <div class="paybox__actions">
            <button class="btn btn--lg btn--solid" type="submit" data-bf-pay>
              <span data-bf-paylabel>Pay the ${money(q ? q.deposit : 0)} deposit &amp; confirm</span>
            </button>
            <button class="btn btn--lg btn--line" type="button" data-bf-quote>Send me a written quotation instead</button>
          </div>
          <p class="fine paybox__small">Choosing “quotation” reserves nothing and charges nothing. The deposit confirms rooms in your name — it is non-refundable but transferable to another date, journey or traveller.</p>
          <div class="paybox__trust">
            <span>Stripe PCI DSS Level 1</span><span>${c.balanceDueDaysBefore}-day balance</span><span>No booking or card fee</span><span>Financial Protection on request</span>
          </div>
          <p class="err" data-bf-error role="alert" hidden></p>
        </div>
      </fieldset>

      <nav class="bnav">
        <button class="btn btn--ghost" type="button" data-bf-back>← Back</button>
        <p class="bnav__price"><span data-bf-depositlabel>${q ? 'Deposit ' + money(q.deposit) : 'Deposit shown at review'}</span></p>
        <button class="btn btn--solid" type="button" data-bf-next>Continue ${R.ICON.arrow}</button>
      </nav>
    </form>

    <div class="bhelp">
      <div class="panel panel--tight">
        <h3>Prefer a human?</h3>
        <p class="fine">The desk answers in four languages, and the AI assistant in the corner can price anything on this site in seconds.</p>
        <a class="btn btn--sm btn--line btn--block" href="${config.contact.phoneHref}">${R.ICON.phone} ${esc(config.contact.phoneDisplay)}</a>
        <a class="btn btn--sm btn--line btn--block" href="${R.chatWaHref(
          encodeURIComponent('Hi — I would like to book ' + (journey ? journey.title : 'a Morocco trip') + '.')
        )}" target="_blank" rel="noopener">${R.ICON.whatsapp} WhatsApp ${esc(config.contact.whatsappDisplay)}</a>
      </div>
      <p class="fine">By submitting you accept our <a href="/privacy-policy">Privacy Policy</a>. Prices shown are indicative; a written quotation binds.</p>
    </div>
  </div>
</section>

<script id="bookingConfig" type="application/json">${JSON.stringify({
    depositPercent: c.depositPercent,
    balanceDays: c.balanceDueDaysBefore,
    groupMin: c.groupMinTravellers,
    groupMax: c.groupMaxTravellers,
    minNights: journey ? journey.minNights || 3 : 3,
    maxNights: journey ? journey.maxNights || 21 : 21,
    isGroup: !!isGroup,
    journey: journey ? journey.slug : '',
  }).replace(/</g, '\\u003c')}</script>`;

  return R.layout({
    title: (journey ? 'Book: ' + journey.title : 'Book a Morocco journey') + ' | ' + config.brand.name,
    description: `Booking and quotation form for ${config.brand.name}. 25% deposit by Stripe, balance ${c.balanceDueDaysBefore} days before departure. Luxury from ${money(c.priceBands.luxury.from)}pp, groups ${money(c.priceBands.group.from)}–${money(c.priceBands.group.to)}pp.`,
    path: '/book' + (journey ? '/' + journey.slug : ''),
    active: 'book',
    body,
    robots: 'noindex, follow',
    bodyClass: 'is-booking',
    scripts: ['<script src="/assets/js/booking.js" defer></script>'],
  });
}

/* ------------------------------------------------------------- confirmation */

function confirmationPage(booking, opts = {}) {
  const q = booking.quote;
  const paid = opts.paid || booking.status === 'deposit_paid';
  const body = `
<section class="band band--confirm">
  <div class="shell shell--narrow">
    <div class="confirm">
      <div class="confirm__mark">${paid ? R.ICON.check : '⏳'}</div>
      <p class="eyebrow">${paid ? 'Deposit received' : 'Awaiting payment'}</p>
      <h1>${paid ? 'Your Morocco journey is held.' : 'Quote saved — finish the deposit when you are ready.'}</h1>
      <p class="lede">Reference <strong>${esc(booking.reference)}</strong>${booking.stripeSessionId ? ` · Stripe session <span class="mono">${esc(String(booking.stripeSessionId).slice(0, 18))}…</span>` : ''}</p>

      <div class="confirm__grid">
        <div class="panel">
          <h3>What happens next</h3>
          <ol class="numlist numlist--tight">
            ${
              paid
                ? `<li>A named designer reviews supplier availability within 4 hours and issues your Booking Confirmation inside 24 hours.</li>
            <li>We send an itinerary draft for revision — changes before the confirmation cost nothing.</li>
            <li>Your ${c.balanceDueDaysBefore}-day balance reminder is scheduled for <strong>${esc(
                    booking.balanceDueDate || '—'
                  )}</strong>. We will not chase you twice.</li>
            <li>Twenty-one days before departure: document pack, guide photographs, driver and vehicle, packing list, 24/7 number.</li>`
                : `<li>Nothing is charged and nothing is held yet. Reply to the quotation email and a designer builds the priced version.</li>
            <li>When you are ready, pay the ${c.depositPercent}% deposit against reference ${esc(booking.reference)} — the link works for 60 hours.</li>
            <li>Rooms are only bought once the deposit clears.</li>`
            }
          </ol>
        </div>
        <div class="panel panel--money">
          <h3>Money</h3>
          <table class="ltable ltable--mini"><tbody>
            <tr><td>Journey</td><td>${esc(q.journeyTitle)}</td></tr>
            <tr><td>Dates</td><td>${esc(booking.departureDate || 'To be confirmed')} · ${q.nights} nights</td></tr>
            <tr><td>Party</td><td>${q.travellers} traveller${q.travellers === 1 ? '' : 's'}${q.leadersFree ? ` (incl. ${q.leadersFree} leader place${q.leadersFree === 1 ? '' : 's'} free)` : ''}</td></tr>
            <tr><td>Trip total</td><td>${money(q.total)}</td></tr>
            <tr><td>Deposit ${paid ? 'paid' : 'due'}</td><td>${money(q.deposit)}</td></tr>
            <tr><td>${booking.balanceDueImmediately ? 'Balance — due now, you are inside 60 days' : 'Balance, ' + c.balanceDueDaysBefore + ' days before'}</td><td>${money(q.balance)}</td></tr>
          </tbody></table>
          ${
            booking.balanceDueImmediately
              ? `<div class="note note--warn">Your departure is within ${c.balanceDueDaysBefore} days, so the full trip total of ${money(
                  q.total
                )} is payable now. Reply to the confirmation email and we will send a payment link for the balance, or pay it on the same checkout.</div>`
              : ''
          }
          ${
            paid
              ? `<p class="fine">A receipt has been emailed to ${esc(booking.contact.email)}. Refunds, where due, are made to the original card within 10 working days per the <a href="/booking-conditions#cancellations">cancellation schedule</a>.</p>`
              : `<p class="fine">Deposit is 25% of the trip total, taken on Stripe. <a href="/booking-conditions#deposits">Deposit terms</a>.</p>`
          }
        </div>
      </div>

      <div class="confirm__items">
        <h3 class="h-section">What is in the price</h3>
        <ul class="ticks">${q.breakdown.map((row) => `<li>${R.ICON.check}<span>${esc(row.label)} — <strong>${money(row.amount)}</strong></span></li>`).join('')}</ul>
        ${
          q.extras && q.extras.length
            ? `<p class="fine"><strong>Experiences added:</strong> ${q.extras.map((e) => esc(e.label)).join(', ')}.</p>`
            : ''
        }
      </div>

      <div class="cta-row">
        <a class="btn btn--solid" href="/journeys/${esc(q.journeySlug)}">Back to the journey</a>
        <a class="btn btn--line" href="/my-booking?ref=${esc(booking.reference)}">Track this booking</a>
        <a class="btn btn--line" href="${R.chatWaHref(encodeURIComponent('Booking ' + booking.reference + ' — I have a question:'))}" target="_blank" rel="noopener">${R.ICON.whatsapp} Message us</a>
        <a class="btn btn--ghost" href="/booking-conditions">Booking conditions</a>
      </div>
      <p class="fine">Keep this page or the email. Booking questions: ${esc(config.contact.email)} · 24/7 while travelling: ${esc(config.contact.phoneDisplay)}.</p>
    </div>
  </div>
</section>`;
  return R.layout({
    title: `Booking ${booking.reference} | ${config.brand.name}`,
    description: 'Your booking reference and next steps.',
    path: '/booking/confirmation/' + booking.reference,
    body,
    robots: 'noindex, nofollow',
  });
}

/* -------------------------------------------------------------- my booking */

function myBookingPage(booking, query) {
  const q = booking ? booking.quote : null;
  const body = `
<section class="band band--tight">
  <div class="shell shell--narrow">
    <p class="eyebrow">Track a booking</p>
    <h1>Where is my booking up to?</h1>
    <p class="lede">Enter the reference from your confirmation email — it looks like MX-${new Date().getFullYear().toString().slice(2)}-00000. Nothing here is editable; reply to the email or call the desk and a designer will change it for you.</p>
    <form class="refsearch" method="get" action="/my-booking">
      <label class="sr-only" for="ref">Booking reference</label>
      <input id="ref" name="ref" placeholder="MX-26-12345" value="${esc(query || '')}" autocomplete="off" pattern="MX-[0-9]{2}-[0-9]{5}" required>
      <button class="btn btn--solid" type="submit">Look up</button>
    </form>
    ${
      booking
        ? `<div class="panel" style="margin-top:2rem">
      <h3>${esc(booking.reference)} — ${esc(q.journeyTitle)}</h3>
      <table class="ltable ltable--mini"><tbody>
        <tr><td>Status</td><td><strong>${esc(booking.status.replace(/_/g, ' '))}</strong></td></tr>
        <tr><td>Created</td><td>${esc(new Date(booking.createdAt).toUTCString().slice(5, 16))}</td></tr>
        <tr><td>Departure</td><td>${esc(booking.departureDate || 'To be confirmed')} · ${q.nights} nights</td></tr>
        <tr><td>Party</td><td>${q.travellers} traveller${q.travellers === 1 ? '' : 's'}</td></tr>
        <tr><td>Trip total</td><td>${money(q.total)}</td></tr>
        <tr><td>Deposit (${c.depositPercent}%)</td><td>${booking.status === 'deposit_paid' ? 'Paid ' + money(q.deposit) : 'Due ' + money(q.deposit)}</td></tr>
        <tr><td>Balance</td><td>${money(q.balance)} by ${esc(booking.balanceDueDate || '—')}</td></tr>
        ${booking.invoiceUrl ? `<tr><td>Receipt</td><td><a href="${esc(
            booking.invoiceUrl
          )}" target="_blank" rel="noopener">Stripe receipt</a></td></tr>` : ''}
      </tbody></table>
      ${
        booking.status === 'quote' || booking.status === 'pending_payment'
          ? `<a class="btn btn--solid" href="/book/${esc(q.journeySlug)}?reference=${esc(booking.reference)}">Continue to payment</a>`
          : ''
      }
    </div>`
        : query
        ? `<div class="note note--warn" style="margin-top:2rem"><strong>We could not find that reference.</strong> Check the email (and the spam folder) or call ${esc(config.contact.phoneDisplay)}.</div>`
        : ''
    }
  </div>
</section>`;
  return R.layout({
    title: 'Track a booking | ' + config.brand.name,
    description: 'Look up your booking status, deposit and balance due date with your reference.',
    path: '/my-booking',
    body,
    robots: 'noindex, nofollow',
  });
}

/* --------------------------------------------------- demo hosted checkout */

function demoCheckoutPage(booking) {
  const q = booking.quote;
  const body = `
<section class="band band--demo">
  <div class="shell shell--narrow">
    <div class="demo">
      <header class="demo__head">
        <div>
          <p class="eyebrow">Hosted checkout · DEMO</p>
          <h1>Confirm the ${c.depositPercent}% deposit</h1>
        </div>
        <span class="demo__badge">No Stripe key configured — no card data is requested or stored</span>
      </header>
      <div class="demo__grid">
        <div>
          <table class="ltable ltable--mini"><tbody>
            <tr><td>Reference</td><td>${esc(booking.reference)}</td></tr>
            <tr><td>Journey</td><td>${esc(q.journeyTitle)}</td></tr>
            <tr><td>Party</td><td>${q.travellers} · ${q.nights} nights</td></tr>
            <tr><td>Trip total</td><td>${money(q.total)}</td></tr>
            <tr><td><strong>Deposit due now</strong></td><td><strong>${money(q.deposit)}</strong></td></tr>
            <tr><td>Balance in ${c.balanceDueDaysBefore} days</td><td>${money(q.balance)}</td></tr>
          </tbody></table>
          <p class="fine">In production this page is replaced by Stripe’s hosted Checkout (Visa, Mastercard, Amex, Apple Pay, Google Pay). The amount is always computed on our servers from the itinerary — never sent by the browser.</p>
        </div>
        <form class="demo__form" method="post" action="/checkout/demo/${esc(booking.reference)}">
          <p class="fine">Clicking confirm creates the Booking Confirmation, marks the deposit as paid in this demo environment, and emails a receipt in production.</p>
          <button class="btn btn--lg btn--solid btn--block" type="submit">Pay ${money(q.deposit)} deposit (demo)</button>
          <a class="btn btn--line btn--block" href="/book/${esc(q.journeySlug)}?reference=${esc(
    booking.reference
  )}">Back to the quote</a>
        </form>
      </div>
    </div>
  </div>
</section>`;
  return R.layout({
    title: 'Confirm deposit (demo) ' + booking.reference + ' | ' + config.brand.name,
    description: 'Demo checkout page used when no Stripe key is configured.',
    path: '/checkout/demo/' + booking.reference,
    body,
    robots: 'noindex, nofollow',
  });
}

/* ------------------------------------------------------------------ sitemap */

function sitemapPage(all) {
  const group = (title, items) => `
  <section class="sm">
    <h2>${esc(title)}</h2>
    <ul>${items
      .map(
        (i) =>
          `<li><a href="${attr(i.loc)}">${esc(i.title)}</a>${i.desc ? `<span>${esc(i.desc)}</span>` : ''}</li>`
      )
      .join('')}</ul>
  </section>`;

  const body = `
<section class="band band--tight">
  <div class="shell">
    <p class="eyebrow">Sitemap</p>
    <h1>Every page on this site</h1>
    <p class="lede">${all.length} URLs. An XML version for search engines is at <a href="/sitemap.xml">/sitemap.xml</a>; robots rules are at <a href="/robots.txt">/robots.txt</a>.</p>
    <div class="smgrid">
      ${group('Plan & book', all.filter((i) => i.group === 'book'))}
      ${group('Journeys', all.filter((i) => i.group === 'journey'))}
      ${group('Ways to travel', all.filter((i) => i.group === 'type'))}
      ${group('Destinations', all.filter((i) => i.group === 'destination'))}
      ${group('Practical', all.filter((i) => i.group === 'info'))}
      ${group('Legal & policies', all.filter((i) => i.group === 'legal'))}
    </div>
  </div>
</section>`;
  return R.layout({
    title: 'Sitemap | ' + config.brand.name,
    description: 'Complete HTML sitemap of every journey, destination, policy and booking page on moroccan-experience.com.',
    path: '/sitemap',
    body,
  });
}

module.exports = { bookingPage, confirmationPage, myBookingPage, demoCheckoutPage, sitemapPage };
