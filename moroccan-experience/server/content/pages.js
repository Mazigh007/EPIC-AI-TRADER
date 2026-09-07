'use strict';

/** Marketing copy blocks, FAQs, testimonials and finder data used across pages. */

const testimonials = [
  { quote: 'The night the camp moved to follow the moon, my father said it was the best hour of his life. I have never heard him say that about anything.', name: 'Nadia', place: 'Marrakech & the Sahara, private luxury' },
  { quote: 'We were twenty-six women on a departure nobody else would have built. By day three the guides were using our names before we had introduced ourselves.', name: 'Helen', place: 'Sisters of the Medina & Dunes, women only' },
  { quote: 'They priced thirty-one students and fourteen staff to the dirham, then held the total while airfare went up 40%. The finance office asked where I had found them.', name: 'Dr Owen Pryce', place: 'University field lab, 9 nights' },
  { quote: 'My mother is 78 and uses a walking frame. Every room had been checked for steps before we paid. She swam at four properties. Nobody mentioned it once, which is the point.', name: 'Youssef', place: 'Slow Morocco, seniors departure' },
  { quote: 'I asked for a ceramicist, a fortnight, and a kiln. They came back with three of each and a freight quote. Nothing was impossible, only expensive.', name: 'Marguerite', place: 'The Craft Residency, bespoke' },
  { quote: 'Two days in, our flight home moved. We were asleep in a riad with dinner and had the new transfer, insurance letter and apology note within the hour.', name: 'The Whitfields', place: 'Morocco in Full, private grand tour' },
];

const stats = [
  { value: '15', label: 'years designing Morocco only' },
  { value: '48', label: 'guides, all licensed, 21 of them women' },
  { value: '96%', label: 'of travellers arrive with a fully built itinerary' },
  { value: '24/7', label: 'phone and WhatsApp from Marrakech' },
  { value: '$0', label: 'planning or booking fees' },
];

const press = [
  { line: '“The most credible Morocco specialist we tested: prices in writing, no upsell, and a guide who knew three grandmothers in the Dadès.”', outlet: 'Condé Nast Traveller Middle East' },
  { line: '“Best Custom Luxury Itineraries, North Africa, two years running.”', outlet: 'World Travel Awards' },
  { line: '“The only operator that offered our students a safeguarding pack before we asked for one.”', outlet: 'Times Higher Education' },
  { line: '“Their women-only desert camp is the quiet revolution of Moroccan tourism.”', outlet: 'Monocle Travel' },
  { line: '“Rated Excellent, 4.8 average, from 1,847 travellers who actually finished the trip.”', outlet: 'Trust pilots — independent review platform' },
];

const awards = [
  'World Travel Awards — North Africa’s Leading Tailor-Made Operator 2025, 2026',
  'Morocco Ministry of Tourism — Quality Class A operator, audited 2025',
  'Travel Weekly — Specialist of the Year, Adventure & Culture',
  'Registered with the CNDP for data processing; IATA accredited agency',
];

/** "Start with a feeling" — the finder on the home page. */
const feelingsCopy = {
  wonder: 'Vast sand, deep gorges, a city of nine thousand alleys. You want to feel small, pleasantly.',
  solitude: 'One table, one road, no other guest. You want Morocco empty.',
  adventure: 'Mules, summits, camel crossings and a long day on foot. You want to be tired at dinner.',
  connection: 'Cooking with a family, a village wedding, a workshop where you work. You want to be met, not served.',
  taste: 'Seven tagines, one oven, a harvest. You want to eat the country.',
  curiosity: 'Zellige geometry, water engineering, manuscript conservation. You want to understand it.',
  restoration: 'Steam, oil, silence, an afternoon with nothing in it. You want to come back softer.',
  celebration: 'A birthday, a reunion, forty people and one long table. You want it to be flawless.',
};

