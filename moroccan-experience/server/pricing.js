'use strict';

/**
 * Pricing engine — the only place a number ever becomes money.
 *
 * Rules (mirroring what the marketing site promises):
 *  - Luxury tours: from $6,000 per person for 7 days -> $857.14pp/night, tiered up.
 *  - Private tours: day rate per person, based on two travellers sharing.
 *  - Group tours (10–30): $4,000pp at 10 travellers, minus $100pp per extra
 *    traveller, floor $2,000pp — always scaled by the number of nights, so the
 *    client-facing band stays "from $2,000 to $4,000 per person / 7 days".
 *  - Bespoke: indicative day rate, quote-only.
 *  - Deposit: 25% of the trip total. Balance 60 days before departure.
 *
 * All functions are pure so they can be unit tested and reused by the checkout
 * API (authoritative) and the browser form (preview only).
 */

const config = require('./config');

const round50 = (n) => Math.round(n / 50) * 50;
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

function getJourney(journeys, slug) {
  return journeys.find((j) => j.slug === slug) || null;
}

/** Per-person, per-night rate before group-size effects. */
function baseDayRate(journey) {
  const c = config.commercial;
  if (journey.dayRate) return journey.dayRate;
  switch (journey.type) {
    case 'luxury':
      return c.luxuryDayRate * (journey.tier || 1);
    case 'private':
      return c.privateDayRate * (journey.tier || 1);
    case 'bespoke':
      return (c.priceBands.bespoke.from / 7) * (journey.tier || 1);
    case 'group':
      return (c.groupLadder.basePP / c.groupLadder.referenceNights) * (journey.tier || 1);
    default:
      return c.privateDayRate;
  }
}

/** Head-line "from" price shown on cards, per person, for the journey's nights. */
function priceFromPerPerson(journey) {
  const c = config.commercial;
  if (journey.priceFrom) return journey.priceFrom;
  const nights = Math.max(1, journey.nights || 1);
  if (journey.type === 'group') return round50(c.priceBands.group.to * (nights / c.groupLadder.referenceNights));
  if (journey.type === 'luxury') return round50(c.luxuryDayRate * nights * (journey.tier || 1));
  return round50(baseDayRate(journey) * nights);
}

/** High-end of the band (smallest permitted group / most exclusive room count). */
function priceToPerPerson(journey) {
  const c = config.commercial;
  const nights = Math.max(1, journey.nights || 1);
  if (journey.type === 'group') {
    const bandMax = c.priceBands.group.to * (nights / c.groupLadder.referenceNights);
    return round50(Math.min(bandMax, c.priceBands.group.to * (nights / c.groupLadder.referenceNights)));
  }
  if (journey.type === 'luxury') return round50(c.luxuryDayRate * nights * (journey.tier || 1) * 1.35);
  if (journey.type === 'private') return round50(baseDayRate(journey) * nights * 1.5);
  return round50(baseDayRate(journey) * nights * 1.8);
}

/** The advertised group band, scaled to a journey's own length. */
function groupBand(journey, nights) {
  const ladder = config.commercial.groupLadder;
  const L = clamp((nights || ladder.referenceNights) / ladder.referenceNights, 0.5, 3);
  return { min: round50(ladder.floorPP * L), max: round50(ladder.basePP * L) };
}

/**
 * Group price per person: bigger groups cost less per head, floored at $2,000
 * for a 7-day trip, and never allowed above the $4,000 headline ceiling.
 */
function groupPricePerPerson(journey, travellers, nights) {
  const c = config.commercial;
  const ladder = c.groupLadder;
  const L = clamp(nights / ladder.referenceNights, 0.5, 3);
  const scaled = (n) => Math.round(n * L);

  const size = clamp(Math.round(travellers), c.groupMinTravellers, c.groupMaxTravellers);
  const discount = (size - c.groupMinTravellers) * ladder.stepPP;
  let pp = ladder.basePP - discount;
  pp = Math.max(pp, ladder.floorPP);
  // Comfort tier of the specific group product (students < standard < women's retreat).
  pp = pp * (journey.tier || 1);
  // Keep every group product inside the advertised $2,000–$4,000 / 7-day band.
  pp = clamp(pp, ladder.floorPP, ladder.basePP);
  return round50(scaled(pp));
}

