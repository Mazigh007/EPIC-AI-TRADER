'use strict';

/**
 * Single source of truth for brand, contact details, commercial terms and
 * pricing constants. Everything here is exposed to the storefront through
 * /api/config so front-end code never hard-codes business numbers.
 *
 * NOTE: phone / WhatsApp / email addresses are demo placeholders — replace
 * them (or set the matching env vars) before going live.
 */

const num = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v));

const config = {
  env: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 3000),
  publicUrl: process.env.PUBLIC_URL || '',

  brand: {
    name: 'Moroccan Experience',
    legalName: 'Moroccan Experience Voyages SARL',
    tagline: 'Luxury journeys across Morocco, built around how you want to feel',
    shortPitch:
      'Private tours, luxury escapes, bespoke itineraries and small group journeys for women, students and seniors — designed in Marrakech since 2011.',
    founded: 2011,
    licence: 'Morocco Ministry of Tourism Licence IM01070033',
    vat: 'ICE 002458719000067',
    logoMark: 'MX',
  },

  contact: {
    phoneDisplay: process.env.SITE_PHONE || '+212 524 29 00 00',
    phoneHref: 'tel:' + (process.env.SITE_PHONE || '+212524290000').replace(/[^+0-9]/g, ''),
    whatsappDisplay: process.env.SITE_WHATSAPP || '+212 661 23 45 67',
    whatsappNumber: (process.env.SITE_WHATSAPP || '212661234567').replace(/[^0-9]/g, ''),
    email: process.env.SITE_EMAIL || 'journeys@moroccan-experience.com',
    supportEmail: 'support@moroccan-experience.com',
    paymentsEmail: 'payments@moroccan-experience.com',
    privacyEmail: 'privacy@moroccan-experience.com',
    hours: [
      { tz: 'CET (Marrakech)', days: 'Mon–Sat', time: '08:00 – 20:00' },
      { tz: 'GMT (London desk)', days: 'Mon–Fri', time: '09:00 – 17:30' },
      { tz: 'On-trip line', days: 'Every day', time: '24 hours, 365 days' },
    ],
    offices: [
      {
        city: 'Marrakech (Head office)',
        lines: ['47 Derb Sidi Boussaid, Medina', 'Marrakech 40000, Morocco'],
        phone: process.env.SITE_PHONE || '+212 524 29 00 00',
      },
      {
        city: 'London',
        lines: ['1st Floor, 18 Redchurch Street', 'London E2 7DP, United Kingdom'],
        phone: '+44 20 3239 4488',
      },
    ],
    social: [
      { label: 'Instagram', href: 'https://instagram.com' },
      { label: 'Facebook', href: 'https://facebook.com' },
      { label: 'YouTube', href: 'https://youtube.com' },
      { label: 'LinkedIn', href: 'https://linkedin.com' },
    ],
  },

  commercial: {
    currency: 'USD',
    currencySymbol: '$',
    /** Upfront, non-refundable booking deposit as a share of the trip total. */
    depositPercent: num(process.env.DEPOSIT_PERCENT, 25),
    /** Balance is due this many days before the departure date. */
    balanceDueDaysBefore: num(process.env.BALANCE_DUE_DAYS, 60),
    /** Hold a quote, free of charge, for this many days. */
    quoteHoldDays: 7,
    planningFee: 0,
    bookingFee: 0,
    minTravellers: 1,
    groupMinTravellers: 10,
    groupMaxTravellers: 30,
    /** Head-line bands quoted to clients, per person, based on 7 days / two sharing. */
    priceBands: {
      luxury: { from: 6000, per: 'person / 7 days', note: 'from, two travellers sharing' },
      private: { from: 3200, per: 'person / 7 days', note: 'from, two travellers sharing' },
      bespoke: { from: 4500, per: 'person', note: 'indicative — every bespoke journey is quoted individually' },
      group: { from: 2000, to: 4000, per: 'person / 7 days', note: 'group size 10–30 travellers' },
    },
    /** Luxury day rate used by the pricing engine: $6,000 for 7 days. */
    luxuryDayRate: num(process.env.LUXURY_DAY_RATE, 6000 / 7),
    privateDayRate: num(process.env.PRIVATE_DAY_RATE, 460),
    singleSupplementPerNight: num(process.env.SINGLE_SUPPLEMENT, 175),
    /** Group ladder: $4,000pp at 10 travellers, minus $100pp per extra traveller, floor $2,000pp. */
    groupLadder: { basePP: 4000, stepPP: 100, floorPP: 2000, referenceNights: 7 },
    insuranceRatePercent: 3.4,
    insuranceCap: 690,
    offsetPerPerson: 28,
    taxNote:
      'All prices are in US dollars, inclusive of Moroccan VAT and local tourism taxes, and exclude international flights unless stated.',
    paymentMethods: ['Visa', 'Mastercard', 'American Express', 'Apple Pay', 'Google Pay', 'Bank transfer'],
    cancellationSchedule: [
      { from: 90, to: null, charge: 25, label: 'Booking deposit — non-refundable' },
      { from: 60, to: 89, charge: 50, label: '50% of trip cost' },
      { from: 30, to: 59, charge: 75, label: '75% of trip cost' },
      { from: 14, to: 29, charge: 90, label: '90% of trip cost' },
      { from: 0, to: 13, charge: 100, label: '100% of trip cost — no refund' },
    ],
  },

  journeyTypes: [
    {
      key: 'luxury',
      name: 'Luxury tours',
      kicker: 'Signature',
      blurb:
        'Seven nights or longer, staying in the riads, desert camps and mountain lodges we rate above all others. A private guide, a private car, and a driver who knows every shortcut.',
      from: 'From $6,000 per person / 7 days',
    },
    {
      key: 'private',
      name: 'Private tours',
      kicker: 'Classic',
      blurb:
        'Our most-booked format. Everything private — guide, vehicle, rooms, tables — on an itinerary you can reshape at breakfast if the light is good.',
      from: 'From $3,200 per person / 7 days',
    },
    {
      key: 'bespoke',
      name: 'Bespoke tours',
      kicker: 'Bespoke',
      blurb:
        'Set-jetting, ceramics residencies, Sahara music recordings, family reunions, weddings: if it can be done in Morocco, our designers can build it and price it line by line.',
      from: 'Indicative from $4,500 per person',
    },
    {
      key: 'group',
      name: 'Group tours',
      kicker: 'Groups 10–30',
      blurb:
        'Led group departures reserved for women-only travellers, student and university groups, and seniors — 10 to 30 people, one leader per ten, ground rules we hold to.',
      from: 'From $2,000 to $4,000 per person / 7 days',
    },
  ],

  feelings: [
    { key: 'wonder', label: 'Awe & wonder' },
    { key: 'solitude', label: 'Quiet & space' },
    { key: 'adventure', label: 'Adrenaline' },
    { key: 'connection', label: 'Belonging' },
    { key: 'taste', label: 'Flavour' },
    { key: 'curiosity', label: 'Curiosity' },
    { key: 'restoration', label: 'Restoration' },
    { key: 'celebration', label: 'Celebration' },
  ],

  audiences: [
    { key: 'women', label: 'Women only' },
    { key: 'students', label: 'Students & universities' },
    { key: 'seniors', label: 'Seniors 60+' },
    { key: 'families', label: 'Families' },
    { key: 'couples', label: 'Couples' },
  ],

  seo: {
    title: 'Moroccan Experience — Luxury, Private & Bespoke Tours of Morocco',
    description:
      'Tailor-made luxury tours, private guided journeys, bespoke itineraries and women-only, student and senior group departures across Morocco. Book with a 25% deposit.',
    ogImage: '/assets/img/hero-home.jpg',
    twitter: '@moroccanexp',
  },
};

/** Absolute URL for a path (used in OG tags / sitemap / confirmation emails). */
config.absolute = function absolute(path, req) {
  if (/^https?:\/\//.test(path)) return path;
  if (config.publicUrl) return config.publicUrl.replace(/\/$/, '') + path;
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    return `${proto}://${req.headers.host}${path}`;
  }
  return path;
};

config.money = function money(value) {
  return (
    config.commercial.currencySymbol +
    Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
  );
};

module.exports = config;