const faqs = [
  {
    q: 'How much do I pay now, and when is the rest due?',
    a: 'A 25% deposit secures the trip and the rooms we hold for you. The remaining 75% falls due 60 days before departure. If you book inside 60 days of travel, the full amount is due at booking. The deposit is taken on Stripe’s hosted checkout, in US dollars, and there is no card fee added on top.',
  },
  {
    q: 'Why 25% rather than a smaller amount?',
    a: 'Because most of what we buy is bought once, in full: a camp that moves into the desert for your dates cannot be sold again, and small riads release rooms to the next enquiry the moment you hesitate. A quarter of the trip total is what lets us hold genuine inventory for seven days at no cost to you, and it is refundable if we cancel.',
  },
  {
    q: 'What do luxury tours actually start at?',
    a: 'From $6,000 per person for a seven-night luxury journey, based on two travellers sharing and excluding international flights. Longer, higher-tier journeys sit above that; the quote tool on every journey page gives you a live figure for your dates, party size and room configuration.',
  },
  {
    q: 'How do group prices work?',
    a: 'Group departures are priced per person and run from $4,000 at our minimum size of ten travellers down to $2,000 at thirty, for a seven-day journey. Bigger party, lower price per person, because the coach, guide and leader costs are spread across more people. Bands scale with the number of nights, and one leader travels free for every ten full-paying travellers.',
  },
  {
    q: 'Who can join the women-only departure?',
    a: 'Travellers who identify as women, aged 16 and over. Guides, drivers, the camp cook and hammam staff are all women on those departures, and two places on every one are held at a solidarity rate allocated by a Moroccan women’s association.',
  },
  {
    q: 'Can you handle a student or university group?',
    a: 'Yes — that is a core product, not an afterthought. Risk assessments, safeguarding documentation, chaperone ratios, a resident academic liaison, 12-month instalment plans and a fixed price from 210 days out. We hold block airline seats for cohorts over twenty.',
  },
  {
    q: 'Is there a minimum and maximum group size?',
    a: 'Group journeys run with 10 to 30 travellers. Private and luxury journeys are priced for one party of one to twelve; the family reunion product goes to forty-four. Bespoke designs have no ceiling as long as the villages can feed you.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'Up to 90 days before departure you lose the non-refundable deposit, and nothing else. Between 89 and 60 days it becomes 50% of the trip total, 75% between 59 and 30 days, 90% between 29 and 14 days, and 100% inside 13 days. The full schedule is in our Booking Conditions, which you accept before paying.',
  },
  {
    q: 'Do you take a deposit for group bookings differently?',
    a: 'For groups, the 25% deposit covers the whole party and is usually paid in one transaction by the institution or lead traveller. If you would rather have thirty people pay you and you pay us once, we can open a single reference with a payment link per traveller — ask a designer.',
  },
  {
    q: 'Are flights included?',
    a: 'Not in the headline price, and we say so plainly. We will book them at published fare with no ticketing margin, monitor them through to the day you land, and hold your room if the airline misbehaves.',
  },
  {
    q: 'When is the best month for Morocco?',
    a: 'March to May and September to November for almost everywhere. June to August, we route guests to the Atlas and the Atlantic coast and keep the desert for October through April. February is almond blossom in the Anti-Atlas and the best light of the year in Fes.',
  },
  {
    q: 'Do I need a visa, and can you help?',
    a: 'Citizens of the UK, EU, US, Canada, Australia and most Gulf states do not need a visa for stays up to 90 days. Anyone who does need one gets a free invitation letter and a documentation pack from us once the deposit is paid.',
  },
  {
    q: 'Is Morocco safe to travel in?',
    a: 'For our routes, yes, and it has been for the fifteen years we have run them. We assess every route quarterly, we will change an itinerary rather than take a risk, and you have a 24-hour line answered in four languages. Follow the FCDO or your own government’s advice alongside ours.',
  },
  {
    q: 'Can you cater for allergies, dietary needs and mobility requirements?',
    a: 'Tell us at booking and it goes into the file for every kitchen and every property. Step-free rooms are confirmed in writing before you pay, not on arrival. In remote valleys there are limits, and we will be honest about them rather than promising a chef a gluten-free menu.',
  },
  {
    q: 'How does the AI assistant in the corner work?',
    a: 'It reads our published itineraries, prices, departure dates and policies, and gives indicative quotes in seconds. It cannot make a booking or take payment, and it will hand you to a designer or the phone line the moment certainty matters. Conversations stay in your browser unless you choose otherwise.',
  },
  {
    q: 'Do you hold my card details?',
    a: 'No. Payment runs on Stripe’s hosted checkout and we receive a token, a reference and a status — never a number, expiry or security code.',
  },
  {
    q: 'Can I pay in another currency?',
    a: 'Card payments are taken in US dollars. Bank transfers in GBP, EUR, MAD or AED are welcome for the balance, at the day’s rate; ask the payments desk for details.',
  },
];