function perPersonRate(journey, quote) {
  const c = config.commercial;
  const nights = quote.nights;
  if (journey.type === 'group') return groupPricePerPerson(journey, quote.travellers, nights);
  const rate = baseDayRate(journey);
  let pp = rate * nights;
  // Private/luxury: sharing a room means one room between two, so 2 pax is cheapest pp.
  if (journey.type !== 'bespoke') {
    if (quote.travellers === 1) pp *= 1.45;
    else if (quote.travellers >= 6) pp *= 1.08; // more rooms, more guides
    else if (quote.travellers >= 4) pp *= 1.04;
  } else if (quote.travellers >= 2) {
    pp *= 1 - Math.min(0.12, (quote.travellers - 2) * 0.02);
  }
  // Shoulder / low season leverage.
  pp *= seasonMultiplier(quote.month);
  return round50(pp);
}

const SEASONS = {
  1: 0.9, 2: 0.92, 3: 1, 4: 1.05, 5: 1.02, 6: 0.95,
  7: 1.06, 8: 1.08, 9: 0.96, 10: 1.04, 11: 0.98, 12: 1.12,
};

function seasonMultiplier(month) {
  const m = Number(month);
  if (!m || Number.isNaN(m)) return 1;
  return SEASONS[clamp(Math.round(m), 1, 12)] || 1;
}

const EXTRAS = {
  desert_camp_upgrade: {
    label: 'Private luxury desert camp (suite + butler)',
    unit: 'per room / night',
    mode: 'perRoomNight',
    price: 320,
  },
  hot_air_balloon: { label: 'Sunrise hot-air balloon over the palms', unit: 'per person', mode: 'perPerson', price: 265 },
  hammam_spa: { label: 'Private hammam & spa afternoons', unit: 'per person', mode: 'perPerson', price: 140 },
  photography_guide: { label: 'Dedicated photographer-guide (half days)', unit: 'per person', mode: 'perPerson', price: 190 },
  cooking_atelier: { label: 'Market-to-tagine cooking atelier with a family chef', unit: 'per person', mode: 'perPerson', price: 120 },
  domestic_flight: { label: 'Domestic flight Dakhla / Marrakech (business)', unit: 'per person', mode: 'perPerson', price: 480 },
  '4x4_convoy': { label: 'Second 4x4 with convoy leader for deep-desert nights', unit: 'per vehicle / day', mode: 'perVehicleDay', price: 240 },
  camel_caravan: { label: 'Private camel caravan & Berber musician dinner', unit: 'per group', mode: 'flat', price: 900 },
  luggage_logistics: { label: 'Luggage forwarding & mule support on treks', unit: 'per person', mode: 'perPerson', price: 95 },
  visa_letter: { label: 'Invitation letter & visa support pack', unit: 'per group', mode: 'flat', price: 0 },
  airport_fast_track: { label: 'Airport fast-track & private arrivals host', unit: 'per person', mode: 'perPerson', price: 65 },
  wellness_kit: { label: 'Senior comfort kit (compression pillows, stair-free rooms, physio on call)', unit: 'per person', mode: 'perPerson', price: 110 },
  field_scholar: { label: 'Resident academic / field scholar for student groups', unit: 'per group / day', mode: 'perGroupDay', price: 340 },
  carbon_offset: { label: 'Atlas reforestation carbon offset', unit: 'per person', mode: 'perPerson', price: config.commercial.offsetPerPerson },
};

const ROOM_MODES = {
  shared: { label: 'Two sharing (twin or double)', factor: 1 },
  single: { label: 'Single room, private throughout', factor: 1 },
  suite: { label: 'Suite or family room', factor: 1.35 },
};

function listExtras(journey) {
  const keys = journey.extras && journey.extras.length ? journey.extras : Object.keys(EXTRAS);
  return keys
    .filter((k) => EXTRAS[k])
    .map((k) => ({
      key: k,
      label: EXTRAS[k].label,
      unit: EXTRAS[k].unit,
      price:
        k === 'visa_letter'
          ? 0
          : round50(EXTRAS[k].mode === 'flat' ? EXTRAS[k].price : EXTRAS[k].price),
      mode: EXTRAS[k].mode,
    }));
}

