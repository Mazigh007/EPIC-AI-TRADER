'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pricing = require('../server/pricing');
const config = require('../server/config');
const { journeys } = require('../server/content/journeys');

const J = (slug) => journeys.find((j) => j.slug === slug);

test('luxury tours start from $6,000 per person for seven days', () => {
  const lux = journeys.filter((j) => j.type === 'luxury');
  assert.ok(lux.length >= 3, 'expected several luxury journeys');
  const cheapest = Math.min(...lux.map((j) => pricing.quote(j, { travellers: 2, nights: 7 }).perPersonTotal));
  assert.equal(cheapest, 6000, 'the lowest luxury price for 7 nights must be exactly $6,000pp');
  assert.equal(pricing.priceFromPerPerson(J('starlight-sahara-private-luxury')), 6000);
});

test('group tours stay inside the $2,000–$4,000 per person / 7 day band', () => {
  const groups = journeys.filter((j) => j.type === 'group');
  assert.ok(groups.length >= 3);
  for (const j of groups) {
    const band = pricing.groupBand(j, 7);
    assert.deepEqual(band, { min: 2000, max: 4000 }, 'the seven-day band must be exactly $2,000–$4,000');
    for (let size = 10; size <= 30; size++) {
      const q = pricing.quote(j, { travellers: size, nights: j.nights });
      const scaled = pricing.groupBand(j, j.nights);
      const weekly = Math.round((q.perPersonTotal / j.nights) * 7);
      assert.ok(q.perPersonTotal >= scaled.min && q.perPersonTotal <= scaled.max, `${j.slug} at ${size} pax is ${q.perPersonTotal}, outside ${scaled.min}–${scaled.max}`);
      assert.ok(weekly >= band.min - 60 && weekly <= band.max + 60, `${j.slug} at ${size} pax is ${weekly} per week, outside the advertised band`);
    }
  }
});

test('bigger groups cost less per person', () => {
  const j = J('sisters-of-the-medina-and-dunes');
  const small = pricing.quote(j, { travellers: 10, nights: 7 }).perPersonTotal;
  const large = pricing.quote(j, { travellers: 30, nights: 7 }).perPersonTotal;
  assert.ok(large < small, `${large} should be below ${small}`);
});

test('group sizes are clamped to 10–30 and reject anything else', () => {
  const j = J('university-field-lab-morocco');
  assert.equal(pricing.quote(j, { travellers: 4, nights: 9 }).travellers, 10, 'too small clamps to 10');
  assert.equal(pricing.quote(j, { travellers: 99, nights: 9 }).travellers, 30, 'too big clamps to 30');
});

test('deposit is exactly 25% of the trip total', () => {
  for (const j of journeys) {
    const q = pricing.quote(j, { travellers: j.type === 'group' ? 14 : 2, nights: j.nights });
    assert.equal(q.depositPercent, 25);
    assert.ok(Math.abs(q.deposit - q.total * 0.25) < 0.011, `${j.slug}: ${q.deposit} vs ${q.total}`);
    assert.ok(Math.abs(q.deposit + q.balance - q.total) < 0.011, `${j.slug} deposit+balance must equal total`);
  }
});

test('group leader places are free at one per ten travellers', () => {
  const j = J('sisters-of-the-medina-and-dunes');
  assert.equal(pricing.quote(j, { travellers: 10, nights: 7 }).leadersFree, 1);
  assert.equal(pricing.quote(j, { travellers: 29, nights: 7 }).leadersFree, 2);
  assert.equal(pricing.quote(j, { travellers: 30, nights: 7 }).leadersFree, 3);
});

test('nights scale the price and respect per-journey limits', () => {
  const j = J('starlight-sahara-private-luxury');
  const short = pricing.quote(j, { travellers: 2, nights: 7 }).total;
  const long = pricing.quote(j, { travellers: 2, nights: 14 }).total;
  assert.ok(long > short * 1.8, 'doubling nights should roughly double the cost');
  assert.equal(pricing.quote(j, { travellers: 2, nights: 900 }).nights, j.maxNights, 'nights clamp to the journey maximum');
});