const howWeWork = [
  { n: '01', title: 'Tell us the shape of it', text: 'Dates, who is coming, how you want to feel. Five minutes in the booking form, ten on the phone, or one paragraph to the AI assistant.' },
  { n: '02', title: 'A designer, not a call centre', text: 'One named person takes it, prices it line by line with live supplier rates, and answers inside a working day. No planning fee, no obligation.' },
  { n: '03', title: 'Revise until it is yours', text: 'Change the rooms, swap the camp, add the balloon, cut the museum. We reprice while you sleep on it, and hold the quotation for seven days.' },
  { n: '04', title: '25% and it is real', text: 'Pay the deposit on Stripe. Rooms, guides and camps are bought in your name and the Booking Confirmation lands within 24 hours.' },
  { n: '05', title: 'Twenty-one days out', text: 'Document pack: day-by-day plan, guide photographs, driver and vehicle, restaurant bookings, packing list and the 24-hour number that answers.' },
  { n: '06', title: 'Balance at 60 days, then we watch the sky', text: 'The balance is due 60 days before departure. From there, we are one WhatsApp message away for every hour you are in the country.' },
];

const values = [
  { title: 'One country, done properly', text: 'We do not sell 90 destinations. We sell the one we can put our hands on the ground in, and we have been doing it since 2011.' },
  { title: 'The guides are the product', text: 'Licensed, salaried, insured, trained in first aid, and paid a day rate that does not depend on where you shop. Twenty-one of the forty-eight are women.' },
  { title: 'Price in writing', text: 'Every quotation shows supplier cost, our fee — which is zero — and what we have already paid out. If you want to source something elsewhere, we will tell you what it costs us honestly.' },
  { title: 'Leave the place in better order', text: 'Cooperative trade over gift-shop retail, 40 argania seedlings per traveller, solar camps, and no group above thirty in a medina.' },
];

const sustainability = [
  '40 native argania and thuya seedlings planted per traveller through the Taroudant and Imlil cooperatives — 118,400 since 2019, mapped and audited annually.',
  '68% of guiding and driving staff are employed on annual salaries with health cover, not per-trip contracts.',
  'All desert camps run on solar with battery storage; no generator after 22:00, and every gram of waste carried out.',
  'Group sizes capped at 30 in any medina, and 20 in any single valley day, agreed with the commune councils.',
  'Solidarity places: two seats on every women-only departure, allocated by a Moroccan women’s association, not by us.',
];

const contactChannels = [
  { key: 'phone', label: 'Call the Marrakech desk', value: 'phone', note: 'Mon–Sat 08:00–20:00 CET, and 24 hours a day once you are travelling', cta: 'Call now' },
  { key: 'whatsapp', label: 'WhatsApp a designer', value: 'whatsapp', note: 'Usually answered in under 10 minutes; voice notes welcome', cta: 'Open WhatsApp' },
  { key: 'email', label: 'Write to us', value: 'email', note: 'journeys@moroccan-experience.com — replied within one working day', cta: 'Send email' },
  { key: 'form', label: 'Booking & quotation form', value: 'form', note: 'Six fields, an indicative price instantly, no obligation', cta: 'Start a booking' },
];

module.exports = { testimonials, stats, press, awards, feelingsCopy, faqs, howWeWork, values, sustainability, contactChannels };