function extraCost(key, q) {
  const def = EXTRAS[key];
  if (!def) return 0;
  switch (def.mode) {
    case 'perPerson':
      return def.price * q.travellers;
    case 'perRoomNight':
      return def.price * q.rooms * q.nights;
    case 'perVehicleDay':
      return def.price * Math.max(1, Math.round(q.travellers / 4)) * q.nights;
    case 'perGroupDay':
      return def.price * q.nights;
    case 'flat':
    default:
      return def.price;
  }
}

/**
 * Authoritative quote. `input` comes from the browser but nothing here trusts it:
 * nights, travellers and the deposit are re-derived from server-side data.
 */
function quote(journey, input = {}) {
  const c = config.commercial;
  const isGroup = journey.type === 'group';
  const minPax = isGroup ? c.groupMinTravellers : 1;
  const maxPax = isGroup ? c.groupMaxTravellers : journey.maxTravellers || 14;

  const travellers = clamp(Math.round(num(input.travellers, minPax)), minPax, maxPax);
  const nights = clamp(Math.round(num(input.nights, journey.nights || 7)), journey.minNights || 3, journey.maxNights || 21);
  const month = input.month ? clamp(Math.round(num(input.month, 0)), 1, 12) : null;

  let pp = perPersonRate(journey, { travellers, nights, month });
  // Guard rails that keep every published promise true on every journey:
  // luxury never falls below the $6,000 / 7-night headline, groups never leave
  // the $2,000–$4,000 per 7 days band once scaled back to a week.
  if (journey.type === 'luxury') pp = Math.max(pp, round50(c.luxuryDayRate * nights));
  if (journey.type === 'group') {
    const band = groupBand(journey, nights);
    pp = clamp(pp, band.min, band.max);
  }
  let tripSubtotal = pp * travellers;

  // Room configuration
  const roomMode = ROOM_MODES[input.roomMode] ? input.roomMode : 'shared';
  const rooms = Math.ceil(travellers / 2);
  // Single occupancy: everyone needs a room of their own. An odd-sized party
  // already implies one single room, so that traveller pays no supplement.
  const singleRooms = travellers - (travellers % 2 === 1 ? 1 : travellers % 2 === 0 ? 0 : 0);
  let singleSupplement = 0;
  if (roomMode === 'single') {
    singleSupplement = c.singleSupplementPerNight * nights * Math.max(0, singleRooms - (travellers % 2 === 1 ? 1 : 0));
  }
  let suiteUpgrade = 0;
  if (roomMode === 'suite') suiteUpgrade = Math.round(tripSubtotal * (ROOM_MODES.suite.factor - 1));

  // Extras
  const extras = [];
  const chosen = Array.isArray(input.extras) ? input.extras.filter((k) => EXTRAS[k]) : [];
  for (const key of chosen) {
    const cost = extraCost(key, { travellers, nights, rooms });
    if (cost > 0) extras.push({ key, label: EXTRAS[key].label, unit: EXTRAS[key].unit, amount: cost });
  }
  const extrasTotal = extras.reduce((s, e) => s + e.amount, 0);

  // Group leader policy: one leader free of charge per ten full-paying travellers.
  const leadersFree = isGroup ? Math.floor(travellers / 10) : 0;
  const leaderCredit = leadersFree ? -pp * leadersFree : 0;

  // Insurance
  const wantInsurance = !!input.insurance;
  let insurance = 0;
  if (wantInsurance) {
    insurance = Math.min(c.insuranceCap * travellers, Math.round(((tripSubtotal + extrasTotal + leaderCredit) * c.insuranceRatePercent) / 100));
  }


  const loyaltyDiscount = 0; // group volume is already expressed in the per-person ladder

  const adjustments = [
    { key: 'singleSupplement', label: 'Single occupancy supplement', amount: singleSupplement },
    { key: 'suite', label: 'Suite / family room configuration', amount: suiteUpgrade },
    { key: 'leaders', label: `Leaders free of charge (${leadersFree} place${leadersFree === 1 ? '' : 's'})`, amount: leaderCredit },
    { key: 'volume', label: 'Large group courtesy discount', amount: loyaltyDiscount },
    { key: 'insurance', label: 'Comprehensive travel & cancellation insurance', amount: insurance },
  ].filter((a) => a.amount);

  const total = Math.max(0, tripSubtotal + extrasTotal + adjustments.reduce((s, a) => s + a.amount, 0));

  // Group leader places are free, so the honest per-person figure is per *paying* traveller.
  const payingTravellers = Math.max(1, travellers - leadersFree);
  const perPersonTotal = Math.round(total / payingTravellers);
  const depositPercent = c.depositPercent;
  const deposit = Math.round(total * (depositPercent / 100) * 100) / 100;
  const balance = Math.round((total - deposit) * 100) / 100;

  return {
    journeySlug: journey.slug,
    journeyTitle: journey.title,
    type: journey.type,
    audience: journey.audience || null,
    nights,
    days: nights + 1,
    travellers,
    payingTravellers,
    month,
    roomMode,
    perPerson: pp,
    perPersonTotal,
    tripSubtotal,
    extras,
    extrasTotal,
    adjustments,
    total,
    depositPercent,
    deposit,
    balance,
    leadersFree,
    currency: c.currency,
    breakdown: buildBreakdown({ tripSubtotal, extrasTotal, adjustments, total, deposit, balance, depositPercent }),
    notes: notesFor(journey, { travellers, nights, isGroup, month }),
    minTravellers: minPax,
    maxTravellers: maxPax,
  };
}