test('client-supplied totals are never trusted: only inputs are', () => {
  const j = J('starlight-sahara-private-luxury');
  const honest = pricing.quote(j, { travellers: 2, nights: 7 });
  const hostile = pricing.quote(j, { travellers: 2, nights: 7, total: 1, deposit: 0.01, price_pp: 5, discount: 1 });
  assert.deepEqual(honest, hostile, 'a manipulated payload must not change the quote');
});

test('extras add cost and insurance is capped per person', () => {
  const j = J('grand-imperial-luxury-circuit');
  const base = pricing.quote(j, { travellers: 2, nights: 10 });
  const withExtras = pricing.quote(j, { travellers: 2, nights: 10, extras: ['hot_air_balloon', 'hammam_spa', 'visa_letter'] });
  assert.ok(withExtras.total > base.total);
  assert.ok(withExtras.extras.every((e) => e.key !== 'visa_letter'), 'free items must not appear as line items');
  const insured = pricing.quote(j, { travellers: 2, nights: 10, insurance: true });
  assert.ok(insured.total > base.total && insured.adjustments.some((a) => a.key === 'insurance'));
});

test('single occupancy costs more than sharing', () => {
  const j = J('imperial-cities-private-discovery');
  const shared = pricing.quote(j, { travellers: 2, nights: 8, roomMode: 'shared' }).total;
  const single = pricing.quote(j, { travellers: 2, nights: 8, roomMode: 'single' }).total;
  assert.ok(single > shared, `single ${single} should exceed shared ${shared}`);
});

test('cancellation ladder follows the published schedule', () => {
  const total = 10000;
  assert.equal(pricing.cancellationEstimate(total, 120).charge, 2500);
  assert.equal(pricing.cancellationEstimate(total, 75).charge, 5000);
  assert.equal(pricing.cancellationEstimate(total, 45).charge, 7500);
  assert.equal(pricing.cancellationEstimate(total, 20).charge, 9000);
  assert.equal(pricing.cancellationEstimate(total, 2).charge, 10000);
});

test('every journey is internally consistent and bookable', () => {
  const seen = new Set();
  for (const j of journeys) {
    assert.ok(!seen.has(j.slug), `duplicate slug ${j.slug}`);
    seen.add(j.slug);
    assert.match(j.slug, /^[a-z0-9-]+$/, `slug must be url-safe: ${j.slug}`);
    assert.ok(['luxury', 'private', 'bespoke', 'group'].includes(j.type), `${j.slug} has a bad type`);
    if (j.type === 'group') assert.ok(['women', 'students', 'seniors'].includes(j.audience), `${j.slug} group needs an audience`);
    assert.ok(j.itinerary.length >= 4, `${j.slug} needs a real itinerary`);
    assert.ok(j.included.length >= 2 && j.notIncluded.length >= 1, `${j.slug} needs inclusions and exclusions`);
    assert.ok(j.heroImage && j.summary && j.lead, `${j.slug} is missing marketing copy`);
    const q = pricing.quote(j, { travellers: j.type === 'group' ? 12 : 2, nights: j.nights });
    assert.ok(q.total > 0 && q.deposit > 0 && Number.isFinite(q.deposit), `${j.slug} prices must be finite and positive`);
    assert.equal(q.journeySlug, j.slug);
  }
});

test('config: the commercial terms the whole site depends on', () => {
  assert.equal(config.commercial.depositPercent, 25);
  assert.equal(config.commercial.balanceDueDaysBefore, 60);
  assert.equal(config.commercial.groupMinTravellers, 10);
  assert.equal(config.commercial.groupMaxTravellers, 30);
  assert.equal(config.commercial.priceBands.luxury.from, 6000);
  assert.equal(config.commercial.priceBands.group.from, 2000);
  assert.equal(config.commercial.priceBands.group.to, 4000);
  assert.ok(config.contact.phoneDisplay.startsWith('+212'));
  assert.match(config.contact.whatsappNumber, /^[0-9]{9,15}$/);
});