function buildBreakdown({ tripSubtotal, extrasTotal, adjustments, total, deposit, balance, depositPercent }) {
  const rows = [{ label: 'Trip cost (all travellers)', amount: tripSubtotal, kind: 'charge' }];
  if (extrasTotal) rows.push({ label: 'Selected experiences', amount: extrasTotal, kind: 'charge' });
  for (const a of adjustments) rows.push({ label: a.label, amount: a.amount, kind: a.amount < 0 ? 'credit' : 'charge' });
  rows.push({ label: 'Trip total', amount: total, kind: 'total' });
  rows.push({ label: `Deposit due today (${depositPercent}%)`, amount: deposit, kind: 'deposit' });
  rows.push({ label: `Balance due ${config.commercial.balanceDueDaysBefore} days before departure (${100 - depositPercent}%)`, amount: balance, kind: 'balance' });
  return rows;
}

function notesFor(journey, ctx) {
  const c = config.commercial;
  const notes = [
    `${c.taxNote}`,
    'Prices include private guide, vehicle and driver, accommodation as listed, breakfast daily and the meals described in the itinerary.',
    `A ${c.depositPercent}% deposit secures your reservation and held inventory; the balance falls due ${c.balanceDueDaysBefore} days before departure.`,
  ];
  if (ctx.isGroup) {
    notes.push(
      `Group journeys run with 10 to 30 travellers. One leader travels free of charge for every ten full-paying travellers, and final names replace provisional ones free of charge up to 45 days before departure.`
    );
    if (journey.audience === 'women') notes.push('This departure is women-only: all guides, drivers and camp staff on this journey are women.');
    if (journey.audience === 'students') notes.push('Student groups receive a 12-month instalment plan, safeguarding documentation and an academic reference pack at no extra cost.');
    if (journey.audience === 'seniors') notes.push('Senior departures are paced at 3–4 hours of transfer maximum per day with step-free rooms and a doctor-on-call agreement.');
  }
  if (journey.type === 'bespoke') notes.push('This is an indicative figure: bespoke journeys are quoted line by line once your brief and dates are confirmed.');
  return notes;
}

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/** Deposit-inclusive cancellation charge estimate for a departure date. */
function cancellationEstimate(total, daysBeforeDeparture) {
  const schedule = config.commercial.cancellationSchedule;
  const tier = schedule.find((t) => daysBeforeDeparture >= t.from && (t.to === null || daysBeforeDeparture <= t.to)) || schedule[schedule.length - 1];
  const charge = Math.round((total * tier.charge) / 100);
  return { tier, charge, refundable: Math.max(0, total - charge) };
}

function reference(existing = []) {
  const year = new Date().getFullYear().toString().slice(2);
  let ref;
  do {
    ref = `MX-${year}-${Math.floor(Math.random() * 90000 + 10000)}`;
  } while (existing.includes(ref));
  return ref;
}

module.exports = {
  quote,
  groupBand,
  priceFromPerPerson,
  priceToPerPerson,
  groupPricePerPerson,
  baseDayRate,
  listExtras,
  EXTRAS,
  ROOM_MODES,
  getJourney,
  cancellationEstimate,
  seasonMultiplier,
  reference,
  round50,
};
